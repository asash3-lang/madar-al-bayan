# Sources & Provenance

Madar Al Bayan retrieves published material from an explicit source allowlist. A model can help interpret a question and select a passage; it cannot add a publisher, invent a reference, or replace a missing passage with a generated religious answer.

This document describes the **reference deployment verified on 5 October 2026**. The public repository contains application code, connectors, metadata, and evaluation summaries. It does **not** redistribute the deployment's third-party text corpus or search indexes.

## Read the numbers correctly

| Measure | Verified count | What it measures |
| :--- | ---: | :--- |
| Publisher text records | **77,806** | The deployment's original texts and published translations; not unique works |
| Hadith text records | 20,980 | 3,582 distinct hadith IDs across nine language editions |
| Quran verse-text records | 56,124 | 6,236 verses in Arabic and eight published translations |
| Published questions and answers | 644 | 543 approved Arabic ICADB cards and 101 Arabic Ibn Baz answers |
| Terminology cards | 58 | Approved Arabic ICADB terminology cards |
| Nonempty hadith explanations | 18,393 | Accompanying explanation fields; **not added again** to 77,806 |
| Current references | **9** | Publishers with a usable capability in the deployed product; capabilities differ |

The text-record total is **20,980 + 56,124 + 644 + 58 = 77,806**. It excludes live-only results, audio recordings, IslamHouse catalog entries, and the separate Byenah work. Translation editions count as language-specific records; they are not additional unique hadith or Quran verses.

## Current reference coverage

