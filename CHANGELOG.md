# Changelog

## Public source release — 2026-10-05

Derived from deployed application **v31**, source commit `097ec04cb1781f38887cb9bb74700672729da460`.

### Product represented by this release

- Nine-language question entry and automatic language detection, with English as the default interface.
- Intent understanding before free-text retrieval and a separate semantic evidence check.
- Full-text candidate retrieval and complementary results from approved publishers.
- Publisher-original excerpts, source attribution and exact source-link handling.
- Human-review submission, administrator mailboxes, reply workflow and analytics.
- A consistent three-column layout for the nine introductory language cards.
- Verified reference and language metadata; publisher catalog totals distinguished from the saved collection.

### Public distribution changes

- English reviewer, architecture, API, setup, source, language and evaluation documentation.
- Publisher corpora, production databases, runtime secrets and deployment-specific identity excluded.
- A small optional official-source bootstrap, with local counts distinct from production statistics.
- Configurable local administrator identity and an explicit server-only configuration template.
- Original-code license, third-party notices and contribution/security guidance.

The public distribution adapts setup and data packaging for an independent clone. It is not a dump of the production database or an identical deployment artifact. Recorded live evaluations identify their own deployed version; local release checks are reported separately.
