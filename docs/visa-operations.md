# Visa Operations and Passport Custody

Open `/visa-pipeline`. `/visa-tracker` opens the same workspace for existing links.

## Workflow

- Agency Admin, Front Desk and Visa Consultant can create and manage cases within their agency.
- New cases require an existing CRM client. Booking-generated visa applicants appear automatically.
- Move cards using drag-and-drop or the stage selector. Six stages run from Documents Pending to Completed.
- Open a case to edit logistics, decision, staff assignment and operational fees.
- Receive documents before verifying them. Required-document and verification counts update in the editor.
- The Custody tab requires explicit confirmation of the physical passport location. Safe storage requires a locker identifier; courier dispatch requires tracking.
- The Passport Custody Vault lists passport locations and references. Case dialogs show recorded custody changes with staff identity and timestamps.

## Compatibility and Boundaries

`VisaCase`, `VisaStage` and `VisaDocumentItem` are strict new contracts. Existing persisted data uses explicitly named `LegacyVisaCase`, `LegacyVisaStage` and `LegacyVisaDocumentItem` contracts, with canonical metadata stored in `pipeline`. `normalizeVisaCase` exposes the new contract without discarding saved records or booking links.

Legacy custody is unconfirmed until staff check it. No embassy location, locker or courier reference is inferred from a visa stage. Legacy fee totals remain intact when their breakdown is unknown. Booking-linked applicant edits update the linked traveler without changing financial records.

The supplied operational demo dataset contains no visa cases. Create a CRM-linked case or confirm a Visa Consultancy booking to populate the workspace; no sample passport custody records are invented.

This remains a browser-local demo, not a secure document-storage or embassy integration service. The vault tracks physical custody metadata, not encrypted passport files. Document file URLs are retained by the contract but this step does not upload files. Fee fields do not post receipts, settle invoices or initiate embassy payments. No physical handover or embassy decision is automatically verified.
