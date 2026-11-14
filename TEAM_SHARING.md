# Sharing the local ARMS demo

Send the source folder or push the agreed source changes to your team repository.
Exclude node_modules, .git, .data, .data_test_isolated and generated build folders.
Each teammate runs npm install and npm run dev, then opens http://127.0.0.1:3000.
The initial sample accounts and records are created automatically.

All demonstration accounts use ArmsDemo2026! and can also be selected using the sign-in buttons.
Students: somik@arms.test, aman@arms.test. Guardian: guardian@arms.test.
Squad: squad@arms.test, squad2@arms.test. Committee: committee@arms.test, committee2@arms.test.
Administrator: admin@arms.test. Oversight: oversight@arms.test.

The main walkthrough is report submission, squad enquiry and findings, committee action and closure,
then undertaking submission, rejection, corrected resubmission and verification.
Undertaking verification is administrator-only, matching the submitted scenario and state diagram.
The app automatically creates a local SQLite database; no database server is required.

For run commands, stored data and test instructions, use README.md.
