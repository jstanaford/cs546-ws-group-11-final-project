import {Router} from 'express';
const router = Router();

// core 1, the landing page. part c
// the redirect below is only so the root does something during week one. delete it when
// you build the real landing page
router.route('/').get(async (req, res) => {
  if (req.session.user) {
    return res.redirect('/catalog');
  }
  return res.redirect('/login');
});

export default router;
