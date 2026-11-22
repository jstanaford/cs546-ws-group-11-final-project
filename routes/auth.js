import {Router} from 'express';
const router = Router();
import {createUser, loginUser} from '../data/users.js';
import {requireGuest, requireLogin} from './middleware.js';

// core 10, signing up, signing in and signing out. part a

// what we keep in the session. deliberately small, no hash, and little enough that it does
// not go stale the moment something changes
const sessionUser = (user) => {
  return {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role
  };
};

router
  .route('/register')
  .get(requireGuest, async (req, res) => {
    return res.render('register', {title: 'Create Account', stylesheet: 'auth.css'});
  })
  .post(requireGuest, async (req, res) => {
    let formInfo = req.body;

    if (!formInfo || typeof formInfo !== 'object') {
      return res.status(400).render('register', {
        title: 'Create Account',
        stylesheet: 'auth.css',
        error: 'Error: you have to fill the form out'
      });
    }

    try {
      // the data function does the real validating, we just hand it what came off the form.
      // two sets of rules would be two sets to keep in step
      const newUser = await createUser(
        formInfo.firstName,
        formInfo.lastName,
        formInfo.email,
        formInfo.password
      );

      req.session.user = sessionUser(newUser);
      return res.redirect('/catalog');
    } catch (e) {
      // handing back what they typed so the form is not blank again, except the password
      return res.status(400).render('register', {
        title: 'Create Account',
        stylesheet: 'auth.css',
        error: e,
        firstName: formInfo.firstName,
        lastName: formInfo.lastName,
        email: formInfo.email
      });
    }
  });

router
  .route('/login')
  .get(requireGuest, async (req, res) => {
    return res.render('login', {title: 'Sign In', stylesheet: 'auth.css'});
  })
  .post(requireGuest, async (req, res) => {
    let formInfo = req.body;

    if (!formInfo || typeof formInfo !== 'object') {
      return res.status(400).render('login', {
        title: 'Sign In',
        stylesheet: 'auth.css',
        error: 'Error: you have to fill the form out'
      });
    }

    try {
      const foundUser = await loginUser(formInfo.email, formInfo.password);

      req.session.user = sessionUser(foundUser);
      return res.redirect('/catalog');
    } catch (e) {
      // 401 and not 400, the form was fine, the credentials were not
      return res.status(401).render('login', {
        title: 'Sign In',
        stylesheet: 'auth.css',
        error: e,
        email: formInfo.email
      });
    }
  });

// a post and not a get, so an image tag or a link preview cannot sign someone out
router.route('/logout').post(requireLogin, async (req, res) => {
  req.session.destroy(() => {
    return res.redirect('/login');
  });
});

export default router;
