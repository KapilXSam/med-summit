# Conference Compass

# Product Requirements Document
## VERA 2.0 - Conference Intelligence Module

| Field | Value |
|---|---|
| Version | 1.0 |
| Status | Final Draft |
| Owner | Product Director |
| Stakeholders | Engineering, AI Research, Medical Affairs, Customer Success, Sales |
| Target Release Date | Q3 2025 |
| Confidentiality | Internal Only |

---

## 1. Executive Summary
VERA 2.0 is the first purpose built conference intelligence platform for pharma medical affairs, HEOR and commercial teams. It delivers an end-to-end workflow for pre-conference planning, live on-site collaboration and post-conference deliverable generation.

Today pharma teams spend an average of 65 person-hours per major conference, 80% of which is repetitive manual work. Final deliverables typically take 10-14 days to produce, by which time the information is already stale. VERA 2.0 will reduce total effort per conference by 80% and deliver a complete draft executive summary within 1 hour of conference close.

---

## 2. Problem Statement
No existing tool solves the complete conference workflow for life sciences teams. All current solutions require users to:
- Manually copy and paste thousands of sessions from conference websites
- Manage planning in disconnected spreadsheets
- Manually transcribe notes from hundreds of posters
- Collate insights across 5-15 delegates over email and chat
- Spend weeks writing summaries after the conference ends

There is also no existing system that systematically tracks answers to pre-defined research questions across the full duration of an event.

---

## 3. Objectives & Success Metrics

### Product Objectives
1. Reduce pre-conference planning time by 75%
2. Reduce time to first client deliverable from 14 days to 2 hours
3. Eliminate manual transcription of posters and slides
4. Provide a single shared source of truth for all conference activity

### Success Metrics
| Metric | Target |
|---|---|
| North Star | Total manual work saved per conference | 80% reduction |
| Time to extract full conference agenda | < 10 minutes |
| OCR accuracy for posters | 99% |
| % of users that stop using spreadsheets for conference planning | 90% |
| Module adoption rate amongst existing customers | 75% within 6 months |
| Net Promoter Score | > 45 |

---

## 4. User Roles & Permissions
| Role | Description | Core Job To Be Done |
|---|---|---|
| Admin | Internal VERA operator | Create customer projects, configure global settings |
| Project Manager | Customer lead | Plan conference, allocate delegates, approve deliverables |
| Analyst | Pre-conference researcher | Validate extractions, build KIT/KIQ, review hypotheses |
| On-site Delegate | Conference attendee | Capture evidence, add notes, collaborate live |
| Medical Writer | Deliverable owner | Edit AI summaries, produce final client outputs |
| Client Viewer | External pharma stakeholder | Read only access to all insights and deliverables |

---

### Out of Scope for V2.0
This PRD explicitly excludes the following items to avoid scope creep:
- Travel and accommodation booking
- KOL outreach and contact information
- Social media monitoring
- Abstract submission management
- Predictive intelligence and KOL analytics will be delivered in V2.1

---

## 5. Module A: Pre-Conference
Available 90 days prior to conference start date.

| Feature | Functional Requirements | Acceptance Criteria |
|---|---|---|
| Conference Creation | * 1-click creation for all 120+ major pharma conferences <br> * Custom conference creation for any event <br> * Bulk URL ingestion | Full 4000 session ASCO agenda is extracted and structured in < 10 minutes. |
| AI Extraction | * Extracts all fields: title, time, room, authors, affiliations, abstract, trial ID <br> * Auto deduplication <br> * Auto tagging by therapy area, asset, phase | Extraction accuracy >95%. Any extraction with confidence <70% is flagged for review. |
| Session Planner | * Filter, sort and tag sessions <br> * Assign sessions to delegates <br> * Conflict detection <br> * Personal calendar export per delegate | User can select and assign 25 sessions to a delegate in 2 clicks. |
| LBA Monitor | * Runs every 15 minutes starting 7 days pre-conference <br> * Auto detects new Late Breaking Abstracts <br> * Alerts users only for LBAs relevant to their KIT | User receives alert within 20 minutes of an LBA being published. |
| KIT/KIQ Builder | * Import KIT/KIQ from global library or prior conferences <br> * Create nested KIT and KIQ structure <br> * AI maps every session and abstract to KIQ | 90% accurate automatic mapping, fully user editable. |
| AI Hypothesis Engine | * Generates 3+ testable hypotheses per KIQ <br> * Ranks hypotheses by impact and likelihood <br> * Flags gaps where no sessions exist to answer a KIQ | All hypotheses include links to supporting prior evidence from PubMed and ClinicalTrials.gov |

