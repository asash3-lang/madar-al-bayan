# Evaluation & Evidence

Madar Al Bayan is evaluated on **retrieval behavior, source fidelity, language consistency, and appropriate abstention**. A successful HTTP response is not sufficient, and an empty answer is not automatically a failure: the expected behavior depends on whether relevant evidence exists.

This release includes sanitized summaries of developer-authored tests against the reference deployment on **5 October 2026**. It does not contain visitor question logs, personal contact details, administrator records, or raw publisher passages.

## Evidence at a glance

| Evaluation | Observed result | Interpretation |
| :--- | :--- | :--- |
| Version 30 multilingual live regression | **24 of 24 selected checks passed** | Nine introductory definitions, nine free-form prayer questions, two irrelevant-question controls, two newly added Arabic collection cases, and two Quran translation lookups |
| Version 31 focused live review | **4 found; 2 insufficient** | Four cases produced source passages. One irrelevant query was rejected. One legitimate definition question exposed a remaining coverage gap |
| Final provider health snapshot | Eight current publishers had HTTP 200 sample probes; Byenah used saved editions | Connectivity was observed for selected records, not guaranteed for every endpoint or item |
| Source text identity | Literal-excerpt and source-language checks recorded | Returned quotations were checked against their fetched publisher fields; this is distinct from proving theological completeness |

The two live batches are reported separately because they ran on different deployed versions and tested different changes. **24/24 is not an accuracy estimate for arbitrary questions, a held-out benchmark, or scholarly certification.**

## Version 30: multilingual regression

| Case family | Cases | Expected behavior | Recorded outcome |
| :--- | ---: | :--- | :--- |
| Introductory definition | 9 | Return the identified published introductory hadith in the requested language | 9 passed; exact topic route |
| Free-form prayer procedure | 9 | Retrieve published procedural content in the question's language | 9 passed; Astra query understanding and semantic passage selection |
| Irrelevant internet-speed question mentioning Ramadan | 2 | Reject incidental keyword overlap | 2 passed; insufficient evidence |
| Added Arabic ICADB and Ibn Baz material | 2 | Retrieve the newly available collection records | 2 passed |
| Indonesian and Urdu Quran lookup | 2 | Return the requested verse in its published translation | 2 passed |

The nine-language set was Arabic, English, French, Spanish, Chinese, Hindi, Persian, Indonesian, and Urdu. Introductory definitions used an explicit topic-to-record path; they should not be presented as proof that a model understood unrestricted questions. The procedural cases exercised the deployed semantic path.

[Machine-readable version 30 summary](evidence/live-v30.json)

## Version 31: focused semantic and connection review

| Test case | Language | Outcome | What the observation establishes |
| :--- | :--- | :--- | :--- |
| Combined ablution and prayer procedure | English | Found | A relevant published procedure was retained for the compound request |
| Meaning of the testimony of faith and its evidence | Arabic | Found | Returned passages from both Ibn Baz and ICADB, demonstrating multi-publisher selection in this case |
| Prayer when a person cannot stand | English | Found | Retrieved ICADB passages addressing the inability-to-stand condition |
| Internet speed during Ramadan | French | Insufficient | Did not display unrelated religious material solely because the question mentioned Ramadan |
| Definition of a jurisprudential school | Arabic | Insufficient | **Open coverage gap:** a legitimate educational question did not receive an adequate source passage |
| Al-Sa'di commentary at `1:1` | Arabic | Found | The exact Surah commentary record was retrieved successfully |

The recorded requests returned HTTP 200 and reported literal-excerpt/language consistency. The legitimate definition gap remains visible in the evidence rather than being counted as successful answer coverage.

[Machine-readable version 31 summary](evidence/live-v31.json)

## Acceptance principles

1. **Identity:** every accepted passage refers to a known returned publisher record.
2. **Fidelity:** an excerpt must occur in the original source field. A model-authored paraphrase is not substituted for evidence.
3. **Language:** source text must match the selected or detected answer language.
4. **Relevance:** the passage must answer the actual question or a substantive requested part; a shared word is insufficient.
5. **Conditions:** negation, qualifications, and exceptions must remain applicable. A generic standing-prayer instruction cannot answer an inability-to-stand question.
6. **Complementarity:** different relevant passages may cover different parts of a question. Each passage need not independently answer every subquestion.
7. **Abstention:** missing or unsuitable evidence must not be replaced with a fabricated answer. Cases requiring individual review can enter the review workflow.

Internal relevance scores prioritize passages and are hidden from visitors. They are ranking signals, not calibrated probabilities of religious correctness.

## Reproducing checks

The repository retains focused test scripts under [`scripts/`](../scripts/). There are three distinct test classes:

| Class | Examples | Requirements |
| :--- | :--- | :--- |
| Controlled contracts | `check-context-model.mjs`, `check-publisher-integrations.mjs` | Installed dependencies; model and publisher responses are controlled fixtures |
| Corpus-backed checks | `check-expanded-library.mjs`, `check-reference-presentation.mjs` | The corresponding publisher corpus and derived assets, acquired under applicable terms; intentionally absent from this public release |
| Live checks | The batches summarized above | A configured deployment, working provider access, and model credentials; results can change over time |

Run controlled checks from the repository root after completing the [setup guide](GETTING_STARTED.md):

```bash
node scripts/check-context-model.mjs
node scripts/check-publisher-integrations.mjs
```

A passing mocked contract test does not establish live provider availability. Conversely, a live provider probe does not validate all search or review workflows. Public-release build and verification instructions are documented in the setup guide; the historical deployment results above must not be presented as tests run on a data-free clone.

## Known limits and next evaluation work

- These are a small, developer-selected sample, not a statistically representative or independently annotated benchmark.
- Language availability is unequal, especially for Chinese and Hindi explanation fields.
- Quranpedia coverage was sampled by verse; IslamHouse search is bounded to a recent article page; Byenah currently depends on seven saved editions.
- A correct literal quotation can still be incomplete for a question. Source fidelity and substantive relevance require separate evaluation.
- Context models can misinterpret intent. More evidence is needed across paraphrases, negation, ambiguous short inputs, doctrinal terminology, and compound questions.
- Provider outages, changed editions, model changes, and expired access can affect reproducibility.

The next evaluation milestone is a versioned, independently reviewed multilingual question set with expected source references, no-answer cases, conditional questions, and per-language retrieval and abstention measurements. Until then, the project reports its observed evidence and limitations explicitly.

## Public distribution verification

[Release preparation checks](evidence/public-release-checks.json) record the separate public-package run: TypeScript and build passed, 13 search-client and 10 context-model controlled checks passed, alongside an independent-host identity-boundary check, and the official starter imported 54 unchanged text records across nine languages. The starter identity/index/retrieval smoke check also passed.

The local Worker HTTP start was blocked by network-interface enumeration in the preparation environment. It is recorded as unverified, not counted as an end-to-end pass. The preparation checks used the available pinned dependency tree.

After publication, [GitHub Actions run 37287759221](https://github.com/asash3-lang/madar-al-bayan/actions/runs/37287759221) passed on a fresh Ubuntu runner with Node.js 22, at commit `1f98b739911faf348e0a46fc24be2cb118573d76`. The run installed locked dependencies, checked types and controlled contracts, built the source release, and checked public-release boundaries. This verifies clean CI installation and building; it does not establish live publisher access, email delivery, or browser end-to-end behavior.
