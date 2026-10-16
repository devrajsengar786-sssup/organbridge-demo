# Hospital directory provenance

Source: National Health Authority, PM-JAY Hospital Engagement Module,
https://hem.nha.gov.in/search, retrieved 16 October 2026.

The Madhya Pradesh state filter was selected. All 114 government pages and
81 private pages were traversed. The source displayed 1,140 government rows
and 805 private rows. Consolidating repeated facility IDs gives 1,901 records:
1,140 government and 761 private. The last displayed occurrence of each ID
was retained. These are source categories, not independently audited ownership.

`public/hospitals.json` contains public facility names, IDs, addresses, listed
contacts, type, specialty-code previews and dates as displayed. It contains
no patient records. Blank values and source spelling are preserved. Truncated
specialty previews are flagged; codes are not expanded into inferred services.

## Coverage limitations

- This is a snapshot of those PM-JAY categories, not a census of every MP hospital.
- Current empanelment, contacts and services must be checked with the source.
- Suspended, blacklisted and de-empanelled categories were not imported.
- The results have no separate district column. City search matches address text.
- Organ search matches facility-name keywords, not organ availability or transplant authorization.
- Primary health centers and other facility types are included.
- Dashboard refresh does not update the external directory snapshot.

Future data updates should retain this provenance, report input and distinct-ID
counts, validate missing fields, and never combine public directory facts with
fictional clinical records as though the latter were real.
