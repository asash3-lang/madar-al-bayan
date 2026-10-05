# Implemented feature inventory

This inventory connects the product experience to its implementation. It describes the hosted v31 reference release and the corresponding public source package, reviewed on **5 October 2026**. The [evaluation record](EVALUATION.md) distinguishes controlled tests, observed live behavior and remaining verification limits.

## A simple multilingual visitor experience

| Feature | What it provides | Implementation |
| :--- | :--- | :--- |
| English default | A normal first visit opens in English; explicit language links can select another language | [`app/page.tsx`](../app/page.tsx) |
| Nine supported languages | Arabic, English, French, Spanish, Chinese, Hindi, Persian, Indonesian and Urdu | [`i18n.ts`](../lib/i18n.ts), [coverage tables](LANGUAGES.md) |
| Automatic question-language detection | Uses script rules, language clues and statistical identification; no prior menu selection is required for recognized input | [`detect-language.ts`](../lib/detect-language.ts) |
| A search action that follows the input | The Search label changes with the detected supported language while typing | [`app/page.tsx`](../app/page.tsx) |
| Short input accepted | The form accepts 1–1,000 characters; accepting a short query does not guarantee a useful match | [`app/page.tsx`](../app/page.tsx), [`API.md`](API.md) |
| Correction with immediate search | Clicking a proposed spelling correction submits the corrected question directly | [`search-suggestions.ts`](../lib/search-suggestions.ts), [`app/page.tsx`](../app/page.tsx) |
| Nine introductory cards | A consistent three-column layout links “What is Islam?” to the publisher's corresponding language edition | [`islam-language-links.tsx`](../components/islam-language-links.tsx), [`simple.css`](../app/simple.css) |
| Persistent right-side navigation | Home, References, Contact us and Administration remain accessible through an expandable or compact English navigation rail | [`site-shell.tsx`](../components/site-shell.tsx) |
| Responsive reading direction | Arabic, Persian and Urdu use right-to-left presentation; source passages retain their language and direction | [`i18n.ts`](../lib/i18n.ts), [`app/page.tsx`](../app/page.tsx) |
| Keyboard and status affordances | Includes a skip link, labeled controls, focusable message rows and live loading/error announcements | [`site-shell.tsx`](../components/site-shell.tsx), [`admin-workspace.tsx`](../components/admin-workspace.tsx) |
| Contact channel | Requires email or phone; name and message are optional; a successful submission returns a reference | [`contact-form.tsx`](../components/contact-form.tsx) |
| Footer and ownership | Shows project copyright, publisher ownership of reference material and a contact link | [`site-shell.tsx`](../components/site-shell.tsx) |

Language detection and spelling suggestions remain heuristic. The accessibility affordances listed here are implemented controls, not a claim of a completed accessibility certification.

## Evidence that remains traceable

| Feature | What it provides | Implementation |
| :--- | :--- | :--- |
| Intent understanding before retrieval | Astra identifies the request, conditions and useful same-language search expressions | [`query-understanding.ts`](../lib/query-understanding.ts) |
| Search across approved references | Combines full-text indexes and publisher adapters, with capabilities varying by source | [`federated-search.ts`](../lib/federated-search.ts), [`publisher-adapters.ts`](../lib/publisher-adapters.ts) |
| Context assessment before display | Astra compares retrieved passages with the original question and can retain complementary answers to requested parts | [`context-ranking.ts`](../lib/context-ranking.ts) |
| Literal quotation checks | Displayed excerpts must match a supplied source field and retain a known record identity | [`context-ranking.ts`](../lib/context-ranking.ts) |
| Same-language published answers | Retrieves publisher translations rather than generating a new translation of religious content | [`answer-service.ts`](../lib/answer-service.ts), [AI design](AI_DESIGN.md) |
| Relevance ordering | Shows selected passages in relevance order without presenting the internal score as an accuracy percentage | [`context-ranking.ts`](../lib/context-ranking.ts), [`app/page.tsx`](../app/page.tsx) |
| Exact topic and verse lookup | Known introductory topics and verse references can take a direct publisher path | [`direct-topics.ts`](../lib/direct-topics.ts), [`quran-search.ts`](../lib/quran-search.ts) |
| Source detail panel | Shows full source text, available explanation, attribution, references and retrieval information | [`app/page.tsx`](../app/page.tsx), [`source-references.tsx`](../components/source-references.tsx) |
| Record-specific links | Uses an approved reading link or official data response; does not substitute a publisher homepage for an exact citation | [`source-links.ts`](../lib/source-links.ts) |
| Copyable results | Copies the question, displayed excerpts and available source URLs | [`app/page.tsx`](../app/page.tsx) |
| Quran recitation | Loads an original MP3Quran surah recording in applicable Quran source details | [`recitation.tsx`](../components/recitation.tsx) |
| Live and saved source provenance | Records whether content came from a live provider or a saved official edition | [`types.ts`](../lib/types.ts), [`publisher-assets.ts`](../lib/publisher-assets.ts) |
| Bilingual reference directory | Numbered Arabic-and-English rows show materials, collection size, named languages and separate current/upcoming references | [`resource-catalog.tsx`](../components/resource-catalog.tsx) |
| Searchable references | Filters the directory by reference name, material or language | [`resource-catalog.tsx`](../components/resource-catalog.tsx) |
| Public collection statistics | English home-page figures and detailed reference tables distinguish local text records from publisher catalog totals | [`library-overview.tsx`](../components/library-overview.tsx), [source inventory](SOURCES.md) |
| Publisher article catalog API | Exposes bounded IslamHouse article pages, original links and available attachment metadata | [`publisher-library/route.ts`](../app/api/publisher-library/route.ts) |

