# TradeJournal

A dark + yellow, glassmorphic trading journal: auth, trade journal with
auto R:R, a position-size calculator, and a dashboard.

- **Frontend:** plain HTML, CSS, and JS — no build step, no framework.
- **Backend:** Node.js using only built-in modules (`http`, `crypto`, `fs`) —
  no `npm install` required, nothing to go out of date.
- **Data:** stored in `backend/data/db.json`. Fine for personal use or a demo;
  swap in a real database later if you need multi-instance or heavier scale.

## Run it

```
cd backend
node server.js
```

Then open **http://localhost:3000** in your browser. The Node server serves
the frontend files *and* the API from the same origin, so there's no CORS
setup to worry about.

Change the port with `PORT=4000 node server.js` if 3000 is taken.

## Project layout

```
backend/
  server.js         entry point — static file server + API router
  lib/
    store.js         tiny JSON-file database with a write queue
    auth.js           password hashing (scrypt) + token helpers
    http-utils.js     JSON body parsing / response helpers
  routes/
    auth.js           signup, login, /me, logout
    journal.js         trade CRUD + R:R auto-calculation
    dashboard.js        stats aggregation for the dashboard
  data/db.json        the "database" (users, trades, tokens)

frontend/
  login.html / signup.html    glassmorphic auth forms
  dashboard.html               stats, equity curve, most-traded pairs
  journal.html                  trade table, filters, add/edit modal
  risk-tools.html                position-size + quick R:R calculators
  css/styles.css                 the whole design system, one file
  js/
    api.js       fetch wrapper + token storage + auth guards
    ui.js         toasts + page-transition helper
    nav.js        renders the sidebar/topbar on every app page
    dashboard.js / journal.js / risk.js   per-page logic
```

## How auth works

Signup/login return a bearer token (random 32-byte hex) stored in
`db.json` under `tokens`, with a 30-day expiry. The frontend keeps it in
`localStorage` and sends it as `Authorization: Bearer <token>` on every
API call. There's no session cookie and no CSRF surface to manage as a
result — trade-off worth knowing about if you deploy this beyond local/demo use.

## Extending it

- **Real database:** swap `lib/store.js` for a Postgres/SQLite-backed
  version; every route already goes through `store.readDb()` /
  `store.update()`, so the interface can stay the same.
- **Pip values:** the position-size calculator uses a manual "pip value
  per standard lot" input (defaults to $10, accurate for most USD-quoted
  majors) rather than pulling live FX rates, since this environment has
  no outbound network access. Wire up a rates API if you want it automatic.
