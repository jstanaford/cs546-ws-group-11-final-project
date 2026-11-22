import express from 'express';
const app = express();
import session from 'express-session';
import exphbs from 'express-handlebars';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';
import {ensureIndexes} from './config/mongoCollections.js';
import configRoutes from './routes/index.js';

// esm does not give you __dirname for free, so build it off import.meta
const __dirname = dirname(fileURLToPath(import.meta.url));

app.use('/public', express.static(join(__dirname, 'public')));
app.use(express.json());
// without this every form post comes through with req.body undefined
app.use(express.urlencoded({extended: true}));

app.engine('handlebars', exphbs.engine({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
app.set('views', join(__dirname, 'views'));

app.use(
  session({
    name: 'AuthenticationState',
    secret: 'cs546 group 11 technology checkout system',
    resave: false,
    saveUninitialized: false,
    cookie: {maxAge: 1000 * 60 * 60}
  })
);

// hands the signed in account to every template, so the nav knows who you are without every
// route passing the user down itself
app.use((req, res, next) => {
  res.locals.user = null;
  res.locals.isAdmin = false;

  if (req.session.user) {
    res.locals.user = req.session.user;
    if (req.session.user.role === 'admin') {
      res.locals.isAdmin = true;
    }
  }

  return next();
});

configRoutes(app);

// build the indexes before taking any traffic. the unique ones on email and assetTag are what
// stop duplicates, so serving a request before they exist is not safe
ensureIndexes()
  .then(() => {
    app.listen(3000, () => {
      console.log("We've now got a server!");
      console.log('Your routes will be running on http://localhost:3000');
    });
  })
  .catch((e) => {
    console.log('Could not start up - is mongodb running?');
    console.log(e);
  });
