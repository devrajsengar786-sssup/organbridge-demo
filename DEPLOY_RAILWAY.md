# Railway deployment

Deploy synthetic scenarios only. Public directory facts do not authorize organ allocation or establish live hospital services.

## Before deployment

1. Run `npm test`.
2. Start locally once to generate demo credentials. Keep `LOGIN-CREDENTIALS.txt` private.
3. Keep both that file and `data/auth-accounts.json` out of Git and upload archives. `.gitignore` and `.railwayignore` already exclude them.
4. For stable hosted accounts, set the Railway secret variable `ORGANBRIDGE_ACCOUNTS_JSON` to the JSON contents of the local `data/auth-accounts.json`. It contains salted password hashes and account city assignments. Transfer it directly to Railway variables; never paste it into issues, logs or commits.
5. Do not set `ORGANBRIDGE_TEST_PASSWORD` in a deployed environment. It exists only for isolated automated tests.

Without the accounts variable, accounts are regenerated on an ephemeral deployment. Its generated password file will not be available on the website; do not use that fallback for a persistent hosted demo.

## Deploy from GitHub

1. In Railway, create a new project from the `organbridge-demo` repository.
2. Ensure account capacity is available. A free-plan provisioning-limit error must be resolved in Railway before a new project can be created; do not delete other projects automatically.
3. Set `PUBLIC_DEMO=1` and `ORGANBRIDGE_ACCOUNTS_JSON` as above.
4. `railway.json` provides `npm start`, health checks at `/api/health` and bounded failure restarts. The server uses Railway's `PORT`.
5. Generate a public Railway domain in service Networking settings.
6. Verify the public homepage and `/api/health` (`ok: true`, `mode: SYNTHETIC_ONLY`). Test visitor login, staff credentials, designated city, admin oversight and logout.

## Hosted limitations

Each browser gets an isolated in-memory synthetic dataset; it is not a shared hospital coordination database. Sessions and temporary records expire or disappear on restart. Visitor email entry is unverified and no email is sent. Internal meetings do not send invitations. The public hospital directory is a dated snapshot.

Account provisioning, HTTPS deployment review, verified visitor email, durable storage, operational monitoring and appropriate privacy controls remain prerequisites for broader use. Never load real patient data.
