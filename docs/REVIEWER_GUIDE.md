# Reviewer guide

**Start with the [live demonstration](https://madar-al-bayan.asash263164.chatgpt.site).** No account is required to search. This guide accompanies the deployed v31 review snapshot from **5 October 2026**.

Madar Al Bayan helps a visitor find relevant Islamic reference passages in the visitor's language. The question can be free-form; the answer text remains the publisher's original wording or published translation.

## A two-minute public tour

| Time | Action | What to inspect |
|---|---|---|
| 0:00–0:15 | Open the home page. | A direct question box, English default, nine language choices, and a compact right-side navigation. |
| 0:15–1:00 | Ask **“How should prayer be performed when a person cannot stand?”** | The condition matters: inspect excerpts that explicitly address inability to stand. Open a reference to inspect its provenance. |
| 1:00–1:20 | Return Home and open one of the nine **“What is Islam?”** cards. | Each card links to the publisher's existing edition of the same Hadith. This is a curated multilingual entry point, not a test of free-question understanding. |
| 1:20–1:45 | Open **References**. | Current and planned references are separate. Inspect materials, counts, named languages, and the distinction between publisher catalog size and available text. |
| 1:45–2:00 | Return Home and inspect the corpus statistics. | Counts include published language editions. They do not imply that every possible question is answerable. |

Allow longer for cold requests or publisher delays. For a recorded two-minute presentation, use the [demo script](DEMO_SCRIPT.md); visibly label any shortened waiting interval.

## Questions with observed outcomes

The following are recorded functional observations, not a comprehensive accuracy benchmark. Exact ordering and availability can change with the model and publishers.

| Question | Observed result | What it demonstrates |
|---|---|---|
| **What is Islam?** | HadeethEnc record `4563`, in English. | Bounded introductory lookup and a publisher-specific reading link. |
| **How to pray in Islam?** | HadeethEnc record `10901` and relevant ICADB procedural passages. | Free-question understanding and procedure-focused retrieval. |
| **How do I perform ablution and then pray?** | HadeethEnc record `10901`, with a passage covering both requested acts. | A compound question need not be reduced to one keyword. |
| **How should prayer be performed when a person cannot stand?** | ICADB passages explicitly retaining the inability-to-stand condition. | Qualifier preservation rather than generic topic overlap. |
| **1:1**, with Indonesian or Urdu selected | QuranEnc and Quranpedia published translations. | Exact verse identity and existing translation retrieval; numbers alone do not identify a language. |
| An Internet-speed question mentioning Ramadan, tested in Arabic, English, and French | No accepted religious evidence. | A shared religious word is insufficient to justify an answer. |

The expanded-language run recorded **24 successful functional checks** across nine languages, including definitions, prayer procedure, negative controls, added collections, and exact Quran translations. The final v31 focused run added six scenarios, including the compound and qualifier-sensitive cases above. A separate Arabic compound question about monotheism returned both BinBaz and ICADB sources.

A general Arabic question asking for the meaning of a school of jurisprudence returned no suitable passage. This is a known coverage gap, not evidence that the concept lacks an answer. Short-query language detection and spelling suggestions also remain heuristic.

## Inspecting the implementation

| Review question | Where to look |
|---|---|
| Does AI write the religious answer? | `lib/federated-search.ts` returns evidence with generation disabled. |
| How is intent retained? | `lib/query-understanding.ts` plans search expressions; `lib/context-ranking.ts` judges against the unchanged original question. |
| Can a model invent a quotation or source ID? | `validateRanked` checks known IDs and contiguous source text before output. |
| Are translations generated? | Publisher adapters retrieve existing language editions; output is filtered to the effective language. |
| Can results come from multiple references? | Full-text candidate diversification and publisher interleaving precede contextual acceptance. |
| What happens when nothing suitable is found? | The public flow offers a consent-based referral instead of fabricating an answer. |
| How does the complete workflow fit together? | [Architecture](ARCHITECTURE.md) and [API contract](API.md). |

The model's relevance score is kept server-side. It is not an accuracy percentage, and a literal quote alone is not proof of the model's interpretation. The project makes no claim of universal coverage, scholarly certification, or 100% correctness.

## Optional owner-led administration demonstration

Administration is private. Ask the owner to demonstrate using a clearly marked test message and a mailbox they control; no production credentials or real beneficiary records should be shared with reviewers.

1. Submit a question with email consent and note its `MB-` reference.
2. Open **Administration → Messages → Inbox** and find the reference.
3. Inspect the arrival date, full language name, stored recipient, and question preview.
4. Open the record, write a reply, and optionally save a draft or mark it **Urgent**.
5. Send to the controlled test mailbox, then show **Sent** and the received message. A provider acceptance alone is not proof of mailbox delivery.
6. Open **Analytics** to inspect language participation, frequently asked questions, and activity. These are interaction counts, not a unique-user total.

The interface supports Cc/Bcc and reversible Trash. These controls are operational features, not prerequisites for the public search demonstration. The final v31 search checks did not constitute a new end-to-end mail-delivery test.

## Scope and reproducibility

- **Hosted snapshot:** nine supported languages and nine currently available references, with different roles and coverage. Not all nine are full-text answer engines.
- **Availability caveat:** Byenah uses official saved content for seven editions when live access is blocked. Dorar is placed in planned references following blocked production access; it is not counted as currently available.
- **Corpus scale:** the hosted metadata records 77,806 text records, including published translations. Publisher-wide catalog totals are a different measure and must not be added to that figure.
- **Public repository:** implementation, engineering documentation, and release checks. The production corpus, credentials, and user database are excluded.
- **Independent operation:** requires provisioning permitted source data, configuring the runtime and database, and obtaining access to the configured model. A clean clone does not inherit the hosted deployment's data or service entitlements.

For assessment, distinguish three kinds of evidence: code-level contracts, controlled functional checks, and observed live behavior. None is a substitute for a larger multilingual relevance evaluation and qualified subject-matter review.
