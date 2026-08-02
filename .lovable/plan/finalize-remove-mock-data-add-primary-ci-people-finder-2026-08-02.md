# Finalize: remove mock data + add Primary CI people finder

Yes — I understand. You want a people-centric view: instead of browsing sessions, you browse the *humans* attending (authors/presenters from different companies), so a field team can find the right person, at the right hall, at the right time, and ask their KIQs.

## 1. Remove mock data

`src/data/mock.ts` is the only remaining mock file and nothing imports it (verified). It gets deleted. Everything already reads live data from the backend via `src/lib/db.ts`.

## 2. New section: Primary CI (People Finder)

New sidebar entry under Module A, route `/pre/people`.

Data is derived from the same planner sessions already in the database — each session has authors, affiliation, asset/trial, day, time, and room. The page splits the author string into individual people and builds one row per person-session appearance.

Table columns:

| Person | Company / Affiliation | Session | Asset / Trial | Day + Time | Hall / Location | Indication | Link |

Behaviour:
- **Grouped by person**: one expandable row per person; if someone appears in several sessions, all their appearances (time + hall) are listed under them, so you can see every window to catch them.
- **Filters**: company, indication, asset/trial, day, hall, plus free-text search on name.
- **Row actions**: assign a KIQ to ask, mark priority (High / Medium / Low), mark status (To approach / Approached / Done), and add a note.
- **Export CSV** of the filtered list for field teams.
- **Add person manually** dialog, for contacts who aren't listed as authors (booth staff, KOLs, medical affairs leads).
- Empty state pointing to Session Planner when no sessions have been imported yet.

To store the CI-specific bits (priority, status, assigned KIQ, notes, manually added people) a small `ci_contacts` table is added to the backend, keyed by person name + conference, with the same open access policy the other tables use. Derived rows stay live from sessions; only your annotations are saved.

## Suggestions to make this stronger

1. **"Right now" mode** — a live view during the conference that shows only people presenting in the next 2 hours, sorted by hall, so delegates get a walking route.
2. **Company view** — flip the table to group by company to see a competitor's full presence at the congress in one shot.
3. **Coverage gaps** — highlight target companies in your KIT that have *no* one identified yet.
4. **Delegate assignment** — assign each priority person to a delegate, so two people don't approach the same author.
5. **Debrief capture** — a quick "what they said" note per person that feeds into Insight Synthesis post-conference.

I'd build items 1–3 now (cheap, high value) and leave 4–5 unless you want them in this pass.

## Technical notes

- Delete `src/data/mock.ts`.
- New route `src/routes/pre.people.tsx` with its own `head()` metadata.
- Person parsing helper (splits `"Chen L, et al."`-style author strings, normalises names, de-dupes case/punctuation variants) in `src/lib/people.ts`.
- Migration for `ci_contacts` (conference_id, person_name, company, kiq_id, priority, status, note, manual flag) with grants + RLS matching existing tables.
- Fetchers/mutations added to `src/lib/db.ts`, hook in `src/lib/hooks.ts`, sidebar entry in `src/components/app-sidebar.tsx`.
