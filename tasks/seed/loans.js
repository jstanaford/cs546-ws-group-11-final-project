// loans and notifications. part e
// whoever owns this part fills this in. tasks/seed.js already calls it, so you only
// ever need to open this file
//
// what the demo needs out of here:
//   - an active loan that is not due yet
//   - an overdue loan - active with a dueDate in the past. core 9 is unreviewable without one
//   - a returned loan, and one returned in a condition that took the item out of service
//   - a long term loan with no due date
//   - a few notifications for the admin account, some read and some not
//
// seed.js calls this as seedLoans(seededUsers, seededEquipment, seededRequests) and the seeds before it
// have already run, so take the parameters you need and hang your data off real ids
// instead of making up your own. return a count so the seed output stays useful
export const seedLoans = async () => {
  return {count: 0};
};
