# WAT.ai Internal Operations Platform

Internal partnership + operations tool for WAT.ai (University of Waterloo's largest AI student engineering team, 150+ members, ~20 projects/year). Starts as a sponsorship/partnership CRM, generalizes into a full internal ops platform across all director lanes. Will be open-sourced for other student teams after the WAT.ai build is proven.

**Builder context:** Solo stealth build by Katie (leads partnerships & operations). No one on the team knows about this yet — working MVP first, then reveal. This is also her public portfolio ship, so code quality and eventual open-source packaging matter, but shipping in weeks matters more.

## North-star goals

1. **Usable and durable.** The design must simplify existing tasks, not add organizational overhead. Every feature is judged by: does this reduce work for a busy student leader, or create a new logging chore? Features that require diligent manual logging will fail — automate capture wherever possible, make manual entry one-click confirmations of auto-detected things.
2. **Context survives turnover.** Students rotate on 4-month co-op cycles and graduate. Relationship history, decisions, and institutional knowledge must outlive any individual. This is the single biggest value over a spreadsheet.
3. **Enforce the 3-day SLA.** Open sponsor threads must never sit unanswered past 3 days. Surface breaches loudly.
4. **Quantify everything (eventually).** Log activity from day one so metrics/experiments are possible later, even before dashboards exist. Data not captured is gone forever; dashboards can be built anytime.
5. **More than a dashboard.** Deep integration with Google Drive, Gmail, Google Calendar, Discord (where the team lives), Luma.

## Org structure (informs RBAC and lanes)

- **Executive team**: operations + strategy, insight into every director lane. Includes VP Projects and VP Sponsorships.
- **Director lanes**: Projects, Sponsorships, Events (also handles marketing), Finance.
  - *Projects director*: oversees TPMs (technical project managers), keeps projects on schedule for deliverables, checks in with TPMs, keeps CMs (core members / engineers) engaged, helps with scoping + technical mentorship.
  - *Sponsorship directors*: relationship management, fundraising, sponsor comms, alignment for sponsored events. Two fundraising rounds/year planned (school year starts September; students alternate 4-month study/co-op terms).
  - *Events directors*: internal, external, and sponsor-event execution.
  - *Finance director*: budget, approvals of funding requests/receipts.

## Tech stack

- **Next.js** on **Vercel** (Vercel cron for reminder engine + digests)
- **Supabase**: auth, Postgres, row-level security for RBAC
- **Claude API**: briefs, outreach drafts, doc classification, extraction
- **Google APIs**: Drive (Picker + folder indexing), Gmail, Calendar — OAuth per user
- **Discord bot**: reminders, approval pings, digests
- Embeddings over linked Drive folders for context retrieval (fact/quote surfacing with source links — every AI suggestion must link its source doc so nothing hallucinated gets quoted to a sponsor)

## Core architecture: four primitives

Everything in the app reduces to four reusable primitives. Do not build one-off versions of these per lane.

1. **Entity records** — Partner orgs, Contacts, Members, Events, Projects, Deals, Funding Requests. Shared pattern: fields + linked records + activity timeline + notes + Drive links.
2. **Tasks** — assignee, lane, due date, linked entity, labels, Discord reminder (default on, per-task mute). To-do lists, follow-ups, sponsor-event role slots (comms lead, venue, food, custom), and deliverables are ALL tasks with different links/labels. One table, many views (team view, individual view, per-entity view, project-management view).
3. **Approvals** — requester, approver(s), payload, status, reasoning. Used for: deal approvals, relationship-lead assignment/transfer, funding requests. One object, three+ types.
4. **Activity log** — every action writes an event row (who/what/when/entity). Powers touchpoint timelines, Discord digests, task history, and all future metrics.

## Access control (RBAC — in V0)

Built into V0 with full role model from the start (decision: don't defer RBAC; ship with it).

- **Admin** — Katie / platform maintainers. Full everything.
- **Executive** (incl. VPs) — full cross-lane visibility; approves new deals; assigns or toggles visibility of relationship-lead openings; approves lead transfers (VP Partnerships is default transfer approver, requester can route to full exec team or a specific exec instead).
- **Director** — own lane read/write + cross-lane read where toggled by execs. Partnership directors can self-request relationship lead on exec-visible deals, accept/reject assigned leads, and request transfers.
- **TPM / member** — tasks, funding request submission, own project records.

Supabase RLS enforces tiers. Lanes are config, not code: a `lanes` table (WAT.ai's four lanes as seed data) with `discord_channel_id` per lane. This is the one cheap generalization done now for future open-source adopters.

## Members module

Member table: name, email, Discord username **and Discord user ID** (resolved once by the bot on setup — usernames change, IDs don't), current role, **role history** (child table: role, start/end date), lane, notes. Task history + activity timeline come free from primitives.

## Partnerships module (flagship lane)

### Records
- **Partner org**: name, `relationship_type` (sponsor / event partner / social-media partner), tier, industry, warmth, `source` (cold / event / referral / inbound), `round` (fundraising round), renewal date, `benefits_sought[]` multi-select (hiring talent / sponsored events / sponsored project / org funding — auto-suggested from contract embeddings, always human-editable, customizable option set), linked Drive folder, notes. mvp3: `tone` field for outreach style.
- **Contacts**: person, role, email, how met, warmth, lifecycle stage (lead → engaged → champion → dormant), nicknames/aka field (used by Interac fuzzy matching).
- **Touchpoints**: every interaction (email thread, call, event, Discord DM) with date, summary, owner, next action.
- **Deals**: amount, stage (prospect → contacted → call booked → proposal sent → committed → paid → renewal), **allocations** (contract-determined splits, e.g. $3k general / $2k event X), deliverables owed, time-in-stage tracking (stuck deals >X days flagged), round.

### Lightweight partners (important anti-overengineering decision)
Social-media / low-touch partners get minimal treatment: internal owner, contact, social/contact links, notes, occasional event touchpoints. **Do NOT require logging each social repost** — busywork kills adoption. Record exists purely so context survives turnover.

### Deal + lead workflow
1. New deal created → routes to **exec approval** (Approvals primitive).
2. Auto-generated **brief** shown to exec at approval time: WAT.ai-internal partnership history, internal notes, Claude-generated partner background (web search).
3. On approval, exec either (a) toggles visibility so partnership directors can self-request relationship lead, or (b) assigns a lead, who accepts/rejects.
4. Same brief shown to directors at assignment/self-request time (brief "trickles down").
5. Lead transfers: director requests → VP Partnerships approves by default (routable to exec team / specific exec) → transfer executes.

### SLA + priority surfacing
- Days since our reply / days since their non-reply visible on every open thread.
- Color flags: green <3 days, yellow approaching SLA, red breached. Breached/priority items sort to top of dashboard. Priority tag on threads/deals.
- Auto-generated **handoff brief** per relationship for leadership turnover.

### Outreach (human-in-the-loop, deliberately)
- **Human always clicks send.** No auto-sending — reputational + deliverability risk for a student org.
- **Auto-draft is click-triggered, NOT default.** Directors click "generate draft" when they want it. Rationale: builds directors' own sponsorship-writing muscle, and reduces API costs. The AI is an assist, not the default path.
- **Drafts must not sound AI-generated (VERY important).** Three layers:
  1. *Style corpus*: real sent sponsor emails as few-shot examples so drafts match how the team actually writes.
  2. *Banned-patterns list*: no "I hope this finds you well," "I wanted to reach out," "excited to explore synergies," stacked em-dash clauses, etc. Enforced in prompt + post-generation check.
  3. *Specificity by construction*: drafts generated from the relationship record (last touchpoint, benefits sought, the specific ask), so they're concrete, which is most of not sounding generated.
- mvp3: per-partner `tone` (startups: concise/direct or humorous; corporate: professional, friendly-serious, social massaging). Implementation: tone field swaps which style examples are injected. Cheap — can slide earlier if convenient.
- **Sequences** (mvp2): follow-up tasks auto-created at day 3/7/14 if no reply; Gmail sync detects replies and kills the sequence.
- **Templates** (mvp2): e.g. WAT.ai pitch, outreach. Variable slots (`{{company}}`, `{{last_touchpoint}}`, `{{open_asks}}`).
- **Snippets**: canned answers to common sponsor questions (snippets = shorter templates). Snippets can carry attachments **by Drive file ID** so they always resolve to the current file version. ALSO support tracking a **folder** (e.g. "sponsorship tiers" folder → latest file wins) because the file itself can be replaced, not just revised. **All tracked files/tiers are dated** — especially sponsorship materials — so it's always clear whether context is current.

### HubSpot-inspired features adopted
Time-in-stage flags, deal source attribution, snippets, pipeline reports (value by stage, win rate, avg time-to-close, per-round comparison), contact lifecycle stages. **Rejected**: HubSpot-style meeting scheduler and marketing email (Calendly exists; don't spam).

## Events module

- **One Event model** — no separate "sponsored event" type. Core fields: name, date, venue, budget, purchase list, status, progress updates, **event link** (Luma or other), `linked_partnerships[]`, linked Drive folder.
- **Sponsor panel via reuse**: if `linked_partnerships` is non-empty, the event view grows a sponsor panel pulled live from the partnership record (contacts, contract deliverables, comms lead) and the event surfaces at the top of the partnerships dashboard. Sponsor-relevant info on top; everything else in dropdowns/collapsed sections (progressive disclosure — reduce overwhelm). Role slots (sponsor comms, venue, food, custom) = labeled tasks assignable to members.
- **Analytics fields captured from V1**: `signups`, `attendance` (turnout rate = attendance/signups), event type, `promo_methods[]`, `promo_start_date`.
- **Scrape-then-edit**: analytics can be scraped from the event link (Luma API/CSV or page scrape for others) with human edit after. **All analytics fields are always editable — never submit-once-and-done.**
- mvp3: social media post tracking (paste links or auto-detect).

## Finance module

- **Funding requests / receipts**: any director or TPM submits (amount, lane, linked event/project, receipt via Drive) → finance director approves/rejects **with reasoning** (Approvals primitive).
- **Budget ↔ sponsorship linkage**: budget lines reference deal allocations. Dashboard: committed vs. received vs. spent per allocation. Sponsorship money always clearly denoted for its contracted allocation.
- **Interac e-transfer parsing** (mvp2):
  - Parse Interac notification emails from the finance inbox. Source email address is a **configurable field** (it can change). Gmail label/query configurable.
  - Extract: amount, **currency (CAD vs USD, separate field — necessary)**, sender name.
  - **Fuzzy sender matching, two-stage**: org name first, then contact names. Must handle **nicknames vs. legal names** (ETs usually carry full legal name; contacts may go by nicknames — contacts have an aka/nicknames field to match against). ETs can come from a company account or an employee's personal account.
  - Every parsed payment lands as **pending** → one-click human confirmation before touching budget numbers. Never auto-commits.
  - Rejected: bank API sync (no student-accessible Canadian bank APIs; Plaid/Flinks = overkill + trust problem for open-source student tool). Fallback: monthly CSV statement import for reconciliation.

## Projects module

Mirrors the partnerships touchpoint pattern, but with **TPMs as the counterpart** instead of external contacts. Tracked **per project**:

- Project record: name, TPM(s), CM roster, timeline, milestone/deliverable dates (thin version in V1 so timeline data accumulates), status, check-in touchpoints/meeting notes (same touchpoint primitive as partnerships).
- **Deliverable links + artifacts**: writeup links, GitHub repos, Discord message links, press coverage, Drive uploads (photos/videos), etc. Artifacts are a typed-link list on the project record.
- Feeds analytics: project timelines, TPM/CM recruiting success.

## Cross-cutting features

- **Calendar view**: unified — tasks with deadlines + events + calls (Google Calendar sync). Filterable by lane and by person for cross-team visibility. A view over existing data, not new data.
- **Discord bot**:
  - Task follow-up reminders → **per-lane channels** (`discord_channel_id` on lanes table). Default on, per-task mute.
  - Approval requests ping the approver.
  - SLA breach alerts.
  - **Team summary digests → main team channel.** Customizable frequency, default weekly. Driven by the activity log.
- **Drive integration (decision: index, don't migrate)**:
  - Drive stays the source of truth for files (contracts as PDFs, TPM/director/CM application form response sheets, Granola call transcripts/notes pasted into Drive docs). Platform stores links, metadata, dates, and embeddings. Rationale: storage cost, Google's permissions/version history are free, lowest adoption barrier — people already live in Drive.
  - **Folder-linking model**: each partner/event/project record links its Drive folder once via the **Google Picker UI** (native select window — never pasted links, pasting links is explicitly unacceptable UX). System indexes linked folders recursively; new files auto-detected, classified by Claude (contract / call notes / receipt / other), embedded, and **suggested** against the record ("new doc in X folder, looks like call notes from Jul 18 — attach as touchpoint?") with one-click confirm.
  - This solves the watched-folder problem: notes live inside per-sponsor folders, so per-record folder links ARE the watch list. Receipts and contracts flow through the same mechanism.
  - Auto-suggestions from Drive search when typing in a record; Picker as fallback for files outside linked folders.
- **Granola/notes ingest**: new transcript doc in a linked folder → Claude extracts touchpoint summary + action items + facts worth remembering → files against the right partner (confirm-click).
- **Auto-briefs / research briefs / call agendas**: assembled from relationship history + linked-folder embeddings + web search on the company → into **user-customizable templates** (editable markdown with variable slots).

## Analytics (capture fields now, dashboards later)

Principle: dashboards can be built anytime; uncaptured data is gone. Fields above exist from V0/V1; dashboards land mvp2+.

- **Events**: turnout rate (attendance/signups), type, promo methods + timing. Scraped from event link, human-editable, always editable.
- **Projects**: timelines vs. deliverables, TPM/CM recruiting success.
- **Finance**: budget allocation, inflow vs. outflow.
- **Partnerships**: revenue by partner, partner types, round-over-round comparison, source attribution, pipeline metrics.
- mvp3 — **hiring**: which partners hire the most community members / who got hired. `placements` table (member ↔ partner, role, date). Log known placements casually in partner notes starting now for backfill.
- mvp3 — **leadership**: exec/director recruiting success — deliverables, impact, post-WAT.ai outcomes.

## Phasing

- **V0 (weeks 1–2)** — schema for all four primitives INCLUDING analytics fields and full RBAC (admin/exec/director/TPM roles, lanes table), auth (Google OAuth + allowlist), partnerships module (orgs/contacts/touchpoints/deals + pipeline + SLA color flags + priority sort), universal tasks with deadlines, dashboard, Discord bot (reminders + weekly digest), Google Calendar read-sync.
- **V1 (weeks 3–4)** — Drive folder-linking + Picker + embeddings + auto-briefs (promoted to V1: context is the core value prop), approvals primitive wired to deals/leads/funding, events module + calendar view, finance basics (allocations, budget view), Granola/notes ingest, projects module (thin: records, milestones, touchpoints, artifacts).
- **V2 (mvp2)** — Gmail sync + sequences + templates + snippets (incl. dated tier PDF via file-ID/folder tracking), Interac email parsing, Luma import/scrape, metrics dashboards, click-to-generate outreach drafts with style corpus.
- **V3 (mvp3)** — per-partner tone, social post tracking, placements/hiring analytics, leadership analytics, open-source packaging (setup docs, seed data, theming).

## Open-source plan

Build for WAT.ai first, generalize after V2. Lanes/roles are config-driven from day one (the only generalization paid for now). Everything else (docs, seed data, theming) waits for V3.

## Key decisions log (with reasoning)

| Decision | Reasoning |
|---|---|
| Four shared primitives, not per-lane features | Only way the full scope ships in weeks; avoids duplicated code |
| RBAC in V0 with admin role | Cheap to do in schema now, painful migration later; solo-stealth phase just means allowlist of one |
| One Event model with conditional sponsor panel | Reuse over a second entity type; no duplicated sponsor data |
| Lightweight treatment for social partners | Per-repost logging is busywork that kills adoption |
| Human clicks send; drafts click-triggered not default | Deliverability/reputation risk; builds directors' skills; cuts API cost |
| Anti-AI-sounding pipeline (style corpus + banned patterns + record-grounded specificity) | Sponsor-facing writing quality is existential; generic AI email is worse than none |
| Index Drive, don't migrate | Storage, permissions, versioning, adoption all favor Drive as filing cabinet; platform is index + brain |
| Folder-per-record linking via Google Picker | Solves watched-folder problem (notes live in sponsor folders); no pasted links ever |
| Snippet attachments by Drive file ID + optional folder tracking, all dated | Tier PDF changes; must always resolve current version and show currency of context |
| Interac email parsing, pending + human confirm, no bank APIs | Only realistic auto-capture path; mismatch costs a click not a reconciliation |
| Fuzzy ET matching incl. nicknames field | ETs carry legal names; contacts go by nicknames; ETs come from personal or company accounts |
| Analytics fields captured early, dashboards later | Data not captured is unrecoverable |
| Scrape-then-edit for event analytics, always editable | Auto-capture lowers effort; human correction keeps truth; never lock fields |
| Lanes as config table with Discord channel IDs | Free generalization for open source; routing is config not code |
| Discord: task pings per-lane channels, digests in team channel | Matches how the team actually uses the server |
| Metrics via activity log | One log powers timelines, digests, task history, and all future metrics |

## Design ethos (apply to every screen)

- Progressive disclosure: most-urgent/most-relevant on top, detail collapsed.
- One-click confirmations of auto-detected things > manual entry forms.
- Never add a logging chore that a busy student will skip — if adoption requires diligence, redesign.
- Casual, direct microcopy (matches team culture). No enterprise-speak.
- Every AI suggestion links its source. No unsourced facts in sponsor-facing material.
