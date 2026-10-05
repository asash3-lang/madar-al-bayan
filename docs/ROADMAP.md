# Roadmap

These are proposed engineering milestones, not shipped features or delivery promises. Progress should be measured by evidence, not by the number of publishers or languages listed in a menu.

| Priority | Outcome | Completion evidence |
|:---|:---|:---|
| 1. Measure relevance | Build a multilingual evaluation set with condition-sensitive, ambiguous, out-of-scope and no-answer questions | Versioned questions, expected source references, independent review, per-language retrieval and abstention metrics |
| 2. Close demonstrated gaps | Improve recall where a relevant published answer exists but was not retrieved | A documented failed case becomes a reproducible passing case without admitting unrelated passages |
| 3. Expand verified content | Add substantial language editions and references with usable access and clear terms | Publisher identity, rights/provenance record, language-level counts, exact links and successful end-to-end samples |
| 4. Improve clarity and latency | Reduce duplicate excerpts and unnecessary provider work | Dated before/after latency measurements and relevance-preserving regression results |
| 5. Strengthen operations | Mature review queues, retention controls, delivery monitoring and recovery | Documented access tests, delivery-status handling, restore exercise and privacy review |

Adding a language requires source material, detection, script direction, interface labels, source links, review messages and email templates to work together. A language selector alone is not sufficient.

The content plan is explicit: [25 candidate reference entries](SOURCES.md#planned-reference-directory) and [11 shortlisted languages](LANGUAGES.md#planned-language-shortlist), kept separate from the nine current references and nine supported languages. Publisher collections can overlap, so expansion entries must not be presented as distinct integrated organizations.

Future context-model changes should be evaluated against the same versioned questions. A larger model or a stricter score threshold is not by itself evidence of better retrieval.
