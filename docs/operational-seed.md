# Operational Demo Dataset

The supplied records are preserved in `data/operational-source.ts`. The application uses the typed, reconciled exports in `data/mockData.ts`.

## Loading

New browser stores load the dataset automatically. Existing saved work is preserved. Sign in as an agency admin and use **Leads > Reset Test Data** to replace that agency's operational data with the new seed. Other agencies are preserved.

The four supplied staff email addresses are added to the demo login directory with password `password`. Existing login accounts and saved account settings are retained.

## Reconciliation

- `tenant-wch` maps to the existing `tenant-world-class` agency.
- Booking references map to `bookingNumber`; client booking lists use record IDs.
- Occupancy derives from the supplied confirmed bookings: Europe 5, Turkey 0, Umrah 2, Southeast Asia 1. The source's larger occupancy counts lack supporting booking records.
- Invoice balances, payment status, milestone status, receipt totals, and manifest payment badges agree. Paid bookings receive matching paid invoices.
- `booking-07` and `booking-08` were referenced by invoices but not supplied. Those invoices retain their client links and identify their missing booking in the description; no bookings or seat allocations are invented.
- Historical booking references and lifetime totals without supporting records remain in the source file. Displayed lifetime totals and tiers derive from the supplied confirmed bookings.
- Advertised tour durations are retained. Return dates derive from departure plus days minus one; this corrects the first three supplied return dates by one day. Original dates remain in the source file.
- Room 101 is rebuilt from its traveler references. The unnamed Umrah seat and child's short passport validity are preserved for operational testing.
- Web-form inquiries remain Web Form leads. Unassigned is admin-only, and known client phones show a returning-client badge.
- The supplied proof URLs are stock demo images, not real bank evidence. The pending 400,000 claim does not reduce the balance until approval. The approved 100,000 claim is represented in its invoice receipt exactly once.
- No new visa cases or supplier expenses were supplied. Old World Class demo cases and expenses are excluded from this seed.
