import {MongoClient} from 'mongodb';
import {mongoConfig} from './settings.js';

let _connection = undefined;
let _db = undefined;

export const dbConnection = async () => {
  if (!_connection) {
    _connection = await MongoClient.connect(mongoConfig.serverUrl);
    _db = _connection.db(mongoConfig.database);
  }

  return _db;
};

export const closeConnection = async () => {
  // checking first because the seed script and anything else that ends early can call this
  // before a connection was ever opened, and closing an undefined client throws
  if (_connection) {
    await _connection.close();
    _connection = undefined;
    _db = undefined;
  }
};
