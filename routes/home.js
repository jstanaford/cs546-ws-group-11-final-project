import {Router} from 'express';
const router = Router();

// core 1, the landing page. part c
// whoever takes part c owns this file. the redirect below is only here so the root of the
// site does something sensible during week one instead of landing on a 404 - delete it when
// you build the real landing page
router.route('/').get(async (req, res) => {
  if (req.session.user) {
    return res.redirect('/catalog');
  }
  return res.redirect('/login');
});

export default router;
