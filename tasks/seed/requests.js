// requests and waitlist entries. part d
// whoever owns this part fills this in. tasks/seed.js already calls it, so you only
// ever need to open this file
//
// what the demo needs out of here:
//   - a pending request so the admin queue is not empty on first load
//   - one approved request that has not been issued yet
//   - a denied one and a cancelled one
//   - a waitlist with more than one person on it, so the ordering is visible
//
// seed.js calls this as seedRequests(seededUsers, seededEquipment) and the seeds before it
// have already run, so take the parameters you need and hang your data off real ids
// instead of making up your own. return a count so the seed output stays useful
export const seedRequests = async () => {
  return {count: 0};
};
