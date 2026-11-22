// the three guards everyone uses. put these in front of your routes instead of each of us
// writing our own check, otherwise five slightly different versions is five chances to get
// it wrong and leave a page open

// anything a signed out person should not see
export const requireLogin = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  return next();
};

// admin only. every router under /admin is already mounted behind this in routes/index.js,
// so you do not have to remember to add it yourself. that also means typing the address
// straight into the bar does not get you in
export const requireAdmin = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  if (req.session.user.role !== 'admin') {
    return res.status(403).render('error', {
      title: 'Not Permitted',
      code: 403,
      message: 'That page is only for administrators.'
    });
  }
  return next();
};

// the opposite - no point showing the sign in form to someone already signed in
export const requireGuest = (req, res, next) => {
  if (req.session.user) {
    return res.redirect('/catalog');
  }
  return next();
};
