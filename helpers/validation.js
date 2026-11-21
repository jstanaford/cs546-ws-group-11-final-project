import {ObjectId} from 'mongodb';
import xss from 'xss';

// shared validation for the whole group. anything in here is something more than one of us
// needs - if a check is only for your own feature keep it in your own file instead, otherwise
// this turns into the one file all five of us are fighting over

// checks that a val was provided, is a string, and is not just spaces
// returns the trimmed string val
export const checkString = (val, varName) => {
  if (val === undefined || typeof val !== 'string') {
    throw `Error: ${varName} has to be given and has to be a non empty string`;
  }
  let trimmedVal = val.trim();
  if (trimmedVal.length === 0) {
    throw `Error: ${varName} cannot be an empty string or just blank spaces`;
  }
  return trimmedVal;
};

// same as checkString but an empty field is allowed - use this for the stuff that is genuinely
// optional like admin notes. comes back as '' so the db never gets undefined
export const checkOptionalString = (val, varName) => {
  if (val === undefined || val === null) {
    return '';
  }
  if (typeof val !== 'string') {
    throw `Error: ${varName} has to be a string`;
  }
  let trimmedVal = val.trim();
  if (trimmedVal.length === 0) {
    return '';
  }
  return trimmedVal;
};

// takes an id as a string off the url or as an ObjectId already and hands back an ObjectId
// so the data functions can query with it straight away
export const checkId = (val, varName) => {
  if (val instanceof ObjectId) {
    return val;
  }
  let trimmedVal = checkString(val, varName);
  if (!ObjectId.isValid(trimmedVal)) {
    throw `Error: ${varName} is not a valid id`;
  }
  return new ObjectId(trimmedVal);
};

// emails get stored lowercase so the unique index actually does its job - without this
// Maya@stevens.edu and maya@stevens.edu would both be allowed to register
export const checkEmail = (val) => {
  let trimmedVal = checkString(val, 'email');
  let loweredVal = trimmedVal.toLowerCase();
  // one @ with something either side and a dot in the back half. not trying to catch every
  // weird legal address here, just the typos
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(loweredVal)) {
    throw 'Error: email is not a valid email address';
  }
  return loweredVal;
};

// checks a whole number in a range, converting it first if it came off a form as a string
// returns the num
export const checkWholeNumber = (val, varName, min, max) => {
  if (val === undefined || val === null) {
    throw `Error: ${varName} you have to give a value!`;
  }
  let numberVal = val;
  if (typeof val === 'string') {
    let trimmedVal = val.trim();
    if (trimmedVal.length === 0) {
      throw `Error: ${varName} cannot be an empty string or just spaces`;
    }
    // only plain digits allowed - no negatives, no decimals, no letters
    if (!/^\d+$/.test(trimmedVal)) {
      throw `Error: ${varName} gotta be a whole number`;
    }
    numberVal = Number(trimmedVal);
  } else if (typeof val !== 'number') {
    throw `Error: ${varName} must be a number or a numeric string`;
  }

  if (!Number.isInteger(numberVal)) {
    throw `Error: ${varName} must be a whole number`;
  }

  if (!Number.isFinite(numberVal)) {
    throw `Error: ${varName} must be a finite number`;
  }

  if (numberVal < min || numberVal > max) {
    throw `Error: ${varName} must be between ${min} and ${max}`;
  }
  return numberVal;
};

// checks a value is one of the ones we actually allow. pass the list in from ENUMS below
export const checkEnum = (val, varName, allowed) => {
  if (allowed === undefined || !Array.isArray(allowed)) {
    throw `Error: ${varName} was checked against a list that is not an array`;
  }
  let trimmedVal = checkString(val, varName);
  if (!allowed.includes(trimmedVal)) {
    throw `Error: ${varName} must be one of: ${allowed.join(', ')}`;
  }
  return trimmedVal;
};

// takes a date off a form or out of the db and hands back a real Date object
// returns the Date
export const checkDate = (val, varName) => {
  if (val === undefined || val === null) {
    throw `Error: ${varName} you have to give a date!`;
  }
  let dateVal = val;
  if (typeof val === 'string') {
    let trimmedVal = val.trim();
    if (trimmedVal.length === 0) {
      throw `Error: ${varName} cannot be an empty string or just spaces`;
    }
    dateVal = new Date(trimmedVal);
  }
  if (!(dateVal instanceof Date)) {
    throw `Error: ${varName} must be a date or a date string`;
  }
  // an unparseable date string still gives you back a Date object, it just has NaN inside it
  if (Number.isNaN(dateVal.getTime())) {
    throw `Error: ${varName} is not a real date`;
  }
  return dateVal;
};

// run anything a user typed through this before it gets rendered back out. handlebars escapes
// {{ }} on its own so this is really for the places we store it and for any triple stash
export const sanitize = (val) => {
  if (val === undefined || val === null) {
    return '';
  }
  if (typeof val !== 'string') {
    return val;
  }
  return xss(val);
};

// every list of allowed values from our database proposal, in one place. use these with
// checkEnum instead of retyping the strings - if we each type them out we will each get one wrong
export const ENUMS = {
  role: ['user', 'admin'],
  equipmentStatus: ['available', 'onOffer', 'reserved', 'checkedOut', 'outOfService', 'retired'],
  condition: ['new', 'good', 'fair', 'poor', 'damaged'],
  serviceEventType: ['return', 'outOfService', 'repairComplete', 'retired'],
  requestType: ['checkout', 'renewal'],
  loanType: ['shortTerm', 'longTerm'],
  requestStatus: ['pending', 'approved', 'denied', 'cancelled', 'issued', 'released'],
  loanStatus: ['active', 'returned'],
  waitlistStatus: ['waiting', 'offered', 'accepted', 'declined', 'expired', 'cancelled'],
  notificationType: ['requestApproved']
};
