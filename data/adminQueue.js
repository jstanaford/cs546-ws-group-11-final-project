import {ObjectId} from 'mongodb';
import {equipment, loans, notifications, requests, users} from '../config/mongoCollections.js';
import {checkEnum, checkId, checkString, ENUMS, sanitize} from '../helpers/validation.js';
import {
  checkBorrowingPolicy,
  extendDueDate,
  getBorrowerAndItemStages,
  getLoanCategory,
  insertLoan,
  nextAvailableState,
  updateCurrent,
  withLoanTransaction
} from './loans.js';

export const getRequestQueue = async () => {
  const collection = await requests();
  return collection
    .aggregate([
      {$match: {$or: [{status: 'pending'}, {status: 'approved', type: 'checkout'}]}},
      {$sort: {requestedAt: 1, _id: 1}},
      ...getBorrowerAndItemStages()
    ])
    .toArray();
};

const withRequest = (requestId, status, operation) => {
  const filter = {_id: checkId(requestId, 'request'), status};
  return withLoanTransaction(async (session) => {
    const collection = await requests();
    const request = await collection.findOne(filter, {session});
    if (!request) throw 'This request is no longer in the expected state.';
    return operation(request, session, (changes) =>
      updateCurrent(
        collection,
        filter,
        {$set: changes},
        session,
        'This request has already changed.'
      )
    );
  });
};

const approveRenewal = async (request, item, category, adminId, now, session) => {
  const collection = await loans();
  const filter = {
    _id: request.loanId,
    equipmentId: item._id,
    userId: request.userId,
    status: 'active',
    loanType: 'shortTerm',
    dueDate: {$type: 'date', $gte: now}
  };
  const loan = await collection.findOne(filter, {session});
  if (!loan) throw 'This loan is no longer eligible for renewal.';
  if ((loan.renewals?.length ?? 0) >= category.renewalLimit) {
    throw 'The renewal limit for this loan has been reached.';
  }
  const newDueDate = extendDueDate(loan.dueDate, category);
  await updateCurrent(
    collection,
    filter,
    {
      $set: {dueDate: newDueDate},
      $push: {
        renewals: {
          _id: new ObjectId(),
          requestId: request._id,
          previousDueDate: loan.dueDate,
          newDueDate,
          approvedBy: adminId,
          approvedAt: now
        }
      }
    },
    session,
    'This loan can no longer be renewed.'
  );
};

const notifyApproval = async (requestId, item, now, session) => {
  const accounts = await users();
  const admins = await accounts
    .find({role: 'admin', isActive: true}, {session, projection: {_id: 1}})
    .toArray();
  if (!admins.length) return;
  const inbox = await notifications();
  await inbox.insertMany(
    admins.map(({_id}) => ({
      adminId: _id,
      type: 'requestApproved',
      message: `Request for ${item.assetTag} was approved.`,
      requestId,
      isRead: false,
      createdAt: now
    })),
    {session}
  );
};

export const approveRequest = (requestId, adminId) => {
  adminId = checkId(adminId, 'administrator');
  return withRequest(requestId, 'pending', async (request, session, changeRequest) => {
    const now = new Date();
    const inventory = await equipment();
    const item = await inventory.findOne({_id: request.equipmentId}, {session});
    if (!item) throw 'The equipment record no longer exists.';
    const category = await getLoanCategory(item, session);

    if (request.type === 'renewal') {
      await approveRenewal(request, item, category, adminId, now, session);
    } else {
      checkEnum(request.type, 'request type', ['checkout']);
      await checkBorrowingPolicy(request.userId, category, now, session);
      await updateCurrent(
        inventory,
        {_id: item._id, status: 'available', condition: {$ne: 'damaged'}},
        {$set: {status: 'reserved', currentRequestId: request._id}},
        session,
        'This equipment is no longer available.'
      );
    }
    await changeRequest({status: 'approved', decidedAt: now, decidedBy: adminId});
    await notifyApproval(request._id, item, now, session);
  });
};

export const denyRequest = async (requestId, adminId, reason) => {
  const _id = checkId(requestId, 'request');
  adminId = checkId(adminId, 'administrator');
  reason = checkString(reason, 'denial reason');
  if (reason.length > 500) throw 'Denial reasons must be 500 characters or fewer.';
  const collection = await requests();
  await updateCurrent(
    collection,
    {_id, status: 'pending'},
    {
      $set: {
        status: 'denied',
        denialReason: sanitize(reason),
        decidedAt: new Date(),
        decidedBy: adminId
      }
    },
    undefined,
    'This request is no longer pending.'
  );
};

const reservedFor = (request) => ({status: 'reserved', currentRequestId: request._id});

export const issueRequest = (requestId, adminId) => {
  adminId = checkId(adminId, 'administrator');
  return withRequest(requestId, 'approved', async (request, session, changeRequest) => {
    checkEnum(request.type, 'request type', ['checkout']);
    const loanType = checkEnum(request.loanType, 'loan type', ENUMS.loanType);
    const inventory = await equipment();
    const reservation = {...reservedFor(request), condition: {$ne: 'damaged'}};
    const item = await inventory.findOne({_id: request.equipmentId, ...reservation}, {session});
    if (!item) throw 'The equipment is no longer reserved for this request.';
    const loan = await insertLoan({
      item,
      userId: request.userId,
      requestId: request._id,
      loanType,
      adminId,
      reservation,
      session,
      now: new Date()
    });
    await changeRequest({status: 'issued'});
    return loan;
  });
};

export const releaseRequest = (requestId) =>
  withRequest(requestId, 'approved', async (request, session, changeRequest) => {
    checkEnum(request.type, 'request type', ['checkout']);
    const inventory = await equipment();
    const filter = {_id: request.equipmentId, ...reservedFor(request)};
    const item = await inventory.findOne(filter, {session});
    if (!item) throw 'The equipment is no longer reserved for this request.';
    const next = await nextAvailableState(item, new Date(), session);
    await updateCurrent(
      inventory,
      filter,
      {$set: {...next, currentRequestId: null}},
      session,
      'The equipment is no longer reserved for this request.'
    );
    await changeRequest({status: 'released'});
  });
