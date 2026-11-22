import bcrypt from 'bcryptjs';
import {users} from '../config/mongoCollections.js';
import * as helpers from '../helpers/validation.js';

const saltRounds = 10;

// our own password rules, not in the proposal, so they live here instead of the shared
// helpers file. nobody else needs them
const checkPassword = (password) => {
  if (password === undefined || typeof password !== 'string') {
    throw 'Error: password has to be given and has to be a string';
  }
  // not trimming this one. stripping a space would mean the password you set is not the one
  // you typed
  if (password.length < 8) {
    throw 'Error: password must be at least 8 characters long';
  }
  if (/\s/.test(password)) {
    throw 'Error: password cannot have spaces in it';
  }
  if (!/[A-Z]/.test(password)) {
    throw 'Error: password needs at least one uppercase letter';
  }
  if (!/[0-9]/.test(password)) {
    throw 'Error: password needs at least one number';
  }
  return password;
};

// the hash never leaves this file. everything returning a user goes through here first so no
// route can hand it to a template by accident
const stripHash = (user) => {
  if (user === null || user === undefined) {
    return user;
  }

  let safeUser = {
    _id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    adminNotes: user.adminNotes,
    isActive: user.isActive,
    createdAt: user.createdAt
  };
  return safeUser;
};

export const createUser = async (firstName, lastName, email, password, role, adminNotes) => {
  firstName = helpers.checkString(firstName, 'firstName');
  lastName = helpers.checkString(lastName, 'lastName');
  email = helpers.checkEmail(email);
  password = checkPassword(password);

  // signing yourself up always makes a plain user. the admin role gets handed out later from
  // the accounts screen, so the sign up form can never make one
  if (role === undefined) {
    role = 'user';
  }
  role = helpers.checkEnum(role, 'role', helpers.ENUMS.role);
  adminNotes = helpers.checkOptionalString(adminNotes, 'adminNotes');

  const userCollection = await users();

  const newUser = {
    firstName: firstName,
    lastName: lastName,
    email: email,
    passwordHash: await bcrypt.hash(password, saltRounds),
    role: role,
    adminNotes: adminNotes,
    isActive: true,
    createdAt: new Date()
  };

  let insertInfo = undefined;
  try {
    insertInfo = await userCollection.insertOne(newUser);
  } catch (e) {
    // 11000 is the unique index on email saying no. doing it this way instead of looking
    // first, because two people signing up at once would both find nothing and both get in
    if (e.code === 11000) {
      throw 'Error: an account with that email already exists';
    }
    throw 'Error: could not create the account';
  }

  if (!insertInfo.acknowledged || !insertInfo.insertedId) {
    throw 'Error: could not create the account';
  }

  let insertedUser = await userCollection.findOne({_id: insertInfo.insertedId});
  if (insertedUser === null) {
    throw 'Error: account was created but could not be found after!';
  }

  return stripHash(insertedUser);
};

export const loginUser = async (email, password) => {
  email = helpers.checkEmail(email);
  if (password === undefined || typeof password !== 'string' || password.length === 0) {
    throw 'Error: either the email or the password is wrong';
  }

  const userCollection = await users();
  let foundUser = await userCollection.findOne({email: email});

  // same message either way on purpose. saying "no account with that email" would let anyone
  // use this form to find out who has an account here
  if (foundUser === null) {
    throw 'Error: either the email or the password is wrong';
  }

  let passwordMatches = await bcrypt.compare(password, foundUser.passwordHash);
  if (!passwordMatches) {
    throw 'Error: either the email or the password is wrong';
  }

  if (foundUser.isActive !== true) {
    throw 'Error: this account has been deactivated, talk to an administrator';
  }

  return stripHash(foundUser);
};

export const getUserById = async (id) => {
  let userId = helpers.checkId(id, 'id');

  const userCollection = await users();
  let foundUser = await userCollection.findOne({_id: userId});
  if (foundUser === null) {
    throw 'Error: no account with that id';
  }

  return stripHash(foundUser);
};

export const getAllUsers = async () => {
  const userCollection = await users();
  let usersCursor = userCollection.find({});
  let allUsers = await usersCursor.toArray();

  let userListPlaceholder = [];

  allUsers.forEach((user) => {
    userListPlaceholder.push(stripHash(user));
  });

  return userListPlaceholder;
};