---

## 6. Module B: During Conference
Activated automatically 24 hours before conference start, mobile first design.

| Feature | Functional Requirements | Acceptance Criteria |
|---|---|---|
| Live Dashboard | * Real time agenda updated hourly <br> * Delegate check in per session <br> * KIQ completion tracker <br> * Live feed of new insights | Full dashboard loads in <2 seconds on 4G. |
| Evidence Capture | * One tap poster / slide photo upload <br> * Auto crop, deskew and enhance photos <br> * Background OCR <br> * Voice note transcription | User can upload a poster in 2 taps. Full OCR and summary available 60 seconds later. |
| Live Collaboration | * Threaded comments per session, poster and KIQ <br> * @ mentions <br> * Push notifications | Comments are visible to all team members within 1 second. |
| Live AI Insights | * 3 bullet summary for every uploaded poster <br> * Flags statistically significant results <br> * Flags unexpected or contradictory results <br> * Cross references against prior trial data | Every insight includes exact source quote, page number and confidence score 1-10. |
| KIQ Tracker | * Real time percentage complete for each KIQ <br> * Flags KIQs with no new evidence <br> * Suggests additional sessions delegates should attend | Project manager can see exactly which questions have been answered at any time. |

---

## 7. Module C: Post-Conference
Activated automatically at conference end.

| Feature | Functional Requirements | Acceptance Criteria |
|---|---|---|
| Bulk Summarization | * One click summarization of all content <br> * Configurable summary length | 500 posters are fully summarised in <10 minutes. |
| Trial Endpoint Extractor | * Automatically extracts all primary and secondary endpoints <br> * Extracts p values, HR, confidence intervals <br> * Generates standardised cross trial comparison tables | No inferred numerical values. All numbers are explicitly marked as direct extractions from source. |
| Insight Synthesis | * Groups all insights by KIT/KIQ <br> * Removes duplicate insights <br> * Ranks insights by impact and novelty | |
| Deliverable Generator | * 3 tiers of executive summary <br> * Full conference report <br> * Native export to Word, Powerpoint, PDF <br> * Full source attribution on every claim | Complete first draft report is available 60 minutes after conference close. |

---

## 8. AI Components
All AI output is built to meet pharma regulated industry requirements:
1. **Mandatory Source Attribution**: Every sentence generated by AI includes a link back to the exact source, page number and original quote
2. **Confidence Scoring**: All output scored 1-10. Any output <7 is clearly flagged and hidden from client viewers by default
3. **No Hallucination Guarantee**: AI will explicitly state if it does not know an answer, and will never invent information
4. **Specialised OCR**: Optimised for standard medical conference poster and slide layouts
5. **Isolated RAG**: Per-conference vector database, zero cross customer data leakage
6. **Knowledge Graph**: Auto links all entities: trials, assets, companies, KOLs across all conferences

---

## 9. Integrations & Data Model
### Integrations
| Category | Providers |
|---|---|
| Primary Data | Conference websites, ClinicalTrials.gov, PubMed, FDA, EMA |
| Collaboration | Microsoft Teams, Slack, Outlook Calendar |
| Export | Word, Excel, Powerpoint, PDF, CSV |

### Core Data Model
Conference, Session, Abstract, Poster, Trial, Endpoint, Company, Asset, KOL, KIT, KIQ, Hypothesis, Insight, Upload, Comment. All entities have a permanent immutable audit log.

---

## 10. Roadmap
| Version | Target Date | Contents |
|---|---|---|
| MVP | Q1 2025 | Pre-conference extraction, session planner, basic export |
| V1.0 | Q2 2025 | During conference capture, basic summarization, KIT/KIQ |
| V2.0 | Q3 2025 | Full feature set defined in this PRD |
| V2.1 | Q4 2025 | Predictive intelligence, KOL analytics |

---

## 11. Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Conference websites change structure and break extraction | High | Medium | Dedicated extraction maintenance team, manual fallback tool |
| AI hallucinations erode user trust | Medium | Critical | Mandatory source attribution, confidence scoring, human in the loop flagging |
| OCR accuracy on low quality photos | High | Medium | Automatic image enhancement, one click re-run OCR |

---

## Open Questions
1. Should we support full white label branding for client deliverables?
2. What level of version control is required for KIT/KIQ?
3. Should we add an approval workflow for insights before they are visible to clients?

If you would like me to expand any individual section, add detailed user stories, wireframe descriptions, technical acceptance criteria or a full sprint breakdown for this PRD, please let me know.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e5031053-3b70-4e4a-a862-6e8dd5a1552b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
