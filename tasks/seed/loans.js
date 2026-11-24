import {ObjectId} from 'mongodb';
import {
  categories,
  equipment,
  loans,
  locations,
  requests,
  waitlistEntries
} from '../../config/mongoCollections.js';
import {checkId} from '../../helpers/validation.js';

const DAY = 86400000;

// loans. part e
// seed.js calls this as seedLoans(seededUsers, seededEquipment, seededRequests), so take
// the parameters you need and hang your data off real ids
//
// what the demo needs:
//     an active loan that is not due yet
//     an overdue loan. core 9 is unreviewable without one
//     a returned loan, and one returned in a condition that took the item out of service
//     a long term loan, which has no due date
export const seedLoans = async (seededUsers) => {
  const adminId = checkId(seededUsers.admin._id, 'seed administrator');
  const borrowerId = checkId(seededUsers.user._id, 'seed borrower');
  const [secondId, thirdId] = seededUsers.others.map(({_id}) => checkId(_id, 'seed borrower'));
  const categoryCollection = await categories();
  const locationCollection = await locations();
  const inventory = await equipment();
  const loanCollection = await loans();
  const requestCollection = await requests();
  const waitlistCollection = await waitlistEntries();
  const now = new Date();
  const day = (offset) => new Date(now.getTime() + offset * DAY);

  const {insertedId: categoryId} = await categoryCollection.insertOne({
    name: 'Service Desk Loan Kits',
    description: 'Equipment loaned through the service desk.',
    loanPeriodDays: 14,
    renewalLimit: 2,
    maxConcurrentPerUser: 3,
    waitlistOfferHours: 48,
    loanTerms: 'Return the kit and all included cables by its due date.',
    isActive: true
  });
  const {insertedId: locationId} = await locationCollection.insertOne({
    name: 'IT Service Desk',
    building: 'Campus Center',
    room: '101',
    isActive: true
  });

  const item = (tag, name, changes = {}) => ({
    _id: new ObjectId(),
    assetTag: `DESK-${tag}`,
    name,
    manufacturer: 'Dell',
    model: 'Service Desk Kit',
    description: 'Includes the power cable and a carrying bag.',
    categoryId,
    locationId,
    specifications: {powerCableIncluded: true},
    iconType: 'laptop',
    status: 'available',
    condition: 'good',
    currentLoanId: null,
    currentRequestId: null,
    currentWaitlistEntryId: null,
    serviceHistory: [],
    createdAt: day(-45),
    ...changes
  });

  const available = item('101', 'Portable Laptop Kit');
  const reserved = item('102', 'Mobile Workstation Kit', {status: 'reserved'});
  const current = item('103', 'Travel Laptop Kit', {status: 'checkedOut'});
  const late = item('104', 'Classroom Laptop Kit', {status: 'checkedOut'});
  const long = item('105', 'Staff Laptop Kit', {status: 'checkedOut'});
  const returnedItem = item('106', 'Presentation Laptop Kit');
  const damaged = item('107', 'Spare Laptop Kit', {status: 'outOfService', condition: 'damaged'});
  const walkUp = item('108', 'Walk-up Laptop Kit');

  const request = (device, userId, changes = {}) => ({
    _id: new ObjectId(),
    type: 'checkout',
    userId,
    equipmentId: device._id,
    loanId: null,
    loanType: 'shortTerm',
    status: 'pending',
    fromWaitlist: false,
    termsAcceptedAt: day(-2),
    requestedAt: day(-2),
    decidedAt: null,
    decidedBy: null,
    denialReason: null,
    ...changes
  });
  const pending = request(available, borrowerId);
  const approved = request(reserved, secondId, {
    status: 'approved',
    decidedAt: day(-1),
    decidedBy: adminId
  });
  reserved.currentRequestId = approved._id;

  const loan = (device, userId, issuedOffset, dueOffset, changes = {}) => ({
    _id: new ObjectId(),
    equipmentId: device._id,
    userId,
    requestId: null,
    loanType: dueOffset === null ? 'longTerm' : 'shortTerm',
    issuedAt: day(issuedOffset),
    issuedBy: adminId,
    dueDate: dueOffset === null ? null : day(dueOffset),
    renewals: [],
    status: 'active',
    returnedAt: null,
    returnedBy: null,
    returnCondition: null,
    returnNote: null,
    ...changes
  });

  const currentLoan = loan(current, borrowerId, -3, 11);
  const overdueLoan = loan(late, thirdId, -18, -4);
  const longLoan = loan(long, secondId, -30, null);
  current.currentLoanId = currentLoan._id;
  late.currentLoanId = overdueLoan._id;
  long.currentLoanId = longLoan._id;

  const completedLoan = (device, condition, note) => {
    const returnedAt = day(-8);
    const event = {condition, note, recordedBy: adminId, recordedAt: returnedAt};
    device.serviceHistory.push({_id: new ObjectId(), eventType: 'return', ...event});
    if (condition === 'damaged') {
      device.serviceHistory.push({_id: new ObjectId(), eventType: 'outOfService', ...event});
    }
    return loan(device, borrowerId, -20, -6, {
      status: 'returned',
      returnedAt,
      returnedBy: adminId,
      returnCondition: condition,
      returnNote: note
    });
  };
  const normalReturn = completedLoan(returnedItem, 'good', 'All accessories returned.');
  const damagedReturn = completedLoan(damaged, 'damaged', 'Cracked display; sent for repair.');
  const renewal = request(current, borrowerId, {
    type: 'renewal',
    loanId: currentLoan._id,
    requestedAt: day(-1),
    termsAcceptedAt: day(-1)
  });

  await inventory.insertMany([
    available,
    reserved,
    current,
    late,
    long,
    returnedItem,
    damaged,
    walkUp
  ]);
  await requestCollection.insertMany([pending, approved, renewal]);
  await waitlistCollection.insertOne({
    equipmentId: current._id,
    userId: secondId,
    loanType: 'shortTerm',
    status: 'waiting',
    joinedAt: day(-2),
    offeredAt: null,
    offerExpiresAt: null,
    resolvedAt: null
  });
  const result = await loanCollection.insertMany([
    currentLoan,
    overdueLoan,
    longLoan,
    normalReturn,
    damagedReturn
  ]);
  return {count: result.insertedCount};
};
