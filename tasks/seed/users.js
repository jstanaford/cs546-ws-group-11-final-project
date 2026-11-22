import {users} from '../../config/mongoCollections.js';
import {createUser} from '../../data/users.js';

// accounts. part a
// going through createUser rather than inserting straight into the collection so the passwords
// get hashed the same way a real sign up would - a seeded account you cannot log into is worse
// than no seeded account
export const seedUsers = async () => {
  const admin = await createUser(
    'Dana',
    'Whitfield',
    'admin@techcheckout.com',
    'Checkout123!',
    'admin',
    'Primary administrator for the pilot rollout.'
  );

  const user = await createUser('Maya', 'Chen', 'user@techcheckout.com', 'Checkout123!');

  const second = await createUser('Omar', 'Haddad', 'omar@techcheckout.com', 'Checkout123!');

  const third = await createUser('Priya', 'Raman', 'priya@techcheckout.com', 'Checkout123!');

  // one account that cannot sign in, so the deactivated path is something you can actually
  // demo instead of something we claim works. createUser always makes an active account, which
  // is right, so this gets turned off afterwards
  const retired = await createUser('Leo', 'Fabian', 'leo@techcheckout.com', 'Checkout123!');

  const userCollection = await users();
  await userCollection.updateOne({email: 'leo@techcheckout.com'}, {$set: {isActive: false}});

  return {
    admin: admin,
    user: user,
    others: [second, third],
    deactivated: retired,
    count: 5
  };
};
