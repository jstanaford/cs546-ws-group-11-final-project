// extra 2, the notification center. part a
// seed.js calls this as seedNotifications(seededUsers, seededRequests). it runs last because
// a notification points at a request, so the requests have to exist first
//
// what the demo needs:
//     a few notifications on the admin account, some read and some not, so the unread
//     count is worth looking at
export const seedNotifications = async () => {
  return {count: 0};
};
