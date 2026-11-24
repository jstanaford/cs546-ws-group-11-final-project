import {ObjectId} from 'mongodb';
import {dbConnection} from '../config/mongoConnection.js';
import {categories, equipment, loans, users, waitlistEntries} from '../config/mongoCollections.js';
import {checkEnum, checkId, checkOptionalString, ENUMS, sanitize} from '../helpers/validation.js';

const DAY = 86400000;
const HOUR = 3600000;
const availableItem = {status: 'available', condition: {$ne: 'damaged'}};

export const withLoanTransaction = async (work) => {
  const db = await dbConnection();
  try {
    return await db.client.withSession((session) =>
      session.withTransaction(() => work(session), {
        readConcern: {level: 'snapshot'},
        writeConcern: {w: 'majority'}
      })
    );
  } catch (error) {
    if (error.code === 20 && error.codeName === 'IllegalOperation') {
      throw 'This operation needs MongoDB running as a replica set.';
    }
    throw error;
  }
};

export const updateCurrent = async (collection, filter, update, session, message) => {
  const result = await collection.updateOne(filter, update, {session});
  if (result.matchedCount !== 1) throw message;
};

const overdueFilter = (now) => ({status: 'active', dueDate: {$type: 'date', $lt: now}});

export const userHasOverdueLoan = async (userId, {now = new Date(), session} = {}) => {
  const collection = await loans();
  return Boolean(
    await collection.findOne(
      {
        userId: checkId(userId, 'borrower'),
        ...overdueFilter(now)
      },
      {session, projection: {_id: 1}}
    )
  );
};

export const getLoanCategory = async (item, session) => {
  const collection = await categories();
  const category = await collection.findOne({_id: item.categoryId}, {session});
  if (!category) throw 'This item has no loan policy.';
  return category;
};

export const checkBorrowingPolicy = async (userId, category, now, session) => {
  const userCollection = await users();
  // Serialize checkout decisions for the same borrower, even for different items.
  await updateCurrent(
    userCollection,
    {_id: userId, isActive: true},
    {$inc: {loanPolicyVersion: 1}},
    session,
    'The borrower account is unavailable.'
  );
  if (await userHasOverdueLoan(userId, {now, session})) {
    throw 'This borrower has an overdue loan and cannot borrow another item.';
  }
  if (!Number.isInteger(category.maxConcurrentPerUser) || category.maxConcurrentPerUser < 1) {
    throw 'This category has an invalid borrowing limit.';
  }
  const collection = await loans();
  const held = await collection
    .aggregate(
      [
        {$match: {userId, status: 'active'}},
        {$lookup: {from: 'equipment', localField: 'equipmentId', foreignField: '_id', as: 'item'}},
        {$match: {'item.categoryId': category._id}},
        {$count: 'total'}
      ],
      {session}
    )
    .next();
  if ((held?.total ?? 0) >= category.maxConcurrentPerUser) {
    throw 'This borrower has reached the limit for this equipment category.';
  }
};

export const extendDueDate = (date, category) => {
  if (!Number.isInteger(category.loanPeriodDays) || category.loanPeriodDays < 1) {
    throw 'This category has an invalid loan period.';
  }
  return new Date(date.getTime() + category.loanPeriodDays * DAY);
};

export const insertLoan = async ({
  item,
  userId,
  requestId,
  loanType,
  adminId,
  reservation,
  session,
  now
}) => {
  const category = await getLoanCategory(item, session);
  await checkBorrowingPolicy(userId, category, now, session);
  const loan = {
    _id: new ObjectId(),
    equipmentId: item._id,
    userId,
    requestId,
    loanType,
    issuedAt: now,
    issuedBy: adminId,
    dueDate: loanType === 'shortTerm' ? extendDueDate(now, category) : null,
    renewals: [],
    status: 'active',
    returnedAt: null,
    returnedBy: null,
    returnCondition: null,
    returnNote: null
  };
  const inventory = await equipment();
  await updateCurrent(
    inventory,
    {_id: item._id, ...reservation},
    {
      $set: {
        status: 'checkedOut',
        currentLoanId: loan._id,
        currentRequestId: null,
        currentWaitlistEntryId: null
      }
    },
    session,
    'This item is no longer ready to issue.'
  );
  const collection = await loans();
  await collection.insertOne(loan, {session});
  return loan;
};

export const createLoan = (userId, equipmentId, loanType, adminId) => {
  userId = checkId(userId, 'borrower');
  equipmentId = checkId(equipmentId, 'equipment');
  loanType = checkEnum(loanType, 'loan type', ENUMS.loanType);
  adminId = checkId(adminId, 'administrator');

  return withLoanTransaction(async (session) => {
    const inventory = await equipment();
    const item = await inventory.findOne({_id: equipmentId, ...availableItem}, {session});
    if (!item) throw 'This equipment is no longer available.';
    return insertLoan({
      item,
      userId,
      requestId: null,
      loanType,
      adminId,
      reservation: availableItem,
      session,
      now: new Date()
    });
  });
};

