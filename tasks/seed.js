import {dbConnection, closeConnection} from '../config/mongoConnection.js';
import {ensureIndexes} from '../config/mongoCollections.js';

import {seedUsers} from './seed/users.js';
import {seedCatalog} from './seed/catalog.js';
import {seedEquipment} from './seed/equipment.js';
import {seedRequests} from './seed/requests.js';
import {seedLoans} from './seed/loans.js';
import {seedNotifications} from './seed/notifications.js';

// written once and then left alone. five of us editing one giant seed file is how you spend
// the last week resolving conflicts in test data. each part has its own file under
// tasks/seed, and this runs them in an order where what you need already exists
const seed = async () => {
  const db = await dbConnection();

  console.log(`Dropping ${db.databaseName} and starting over`);
  await db.dropDatabase();

  // the indexes go back on after the drop, otherwise the uniqueness rules are gone and this
  // will happily insert two accounts on one email
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
  console.log(`  loans: ${seededLoans.count}`);

  // notifications point at a request, so they go after the requests exist
  const seededNotifications = await seedNotifications(seededUsers, seededRequests);
  console.log(`  notifications: ${seededNotifications.count}`);

  console.log('Done. Sign in as admin@techcheckout.com with the password Checkout123!');
};

seed()
  .catch((e) => {
    // the data functions throw strings, so printing e on its own reads fine
    console.log('Seeding failed:');
    console.log(e);
  })
  .finally(async () => {
    await closeConnection();
  });
