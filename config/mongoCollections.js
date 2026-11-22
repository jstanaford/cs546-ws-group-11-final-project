import {dbConnection} from './mongoConnection.js';

/* This will allow you to have one reference to each collection per app */
const getCollectionFn = (collection) => {
  let _col = undefined;

  return async () => {
    if (!_col) {
      const db = await dbConnection();
      _col = await db.collection(collection);
    }

    return _col;
  };
};

// all eight from our database proposal, listed up front so nobody has to edit this file
// later. just import the one you need
export const users = getCollectionFn('users');
export const categories = getCollectionFn('categories');
export const locations = getCollectionFn('locations');
export const equipment = getCollectionFn('equipment');
export const requests = getCollectionFn('requests');
export const loans = getCollectionFn('loans');
export const waitlistEntries = getCollectionFn('waitlistEntries');
export const notifications = getCollectionFn('notifications');

// the ten indexes from our proposal. app.js calls this on startup and the seed calls it
// after dropping the db. the two unique ones are doing more than speeding things up, they
// are what stops two accounts on one email even if both get submitted at the same moment
export const ensureIndexes = async () => {
  const db = await dbConnection();

  await db.collection('users').createIndex({email: 1}, {unique: true});

  await db.collection('equipment').createIndex({assetTag: 1}, {unique: true});
  await db.collection('equipment').createIndex({status: 1, categoryId: 1});

  await db.collection('requests').createIndex({status: 1, requestedAt: 1});
  await db.collection('requests').createIndex({userId: 1, status: 1});

  await db.collection('loans').createIndex({status: 1, dueDate: 1});
  await db.collection('loans').createIndex({userId: 1, status: 1});

  await db.collection('waitlistEntries').createIndex({equipmentId: 1, joinedAt: 1});
  await db.collection('waitlistEntries').createIndex({userId: 1, status: 1});

  await db.collection('notifications').createIndex({adminId: 1, isRead: 1});
};
