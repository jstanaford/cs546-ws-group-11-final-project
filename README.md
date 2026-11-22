# Technology Checkout System

A web application for managing the technology an organization loans out to its people.
Users browse a catalog, request equipment and track what they have borrowed.
Administrators manage the equipment, approve requests, and handle checkouts and returns.

CS 546 Web Programming I, Group 11.

## Requirements

- Node.js 18 or newer
- MongoDB running locally on port 27017

## Running it

```
npm install
npm run seed
npm start
```

Then open http://localhost:3000

`npm run seed` drops the database and rebuilds it, so run it any time you want to get
back to a clean state.

## Seeded accounts

| Email                  | Password     | Role  |
| ---------------------- | ------------ | ----- |
| admin@techcheckout.com | Checkout123! | admin |
| user@techcheckout.com  | Checkout123! | user  |

## Where things live

| Folder        | What goes in it                                                                  |
| ------------- | -------------------------------------------------------------------------------- |
| `config/`     | The Mongo connection, the collection accessors and the database settings         |
| `data/`       | The database functions. Nothing in here knows about requests or responses        |
| `routes/`     | The Express routers. One file per feature area, all mounted in `routes/index.js` |
| `views/`      | The Handlebars templates. `views/layouts/main.handlebars` is the page shell      |
| `public/css/` | Stylesheets. `base.css` is shared, the rest are per feature area                 |
| `public/js/`  | Client side JavaScript, mostly form validation                                   |
| `helpers/`    | Validation checks that more than one feature area needs                          |
| `tasks/`      | `seed.js` and the per feature seed files it calls                                |

Validation that only one feature area needs stays in that area's own file rather than
going into `helpers/`.

## Other scripts

```
npm run lint      # check for unused variables, typos in names, that kind of thing
npm run lint:fix  # fix what can be fixed automatically
npm run format    # run prettier over the project
```

Run `npm run format` before you commit. If everybody does that, nobody ends up with a
pull request full of whitespace changes to files they did not write.
