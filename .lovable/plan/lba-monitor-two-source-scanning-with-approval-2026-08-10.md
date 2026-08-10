# LBA monitor: two-source scanning with approval

Yes — this is feasible with what's already in place. The LBA monitor already scrapes and AI-scores pages; adding a second, company-press-release lane plus an approval step is an extension, not a rebuild.

## What changes

**Two lanes per scan**

1. **Conference lane** — the ESMO programme/late-breaker pages, as today. Anything found here is trusted: it lands straight in the alert list, always editable.
2. **Company lane** — for each participating company, search its newsroom/press releases for signals of an upcoming late-breaker at this conference. These land as **Pending approval** with the company link attached, and only join the main list once you approve them.

**Where the company list comes from**
- Watchlist entries marked as companies
- Sponsors/companies already derived from the imported sessions (industry symposia, trial sponsors)
- Plus the ability to add or remove companies for the scan in the LBA panel

**Approval queue**
- New "Pending" tab beside Live / Dismissed, with a count badge
- Each pending card shows: title, company, why it matched, the source link, and the extracted trial/indication/phase
- Actions: Approve (moves into the live list), Edit then approve, Dismiss

**Editing**
- Every alert — conference-sourced or approved press-release — gets an Edit dialog covering title, abstract number, summary, sponsor, indication, phase, trial ID and source link. Edits are saved and marked as manually corrected so a later re-scan doesn't overwrite them.

**Refresh**
- The existing "Check conference site" button runs both lanes and reports what came from where: `X from conference site · Y pending from company releases`.

## Honest caveats

- Press releases rarely name an abstract number before embargo lifts. Expect titles like "Company to present Phase 3 data at ESMO 2026" — useful as an early signal, thin on detail. That's exactly why they go through approval rather than straight into the feed.
- Some company newsrooms block automated reads. Those get skipped and reported as failed sources, not silently dropped.
- Company-lane scanning is slower (one search + scrape per company), so it runs against a capped list per scan.

## Technical notes

- Migration on `lba_alerts`: `source_type` ('conference' | 'company_pr' | 'manual'), `approval` ('approved' | 'pending'), `company` text, `edited` boolean. Backfill existing rows to conference/approved. Existing status values (new/reviewed/dismissed) stay as-is.
- `src/lib/lba.server.ts`: add `discoverCompanyPressReleases(company, conferenceName)` using the existing Firecrawl search + scrape helpers, and an `extractCompanyLbaSignals` prompt tuned for pre-embargo press-release language (must mention the conference and a late-breaker/presentation intent; no invented abstract numbers).
- `src/lib/lba.functions.ts`: `scanLbaFeeds` gains a `companies` input and runs both lanes, dedupes across them by abstract number then normalised title, and inserts company-lane rows as `pending`. Conference-lane rows never downgrade an approved row. Rows with `edited = true` keep their manual field values on re-scan.
- New server fns / db helpers: `approveLbaAlert`, `updateLbaAlert` in `src/lib/db.ts` + hooks in `src/lib/hooks.ts`.
- `src/routes/pre.lba.tsx`: Pending tab, company chips in the scan panel, source-type badge on each card, Edit dialog reusing the existing manual-entry field layout.