| # | Publisher | Available capability | Verified size and scope | Languages used by the project |
| ---: | :--- | :--- | :--- | :--- |
| 1 | [HadeethEnc](https://hadeethenc.com/) | Hadith text, explanation, grading, bibliography, and published translations; live retrieval with official saved editions | 3,582 distinct hadith; 20,980 language-specific texts; 18,393 nonempty explanations | Arabic, English, French, Spanish, Chinese, Hindi, Persian, Indonesian, Urdu |
| 2 | [QuranEnc](https://quranenc.com/) | Quranic text and published translations of its meanings, with edition metadata and notes | 56,124 verse-text records: 6,236 verses across Arabic plus eight translations; 114 surahs | Arabic, English, French, Spanish, Chinese, Hindi, Persian, Indonesian, Urdu |
| 3 | [ICADB](https://icadb.com/) | Live retrieval of book passages and their published translations; approved Arabic cards in the deployment's saved corpus | 601 approved cards: 543 questions and answers, 58 terms. Live book passages are additional and uncounted | Arabic, English, French, Spanish, Chinese, Hindi, Persian, Indonesian, Urdu; saved cards are Arabic |
| 4 | [Quranpedia](https://quranpedia.net/) | Verse-addressed Quranic text, commentary, and published translations | Publisher catalog: 142 translation editions. A live verse sample was verified in all nine project languages; entire editions were not audited | Arabic, English, French, Spanish, Chinese, Hindi, Persian, Indonesian, Urdu; availability varies by verse and edition |
| 5 | [Surah](https://surahapp.com/) | Al-Sa'di's commentary at an exact surah and verse | One commentary in the current connector; exact reference `1:1` verified after the timeout adjustment | Arabic |
| 6 | [Byenah](https://byenah.com/) | One introductory work available through official saved language editions | One work, seven saved editions. Live API returned HTTP 403 at the final deployment check | Arabic, English, French, Spanish, Chinese, Hindi, Persian |
| 7 | [MP3Quran](https://mp3quran.net/) | Original Quran recitations through publisher-hosted recording URLs | Player covers 114 surahs. Publisher metadata lists 242 reciters and 288 recitation collections; the application does not play every catalog collection | Recitation is Arabic. Current player information is Arabic or English |
| 8 | [IslamHouse](https://islamhouse.com/) | Article catalog, original attachments, and text when supplied by the publisher | 70,460 publisher catalog materials; 4,677 article entries across the project's nine languages. Current search examines a bounded recent article page, **not the entire catalog** | Arabic, English, French, Spanish, Chinese, Hindi, Persian, Indonesian, Urdu |
| 9 | [Sheikh Ibn Baz — Official Website](https://binbaz.org.sa/) | Selected answers with original text, individual source links, and attribution | 101 Arabic answers in the deployment's saved collection | Arabic |

A connected audio catalog is not a question-answer bank. A reachable article catalog is not a full-text import. A saved publisher edition is useful content even if its live endpoint is temporarily unavailable. These distinctions are reflected in the product and its evidence summaries.

## Publisher-wide language catalogs

Publisher catalogs extend beyond the nine enabled product languages. These counts describe publisher metadata; they do not enable additional languages in Madar Al Bayan or guarantee a translation for each item.

| Publisher | Verified publisher scope | Beyond the project's enabled languages |
| :--- | :--- | :--- |
| HadeethEnc | 72 registered languages, including Arabic | 63 additional registered languages |
| QuranEnc | 76 translation editions in 56 translation languages, plus the Arabic original | 48 additional translation languages beyond the eight used by the project |
| Quranpedia | 142 translation editions in 60 translation languages, plus Arabic | 52 additional translation languages beyond the eight used by the project |
| IslamHouse | 133 catalog languages | 124 additional languages |
| MP3Quran | 21 metadata languages | Eight of the project's nine languages appear in this metadata catalog: Arabic, English, French, Spanish, Chinese, Persian, Indonesian, Urdu; 13 others. Hindi was not verified. This is **metadata**, not translated recitation |

ICADB returned nonempty publisher text in the eight non-Arabic project languages. This establishes availability of translated content, not complete subject coverage or answer relevance. The separate Arabic cards provide Arabic content. No larger language count is claimed from its registry alone.

## Access status and expansion boundary

At the final recorded deployment check, HadeethEnc, QuranEnc, Quranpedia, Surah, ICADB, MP3Quran, IslamHouse, and a representative Ibn Baz page returned HTTP 200. Byenah returned HTTP 403; its seven saved editions remained available. These are representative probes, not uptime guarantees or full-corpus audits.

| Candidate | Recorded limitation | Current accounting |
| :--- | :--- | :--- |
| [Dorar — Hadith Encyclopedia](https://dorar.net/hadith) | HTTP 403 from the deployed environment | Connector retained for future availability; excluded from the nine current references |
| [Siwar](https://siwar.ksaa.gov.sa/) | Publisher key and dictionary access required | Not counted as available content |
| [Shamela](https://shamela.ws/) | The tested MCP route returned HTTP 404 | Not counted as available content |
| Islamic Content MCP | A gateway to existing publisher content | Not counted as a separate publisher |
| [IslamEnc](https://islamenc.com/ar) | Selected material is reached through ICADB | Not counted as another independent active connection |

The wider planning catalog is not a list of integrated databases. New sources require usable content, traceable identity, demonstrated language availability, and a recorded rights basis before they can contribute to the product.

## Planned reference directory

The product's reference directory contains **25 candidate entries** alongside the nine current references. Entries represent collections or resources, so several can belong to one publisher. This is the complete planned list from [`reference-directory.ts`](../lib/reference-directory.ts), not a schedule or a claim that all 25 have working APIs. The separate Islamic Content MCP gateway and API documentation hub are access aids, not additional publishers.

| # | Proposed reference | Intended contribution | Next step |
| ---: | :--- | :--- | :--- |
| 1 | [Dorar — Hadith Encyclopedia](https://dorar.net/hadith) | Hadith grading and narration references | Resolve the recorded access block and verify source retrieval |
| 2 | [IslamEnc — Islamic Encyclopedia](https://islamenc.com/ar) | Additional encyclopedias, books and published translations | Expand beyond selected material already accessed through ICADB; avoid double counting |
| 3 | [Siwar](https://siwar.ksaa.gov.sa/) | Dictionaries and terminology | Obtain authorized dictionary access and verify returned entries |
| 4 | [King Fahd Quran Printing Complex — Quran Resources](https://qurancomplex.gov.sa/) | Quranic text, concise commentary and mushaf data | Verify an import or access route, edition identity and reuse terms |
| 5 | [King Fahd Quran Printing Complex — Translations](https://qurancomplex.gov.sa/quran-translations/) | Official translations of Quranic meanings | Confirm usable editions, language coverage and permitted import |
| 6 | [King Fahd Quran Printing Complex — Fonts](https://fonts.qurancomplex.gov.sa/) | Quranic typography and display resources | Review font licensing and rendering; do not count fonts as answer records |
| 7 | [Al-Maktaba Al-Shamela](https://shamela.ws/) | Classical scholarship with volume and page references | Verify an authorized retrieval or import route after the tested MCP route failed |
| 8 | [Kuwait Awqaf — Research and Fiqh Encyclopedia](https://bohoth.awqaf.gov.kw/) | Research and jurisprudence collections | Verify accessible files, rights, extraction and exact citations |
| 9 | [Risala](https://risala.prh.gov.sa/ar) | Hajj and Umrah guidance | Verify reusable content, available languages and record-specific links |
| 10 | [Digital Dawah Repository](https://dawa.center/) | Introductory books, research and multimedia | Select permitted materials and preserve file-level provenance |
| 11 | [Bayyinat — Questions and Answers about Islam](https://dawa.center/file/7937) | One introductory question-and-answer book | Verify the file, published editions and permitted extraction |
| 12 | [Al-Jamhara — Islamic Content Encyclopedia](https://islamic-content.com/) | Terminology, notable figures and subject entries | Verify a usable retrieval route and citation granularity |
| 13 | [Al-Jamhara — Dictionary of Islamic Terms](https://islamic-content.com/dictionary) | Definitions and their references | Verify entry access, attribution and reuse terms |
| 14 | [Thematic Quran Commentary Encyclopedia](https://modoee.com/) | Studies of Quranic themes | Verify editions, permitted import and passage-level references |
| 15 | [Tafsir Center for Quranic Studies](https://tafsir.net/) | Research and articles on Quranic sciences | Verify permitted article retrieval and stable individual links |
| 16 | [Wahy](https://wahy.net/) | Quranic study resources | Identify a supported integration route and reusable content |
| 17 | [Islam Question & Answer](https://islamqa.info/) | Referenced answers and published language editions | Verify permitted access, translation coverage and exact answer links |
| 18 | [Sheikh Ibn Uthaymeen — Official Website](https://binothaimeen.net/) | Fatwas, lessons, books and audio | Verify access and separate text answers from audio or catalog records |
| 19 | [Dorar — Quran Commentary](https://dorar.net/tafseer) | Commentary, grammar and verse meanings | Verify this collection's access, citations and reuse terms |
| 20 | [Dorar — Islamic Creed](https://dorar.net/aqeeda) | Creed with supporting references | Verify this collection's access, citations and reuse terms |
| 21 | [Dorar — Islamic Jurisprudence](https://dorar.net/feqhia) | Jurisprudence and evidence | Verify this collection's access, citations and reuse terms |
| 22 | [Dorar — History](https://dorar.net/history) | Historical events and their sources | Verify this collection's access, citations and reuse terms |
| 23 | [King Salman Global Academy for Arabic Language](https://ksaa.gov.sa/) | Language projects and publications | Select reusable collections and avoid counting the parent portal twice |
| 24 | [Riyadh Dictionary](https://dictionary.ksaa.gov.sa/) | Contemporary Arabic meanings and usage | Verify authorized entry access and licensing |
| 25 | [Falak](https://falak.ksaa.gov.sa/) | Linguistic corpora and contextual usage | Verify authorized corpus access and its role in the search workflow |

Unverified content totals or language counts are deliberately not supplied for these candidates. They will enter the current-reference table only after the relevant capability is demonstrated; a working home page alone is insufficient.

## Attribution and redistribution

Every displayed passage retains publisher identity, a source record ID, language, and a source reference. The application checks approved URL origins and distinguishes a reading page from a structured API response. Where a publisher exposes only an API record, the product must not pretend that the publisher's homepage is an exact citation. Unavailable Byenah API navigation is omitted while its saved evidence remains identifiable.

The repository's [MIT license](../LICENSE) covers original project software, not publisher content, translations, commentary, audio, attachments, or third-party brands. The public release deliberately excludes these raw corpora and their derived search assets. See [Third-party notices](../THIRD_PARTY_NOTICES.md) before importing or redistributing data.

## Verification trail

- [Corpus and publisher catalog summary](evidence/source-inventory.json)
- [Deployed provider health snapshot](evidence/provider-health-v31.json)
- [Language coverage](LANGUAGES.md)
- [Evaluation protocol and outcomes](EVALUATION.md)

Primary access documentation: [HadeethEnc API](https://hadeethenc.com/api-docs/), [QuranEnc API](https://quranenc.com/en/home/api), [ICADB API](https://icadb.com/api/docs), [Quranpedia API](https://api.quranpedia.net/), [Byenah API](https://byenah.com/ar/api), [MP3Quran API](https://mp3quran.net/api), and [IslamHouse API documentation](https://documenter.getpostman.com/view/7929737/TzkyMfPc). Access documentation is not, by itself, permission to redistribute an entire collection.
