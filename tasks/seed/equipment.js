// equipment and the policy limits. part b
// whoever owns this part fills this in. tasks/seed.js already calls it, so you only
// ever need to open this file
//
// what the demo needs out of here:
//   - enough equipment that the catalog has more than one page worth
//   - at least one item in every status, including one outOfService and one retired
//   - items across all five conditions so the condition filter is worth using
//   - the configurable limits set to something sensible
//
// seed.js calls this as seedEquipment(seededUsers, seededCatalog) and the seeds before it
// have already run, so take the parameters you need and hang your data off real ids
// instead of making up your own. return a count so the seed output stays useful
export const seedEquipment = async () => {
  return {count: 0};
};
