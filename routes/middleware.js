// the three guards everyone uses. put these in front of your routes rather than writing your
// own, five slightly different versions is five chances to leave a page open

// anything a signed out person should not see
export const requireLogin = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  return next();
};

// admin only. every router under /admin is already mounted behind this in routes/index.js, so
// you do not have to remember it, and typing the address straight in does not get you there
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

// no point showing the sign in form to someone already signed in
export const requireGuest = (req, res, next) => {
  if (req.session.user) {
    return res.redirect('/catalog');
  }
  return next();
};
