# OrganBridge

An educational organ-coordination prototype with a public Madhya Pradesh facility directory and synthetic clinical scenarios. **Not a clinically validated allocation service. Do not enter real patient or donor information.**

## Live demo

[Open OrganBridge on Streamlit](https://organbridge-demo.streamlit.app/)

The hosted demo uses synthetic, temporary browser-session records. Existing staff/admin credentials are configured through private Streamlit secrets. See [Streamlit deployment](DEPLOY_STREAMLIT.md).

## Run locally

Requires Node.js 18 or newer. No external JavaScript packages are required.

```sh
npm start
```

Open http://127.0.0.1:3000. Set `PORT` to use another port.

```sh
npm test
```

The automated suite covers preliminary screening safeguards, request lifecycle, appointments, credentials, city scoping, visitor ownership and isolated demo datasets.

## Interfaces

| Audience | Features |
| --- | --- |
| Visitor | Public hospital search, city/ownership/organ-keyword filters, autocomplete, synthetic request submission and status timeline, visitor appointments, learning center |
| Hospital Staff | Fixed account city, dashboard, live city-request feed, simulated availability, incoming requests, review updates, cancellation, internal hospital meetings |
| Administrator | Operations, live request supervision, read-only internal hospital appointments, role overview, audit, demo reset |

Role changes go through the top-right login. Staff and administrator accounts require passwords. On first local startup, the application creates `LOGIN-CREDENTIALS.txt` for the owner and stores salted scrypt password hashes in `data/auth-accounts.json`. These files are excluded from Git and Railway uploads. Keep them private.

Visitor login accepts an email without mailbox verification. Use a fictional address: this is not secure email-based identity verification. Staff account cities are server-assigned; staff request access is restricted to that city. Administrator supervision is read-only except demo reset. Sessions use HttpOnly cookies and expire after an hour. Login attempts are rate-limited.

## Data boundaries

- The public directory has 1,901 distinct facility IDs from NHA PM-JAY search. See [hospital provenance](HOSPITAL-DATA.md) for scope and collection details.
- City search matches published addresses; it does not geocode missing locations.
- Organ search matches words in facility names, not verified organ services.
- All donor, recipient, availability, request and appointment records are fictional.
- Request progress represents administrative follow-up, not transplant eligibility, organ offers or medical priority.
- Screening illustrates simplified kidney ABO patterns. HLA-label overlap is informational; clinical crossmatch is not implemented.
- There is no integration with actual hospital booking, NOTTO, organ inventory or allocation services.

With `PUBLIC_DEMO=1`, each browser has a separate temporary dataset. Logging between roles in that browser lets the owner demonstrate the workflow. Separate computers do not share clinical demo data. Session changes disappear after expiry or restart. Local mode stores fictional data in ignored `data/demo-db.json`.

## Deployment and teamwork

- [Railway deployment](DEPLOY_RAILWAY.md)
- [Teammate contribution plan](TEAM-CONTRIBUTIONS.md)

## Structure

- `server.js`, `lib/`: HTTP API, credentials and preliminary screening
- `public/`: role interfaces, dashboard, directory snapshot and logo
- `data/seed.js`: fictional initial scenarios
- `tests/`: API and safeguard tests

This prototype requires verified visitor identity, durable secure storage, hospital-specific provisioning, governance and independent validation before any consideration of real medical data.
