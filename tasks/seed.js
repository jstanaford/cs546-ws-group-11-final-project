import {dbConnection, closeConnection} from '../config/mongoConnection.js';
import {ensureIndexes} from '../config/mongoCollections.js';

import {seedUsers} from './seed/users.js';
import {seedCatalog} from './seed/catalog.js';
import {seedEquipment} from './seed/equipment.js';
import {seedRequests} from './seed/requests.js';
import {seedLoans} from './seed/loans.js';

// this file is written once and then left alone - five of us editing one giant seed file is
// how you spend the last week of the project resolving conflicts in test data. each part has
// its own file under tasks/seed, and this just runs them in an order where the thing you need
// already exists by the time you need it
const seed = async () => {
  const db = await dbConnection();

  console.log(`Dropping ${db.databaseName} and starting over`);
  await db.dropDatabase();

  // the indexes go back on after the drop, otherwise the uniqueness rules are gone and the
  // seed will happily insert two accounts on one email
  await ensureIndexes();

  // accounts first, since everything else belongs to somebody
  const seededUsers = await seedUsers();
  console.log(`  users: ${seededUsers.count}`);

  // then the things equipment needs to point at
  const seededCatalog = await seedCatalog(seededUsers);
  console.log(`  categories and locations: ${seededCatalog.count}`);

  const seededEquipment = await seedEquipment(seededUsers, seededCatalog);
  console.log(`  equipment: ${seededEquipment.count}`);

  // requests and waitlist entries need a user and a piece of equipment
  const seededRequests = await seedRequests(seededUsers, seededEquipment);
  console.log(`  requests and waitlist entries: ${seededRequests.count}`);

  // loans come out of requests, so they go last
  const seededLoans = await seedLoans(seededUsers, seededEquipment, seededRequests);
  console.log(`  loans and notifications: ${seededLoans.count}`);

  console.log('Done. Sign in as admin@techcheckout.com with the password Checkout123!');
};

seed()
  .catch((e) => {
    // the data functions throw strings, so printing e on its own is the readable version
    console.log('Seeding failed:');
    console.log(e);
  })
  .finally(async () => {
    await closeConnection();
  });