Some references supply commentary, audio or catalog metadata rather than a general answer bank. The [source directory](SOURCES.md) records these differences and the limits of each connection.

## Human follow-up and administration

| Feature | What it provides | Implementation |
| :--- | :--- | :--- |
| Unanswered-question referral | Offers voluntary review with required email and consent when suitable evidence is unavailable | [`referral-form.tsx`](../components/referral-form.tsx) |
| Numbered correspondence | Associates questions and contact messages with a stable reference and timestamps | [`message-store.ts`](../lib/message-store.ts) |
| Inbox and Sent | Separates incoming work from recorded sent replies; displays the newest items first | [`admin-workspace.tsx`](../components/admin-workspace.tsx) |
| Preview and full details | Supports row preview, full enquiry, stored recipient and the questioner's full language name | [`admin-workspace.tsx`](../components/admin-workspace.tsx), [`message-labels.ts`](../lib/message-labels.ts) |
| Search and prioritization | Finds earlier correspondence and marks important messages Urgent | [`inbox/route.ts`](../app/api/admin/inbox/route.ts), [`admin-workspace.tsx`](../components/admin-workspace.tsx) |
| Draft and send | Saves a reply or sends it to the stored recipient without requiring contact details again | [`referrals.ts`](../lib/referrals.ts) |
| Additional copies | Validates optional Cc/Bcc addresses and retains them with the reply | [`mail-recipients.ts`](../lib/mail-recipients.ts) |
| Localized email templates | Formats the question, human-written answer and reference in an appropriate language wrapper | [`reply-email.ts`](../lib/reply-email.ts) |
| Reversible deletion | Moves messages to Trash with a restore option | [`admin-workspace.tsx`](../components/admin-workspace.tsx) |
| Private analytics | Summarizes searches, result outcomes, languages, repeated questions, correspondence and dated activity | [`admin-analytics.tsx`](../components/admin-analytics.tsx), [`search-analytics.ts`](../lib/search-analytics.ts) |

The [administration guide](ADMINISTRATION.md) explains responsibilities and the complete visitor-to-reply flow. The [email guide](EMAIL_AND_SERVICES.md) distinguishes a saved request, an accepted email and confirmed mailbox receipt.

## Delivery, deployment and reproducibility

| Capability | Implemented scope | Supporting material |
| :--- | :--- | :--- |
| Cloudflare runtime and storage | Worker routes, D1 persistence and server-side configuration | [Architecture](ARCHITECTURE.md), [Deployment](DEPLOYMENT.md) |
| Protected administration | Password hashing, expiring server-backed sessions and login throttling | [`admin-auth.ts`](../lib/admin-auth.ts) |
| Write validation | Origin checks, bounded input and route-level authorization | [`request-validation.ts`](../lib/request-validation.ts), [API contract](API.md) |
| Bounded search recovery | One retry for selected transient search failures; mutations do not share this retry helper | [`search-client.ts`](../lib/search-client.ts) |
| Duplicate-send controls | Durable send claim, saved reply revision and Resend idempotency key | [`referrals.ts`](../lib/referrals.ts) |
| Public source release | Application, migrations, documentation and sanitized evidence; excludes private production records and publisher corpora | [Getting started](GETTING_STARTED.md), [third-party notices](../THIRD_PARTY_NOTICES.md) |
| Official starter importer | Prepares a small nine-language collection with record checks and provenance | [`bootstrap-sources.mjs`](../scripts/bootstrap-sources.mjs) |
| Independent hosting preparation | Generates a Cloudflare deployment configuration; other runtimes require adaptation | [`prepare-cloudflare.mjs`](../scripts/prepare-cloudflare.mjs), [Deployment](DEPLOYMENT.md) |
| Reproducible checks | Typecheck, controlled contracts, build and a public-release boundary check | [Evaluation](EVALUATION.md), [quality workflow](../.github/workflows/quality.yml) |

These implementation details do not constitute a complete security audit, a measured universal accuracy rate or a successful deployment on every hosting platform. Proposed references, languages and engineering improvements are recorded separately in [Sources](SOURCES.md), [Languages](LANGUAGES.md) and [Roadmap](ROADMAP.md).