export const getWalkUpOptions = async () => {
  const userCollection = await users();
  const inventory = await equipment();
  const [borrowers, items] = await Promise.all([
    userCollection
      .find({isActive: true}, {projection: {firstName: 1, lastName: 1, email: 1}})
      .sort({lastName: 1, firstName: 1})
      .toArray(),
    inventory
      .find(availableItem, {projection: {name: 1, assetTag: 1}})
      .sort({name: 1})
      .toArray()
  ]);
  return {borrowers, items};
};

export const getBorrowerAndItemStages = () => [
  {
    $lookup: {
      from: 'users',
      localField: 'userId',
      foreignField: '_id',
      as: 'borrower',
      pipeline: [{$project: {firstName: 1, lastName: 1, email: 1}}]
    }
  },
  {
    $lookup: {
      from: 'equipment',
      localField: 'equipmentId',
      foreignField: '_id',
      as: 'item',
      pipeline: [{$project: {name: 1, assetTag: 1, condition: 1}}]
    }
  },
  {$set: {borrower: {$first: '$borrower'}, item: {$first: '$item'}}}
];

export const getActiveLoans = async () => {
  const collection = await loans();
  return collection
    .aggregate([
      {$match: {status: 'active'}},
      {$sort: {issuedAt: -1, _id: 1}},
      ...getBorrowerAndItemStages()
    ])
    .toArray();
};

export const getOverdueLoans = async (search = '') => {
  const now = new Date();
  const term = checkOptionalString(search, 'search').toLowerCase();
  if (term.length > 100) throw 'Search must be 100 characters or fewer.';
  const collection = await loans();
  const entries = await collection
    .aggregate([
      {$match: overdueFilter(now)},
      {$sort: {dueDate: 1, _id: 1}},
      ...getBorrowerAndItemStages()
    ])
    .toArray();
  return entries
    .filter(
      ({borrower, item}) =>
        !term ||
        [
          borrower && `${borrower.firstName} ${borrower.lastName}`,
          borrower?.email,
          item?.name,
          item?.assetTag
        ].some((value) => value?.toLowerCase().includes(term))
    )
    .map((loan) => ({...loan, daysOverdue: Math.ceil((now - loan.dueDate) / DAY)}));
};

export const nextAvailableState = async (item, now, session) => {
  if (item.condition === 'damaged') {
    return {status: 'outOfService', currentWaitlistEntryId: null};
  }
  const queue = await waitlistEntries();
  const next = await queue.findOne(
    {equipmentId: item._id, status: 'waiting'},
    {sort: {joinedAt: 1, _id: 1}, session}
  );
  if (!next) return {status: 'available', currentWaitlistEntryId: null};

  const category = await getLoanCategory(item, session);
  if (!Number.isFinite(category.waitlistOfferHours) || category.waitlistOfferHours <= 0) {
    throw 'This category has an invalid waitlist offer window.';
  }
  await updateCurrent(
    queue,
    {_id: next._id, status: 'waiting'},
    {
      $set: {
        status: 'offered',
        offeredAt: now,
        offerExpiresAt: new Date(now.getTime() + category.waitlistOfferHours * HOUR),
        resolvedAt: null
      }
    },
    session,
    'The waitlist changed. Please try again.'
  );
  return {status: 'onOffer', currentWaitlistEntryId: next._id};
};

export const processReturn = (loanId, condition, note, adminId) => {
  loanId = checkId(loanId, 'loan');
  adminId = checkId(adminId, 'administrator');
  condition = checkEnum(condition, 'return condition', ENUMS.condition);
  note = checkOptionalString(note, 'return note');
  if (note.length > 500) throw 'Return notes must be 500 characters or fewer.';
  note = sanitize(note);

  return withLoanTransaction(async (session) => {
    const now = new Date();
    const collection = await loans();
    const inventory = await equipment();
    const loan = await collection.findOne({_id: loanId, status: 'active'}, {session});
    if (!loan) throw 'This loan has already been returned or does not exist.';
    const itemFilter = {_id: loan.equipmentId, status: 'checkedOut', currentLoanId: loanId};
    const item = await inventory.findOne(itemFilter, {session});
    if (!item) throw 'The item is no longer assigned to this loan.';

    const next = await nextAvailableState({...item, condition}, now, session);
    const record = {condition, note, recordedBy: adminId, recordedAt: now};
    const entries = [{...record, _id: new ObjectId(), eventType: 'return'}];
    if (condition === 'damaged') {
      entries.push({...record, _id: new ObjectId(), eventType: 'outOfService'});
    }
    await updateCurrent(
      inventory,
      itemFilter,
      {
        $set: {...next, condition, currentLoanId: null, currentRequestId: null},
        $push: {serviceHistory: {$each: entries}}
      },
      session,
      'The item is no longer assigned to this loan.'
    );
    await updateCurrent(
      collection,
      {_id: loanId, status: 'active'},
      {
        $set: {
          status: 'returned',
          returnedAt: now,
          returnedBy: adminId,
          returnCondition: condition,
          returnNote: note
        }
      },
      session,
      'This loan has already been returned.'
    );
    return next.status;
  });
};
