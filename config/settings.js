// mongo settings for the whole group - leaving these hardcoded on purpose so that anyone
// who clones this can just npm install and run it. no .env file to copy first and forget about
export const mongoConfig = {
  serverUrl: 'mongodb://localhost:27017/',
  database: 'techCheckout'
};
