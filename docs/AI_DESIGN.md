# AI design: understanding before retrieval, verification before display

The central AI contribution in Madar Al Bayan is **context-sensitive access to existing knowledge**. The system interprets a multilingual question, searches approved material, and checks whether a retrieved passage actually addresses the request. The displayed religious evidence remains the publisher's original text or published translation.

The reference deployment uses **OpenAI Astra (`gpt-6-astra`)** through the Responses API. This documents the model configured and exercised in the recorded deployment, not a guarantee that this model ID is available to every API account. Independent deployments set a compatible model through `OPENAI_MODEL` and re-evaluate its behavior.

## The two natural-language processing (NLP) stages

| Stage | Input | Model responsibility | Output used by the application |
|:---|:---|:---|:---|
| **1. Understand the question** | Original question and detected language | Identify the intent, requested action, entities, scope, conditions and negation; distinguish general education from a personal case needing review | Strict JSON with an intent description, one to three search expressions in the same language, and a review flag |
| **2. Assess retrieved evidence** | The unchanged original question plus a bounded set of publisher candidates and their metadata | Determine whether each passage answers the question or a substantive requested part while respecting its conditions; select a literal excerpt and order relevant material | Strict JSON with known record IDs, relevance ordering, condition checks, excerpt field and review flag |

The first stage does **not** produce an answer. The second stage does **not** make its own prose into source material. A separate deterministic validator checks the model's output against the actual supplied records before the visitor sees it.

[View the complete illustrated question journey](assets/question-to-answer.svg), including all nine languages, the nine-reference network, both Astra NLP stages, the source-validation gate and human follow-up.


The illustration shows the logical sequence. In the implementation, initial retrieval overlaps with the first model request to reduce waiting. Refined retrieval follows the returned search plan. The final evidence check always receives the **original question**, so a useful paraphrase cannot silently redefine what the user asked.

## Stage 1 in the code

[`understandQuestion`](../lib/query-understanding.ts) calls `POST /v1/responses` with a strict JSON schema. For supported reasoning-model configurations, it uses a low reasoning effort, a 20-second deadline and a bounded output budget. The prompt explicitly preserves conditions and negation and asks for search expressions in the question's language.

For example, “How should prayer be performed when a person cannot stand?” must retain the inability-to-stand condition. A generic search for the virtues of prayer would lose the user's actual need. Similarly, an internet-speed question containing “Ramadan” does not become a religious question merely because one word matches the corpus.

The plan can mark a case for review, but the system does not treat every question about worship or belief as a personal ruling. Successful plans are cached briefly in process memory. Failure is handled as unavailable planning; it is not reported as a successful model decision.

## Retrieval between the stages

[`federated-search.ts`](../lib/federated-search.ts) combines initial candidates, refined queries, Quran lookup and appropriate publisher adapters. Full-text search uses normalized terms and a BM25-style lexical index. Candidate allocation preserves opportunities for different indexed publishers before the final cutoff.

This is **not an embedding-vector database implementation**, and no separate custom religious model was trained for this release. The meaningful semantic step comes from the model inspecting the original question and actual candidate passages. The model cannot discover an arbitrary website or add a new publisher; source adapters and approved hosts define the access boundary.

## Stage 2 and the final code gate

[`rankByContext`](../lib/context-ranking.ts) uses the same configured model with high reasoning effort for supported reasoning-model configurations. Input is bounded to at most sixteen candidate records and a total text budget. The response is parsed against a strict structured-output schema.

The validator then enforces:

1. The source ID must belong to the provided candidate set.
2. The selected field must be a known publisher text or explanation field.
3. The entire selected quote must occur verbatim in that field.
4. A Quran result must retain the complete provided verse text.
5. A passage must meet the configured relevance threshold and condition flags.
6. Accepted results are ordered by relevance, deduplicated by source ID and limited to five.

The current internal thresholds are 85 for ordinary passages and 95 for Quran passages. These are **selection thresholds, not calibrated correctness probabilities**. They are hidden from visitors. Complementary passages may address separate requested parts; each passage need not repeat the whole answer.

## What counts as AI, and what does not

| Component | Classification | Role in this project |
|:---|:---|:---|
| Astra question understanding | Model inference | Interprets intent and proposes same-language search expressions |
| Astra evidence assessment | Model inference | Checks contextual relevance and conditions over retrieved text |
| Script rules and `franc` | Rules plus statistical language identification | Chooses the supported language before searching; short or ambiguous questions remain a limitation |
| Full-text index and query normalization | Information-retrieval algorithms | Finds candidate publisher records; does not independently prove meaning |
| Literal validation, host allowlist and schema checks | Deterministic code | Rejects fabricated quotations, unknown IDs and invalid structures |
| Correction suggestions | Lexical heuristics | Suggests likely search wording; suggestions can be wrong and are not scholarly answers |
| Review inbox and Resend | Human workflow and delivery infrastructure | Stores questions and sends administrator-written replies |
| ChatGPT / Codex development assistance | Development-time AI tools | Assisted implementation, troubleshooting, documentation and verification under the project owner’s direction; these are not additional runtime answer models |

Exact introductory topics, exact source titles and verse-addressed requests can use direct lookup paths. Their success demonstrates source access, not unrestricted model reasoning. The recorded tests distinguish these paths.

## Development assistance and authorship

The project is authored and owned by **Abdullah bin Saeed Al-Malki**. AI-assisted development tools helped prepare and review implementation and documentation. They are described as tools, not as additional human project members or scholarly reviewers. No model training on a custom religious dataset is claimed.

## Data handling and failure behavior

Model requests use `store:false`; the code does not attach a review recipient's email address to the question-understanding or ranking inputs. Questions and selected source passages still leave the application for the configured model provider. `store:false` alone must not be described as a complete zero-retention agreement; deployment privacy depends on provider settings and terms.

Malformed, incomplete, refused or unavailable model output cannot supply a fabricated answer. Missing evidence results in an insufficient-evidence state or an eligible human-review path. The system is designed to reduce unsupported answers, but it does not guarantee perfect relevance, theological completeness or automatic scholarly approval.

## How AI can develop the platform further

The next improvements should be measured on a multilingual evaluation set: intent-sensitive recall, coverage of conditional questions, helpful abstention, per-language quality and duplicate suppression. Embedding retrieval or additional rerankers may be evaluated as future experiments; they are not claimed as implemented. Improvements should preserve source identity, publisher wording and the separation between model judgment and human review.

See [Evaluation](EVALUATION.md) for actual observations and [Roadmap](ROADMAP.md) for proposed milestones.

## Technical references

- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs): schema-constrained responses help the application parse model decisions; a valid schema does not establish factual correctness.
- [OpenAI reasoning models](https://developers.openai.com/api/docs/guides/reasoning): reasoning controls are used only for compatible configured model families.
- Local implementation: [`query-understanding.ts`](../lib/query-understanding.ts), [`context-ranking.ts`](../lib/context-ranking.ts), [`federated-search.ts`](../lib/federated-search.ts), [`detect-language.ts`](../lib/detect-language.ts).
