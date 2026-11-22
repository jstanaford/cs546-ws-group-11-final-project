import {requireLogin, requireAdmin} from './middleware.js';

import homeRoutes from './home.js';
import authRoutes from './auth.js';
import accountRoutes from './account.js';
import catalogRoutes from './catalog.js';
import equipmentRoutes from './equipment.js';
import requestRoutes from './requests.js';
import dashboardRoutes from './dashboard.js';
import waitlistRoutes from './waitlist.js';
import loanRoutes from './loans.js';

import adminEquipmentRoutes from './admin/equipment.js';
import adminLookupRoutes from './admin/lookup.js';
import adminQueueRoutes from './admin/queue.js';
import adminReturnRoutes from './admin/returns.js';
import adminOverdueRoutes from './admin/overdue.js';
import adminAccountRoutes from './admin/accounts.js';
import adminNotificationRoutes from './admin/notifications.js';
import adminReportRoutes from './admin/reports.js';

// this file is written once and then left alone. every feature area already has a router
// mounted below, so adding a page means opening your own route file and nothing else.
// if five of us are all editing this file in week three then something has gone wrong
const constructorMethod = (app) => {
  // open to everyone - the landing page and the sign in / sign up / sign out routes
  app.use('/', homeRoutes);
  app.use('/', authRoutes);

  // you have to be signed in for these
  app.use('/account', requireLogin, accountRoutes);
  app.use('/catalog', requireLogin, catalogRoutes);
  app.use('/equipment', requireLogin, equipmentRoutes);
  app.use('/requests', requireLogin, requestRoutes);
  app.use('/dashboard', requireLogin, dashboardRoutes);
  app.use('/waitlist', requireLogin, waitlistRoutes);
  app.use('/loans', requireLogin, loanRoutes);

  // admin only. the guard goes on here rather than inside each router so that none of us has
  // to remember it, and so a restricted page cannot be reached just by typing the address
  app.use('/admin/equipment', requireAdmin, adminEquipmentRoutes);
  app.use('/admin/lookup', requireAdmin, adminLookupRoutes);
  app.use('/admin/queue', requireAdmin, adminQueueRoutes);
  app.use('/admin/returns', requireAdmin, adminReturnRoutes);
  app.use('/admin/overdue', requireAdmin, adminOverdueRoutes);
  app.use('/admin/accounts', requireAdmin, adminAccountRoutes);
  app.use('/admin/notifications', requireAdmin, adminNotificationRoutes);
  app.use('/admin/reports', requireAdmin, adminReportRoutes);

  // anything else is a 404. express 5 needs the wildcard written as a regex like this,
  // a plain '*' throws on startup
  app.use(/(.*)/, (req, res) => {
    return res.status(404).render('error', {
      title: 'Page Not Found',
      code: 404,
      message: 'That page does not exist.'
    });
  });
};

export default constructorMethod;
