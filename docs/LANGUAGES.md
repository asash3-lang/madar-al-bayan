# Language Coverage

**Nine languages are enabled: Arabic, English, French, Spanish, Chinese, Hindi, Persian, Indonesian, and Urdu.** English is the default interface language. Visitors can write in a supported language without first changing the language selector.

The system detects the question's language and retrieves text published in that language. It does not silently substitute Arabic for an unavailable translation, and it does not use machine translation to manufacture a religious answer.

## Verified reference-deployment collection

Counts below were verified on **5 October 2026**. They describe the deployed publisher editions, not files bundled with this public code release.

| Language | Code | Reading direction | Hadith texts | Nonempty explanations | Quran verse texts |
| :--- | :---: | :---: | ---: | ---: | ---: |
| Arabic | `ar` | Right to left | 3,582 | 3,582 | 6,236 |
| English | `en` | Left to right | 2,328 | 2,328 | 6,236 |
| French | `fr` | Left to right | 1,790 | 1,790 | 6,236 |
| Spanish | `es` | Left to right | 1,955 | 1,944 | 6,236 |
| Chinese | `zh` | Left to right | 2,256 | 680 | 6,236 |
| Hindi | `hi` | Left to right | 2,314 | 1,325 | 6,236 |
| Persian | `fa` | Right to left | 2,275 | 2,275 | 6,236 |
| Indonesian | `id` | Left to right | 2,260 | 2,254 | 6,236 |
| Urdu | `ur` | Right to left | 2,220 | 2,215 | 6,236 |
| **Total** | **9** | | **20,980** | **18,393** | **56,124** |

An explanation is a field accompanying a hadith record, not another unique hadith. A nonempty explanation count measures availability, not an independent scholarly review of that explanation. The 6,236 records in each non-Arabic Quran column are a publisher's translation of meanings; the Arabic column is the Quranic original.

## Selected Quran translation editions

| Language | Publisher edition key | Recorded version | Published translation |
| :--- | :--- | :--- | :--- |
| English | `english_rwwad` | `1.0.19` | Rowwad Translation Center |
| French | `french_rashid` | `1.0.3` | Rachid Maach |
| Spanish | `spanish_garcia` | `1.0.2` | Isa Garcia |
| Chinese | `chinese_suliman` | `1.0.8` | Muhammad Suleiman |
| Hindi | `hindi_omari` | `1.1.5` | Azizul Haq Al-Omari |
| Persian | `persian_ih` | `1.1.3` | Rowwad Translation Center |
| Indonesian | `indonesian_sabiq` | `1.1.3` | Sabiq Company |
| Urdu | `urdu_junagarhi` | `1.1.3` | Muhammad Junagarhi |

The edition keys, publishers, and versions matter. Refreshing a translation must preserve its attribution and update its provenance; a language code alone does not identify a translation.

## Coverage by capability

| Capability | Available languages | Boundary |
| :--- | :--- | :--- |
| HadeethEnc saved texts and live retrieval | All nine named above | Text and explanation coverage differ by language |
| QuranEnc Arabic and eight translations | All nine | One selected published translation per non-Arabic language |
| Quranpedia verse lookup | All nine verified at the sampled verse | Returned editions and coverage depend on the verse |
| ICADB book-passage search | All nine | Translations vary by item; availability does not establish relevance |
| ICADB approved saved cards | Arabic | 601 cards: 543 questions and answers plus 58 terms |
| Ibn Baz saved answers | Arabic | 101 selected answers |
| Byenah saved introductory work | Arabic, English, French, Spanish, Chinese, Hindi, Persian | Indonesian and Urdu editions are not claimed |
| Surah commentary | Arabic | Al-Sa'di commentary at a specified verse |
| IslamHouse article catalog | All nine | Metadata and attachments; full text only when the publisher supplies it |
| Quran audio player | Arabic recitation; Arabic or English player information | Translated catalog labels are not translated Quran recitation |

## Language behavior

The question's detected language guides search and the search action label. Script detection, language clues, and text analysis support this behavior. Very short or shared-script inputs can be ambiguous, particularly between Arabic, Persian, and Urdu; a visible language choice remains useful in those cases.

Each candidate must have the expected source language. For languages with fewer explanations, the system searches available source text instead of assuming a missing explanation exists. If no suitable passage survives validation, it returns an insufficient-evidence state and offers the review workflow. A source language being enabled never means every question can be answered.

For human review, the administration interface records the questioner's language explicitly. A reviewer should answer in that language. Interface translation, publisher translation, and a human-written reply are three separate things.

## Adding another language

Enable a language only after verifying a substantive publisher collection in that language, preserving edition and rights information, importing permitted source assets, and testing the complete question-to-source flow. Then extend detection, script direction, UI labels, source links, review messages, and email templates together.

The publisher-wide extra language counts in [Sources & Provenance](SOURCES.md) are an expansion opportunity, not a claim that those languages are already supported.

## Planned language shortlist

The product's current expansion shortlist contains **11 languages**. The counts below come from the recorded HadeethEnc language catalog in [`publisher-languages.json`](../lib/publisher-languages.json), selected by [`catalog-presentation.ts`](../lib/catalog-presentation.ts). They describe publisher availability recorded for planning, not an imported project collection or a successful end-to-end language test.

| Candidate language | Code | Recorded publisher hadith count | Project status |
| :--- | :---: | ---: | :--- |
| Bosnian | `bs` | 2,326 | Planned |
| Russian | `ru` | 2,249 | Planned |
| Turkish | `tr` | 2,150 | Planned |
| Tagalog | `tl` | 1,949 | Planned |
| Kurdish | `ku` | 1,938 | Planned |
| Bengali | `bn` | 1,925 | Planned |
| Hausa | `ha` | 1,753 | Planned |
| Portuguese | `pt` | 1,382 | Planned |
| Sinhala | `si` | 1,318 | Planned |
| Vietnamese | `vi` | 1,203 | Planned |
| Uyghur | `ug` | 1,096 | Planned |

These counts are not added to the current 77,806 text records. Each candidate still needs updated source verification, permitted content preparation, language detection, interface and email coverage, and contextual retrieval testing before activation. The planning list is not a delivery commitment.

See [the recorded inventory](evidence/source-inventory.json) and [the nine-language live evaluation](EVALUATION.md).
