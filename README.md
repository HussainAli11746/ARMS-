# ARMS - Anti-Ragging Monitoring System

Local SWE lab demonstration for Team T038.

## Run

Use Node.js 22.13 or newer. From this folder:

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000. `npm start` starts the same local demo server.
Use a quick demo account, or sign in with its email and `ArmsDemo2026!`.
Anonymous visitors can use the public report button without signing in.
Stop the server with Ctrl+C. Sign in again after restarting it.

## Data

Records and uploads are saved in `.data/arms.sqlite`, a local SQLite database.
Existing JSON records are imported automatically the first time SQLite is initialized.
The old JSON files are retained as import sources; SQLite is authoritative after import.
The app loads the existing files when restarted. Sessions last only for the running server.
The administrator's reset action restores the sample data, so only use it when you intend to reset the demo.
There is no Cloudflare, database setup or deployment step.

## Checks

```sh
npm run check
npm test
npm run test:storage
npm run test:website
npm run test:contracts
```

The backend test uses `.data_test_isolated`, separate from your demo data.
The website test needs a running server and creates synthetic records in that server.
For a separate test server, start it with `ARMS_TEST_ISOLATED=1 npm run dev`.

See LOCAL_DEMO_NOTES.md for the file map, retained features and verification limits.

For viva preparation, read VIVA_CODE_GUIDE.md. It maps each requirement to its
screen, handler and server function, explains the syntax, and shows where to edit a requirement.
