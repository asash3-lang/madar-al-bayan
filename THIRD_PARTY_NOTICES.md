# Third-party Notices

The [MIT license](LICENSE) applies to original Madar Al Bayan software and documentation authored for this project. It does not relicense third-party software, publisher text, translations, commentary, audio, downloadable attachments, fonts, logos, or trademarks.

## Included software notices

| Component | Attribution | License and retained notice |
| :--- | :--- | :--- |
| Sites Vite integration | Copyright (c) 2026 OpenAI | MIT; full notice retained in [`build/sites-vite-plugin.LICENSE`](build/sites-vite-plugin.LICENSE) |
| Vendored shadcn Tailwind styles | Copyright (c) 2023 shadcn | MIT; full notice retained in [`vendor/shadcn-tailwind-4.13.0.LICENSE.md`](vendor/shadcn-tailwind-4.13.0.LICENSE.md) |
| Installed runtime and development dependencies | Their respective authors | Each package's own license applies; dependency versions are recorded in the package manifest and lockfile |

Retain these notices when copying or distributing the corresponding components. Naming a dependency here does not claim that its authors endorse this project.

## Publisher content is separately governed

The public repository intentionally omits the reference deployment's third-party corpus, downloadable publisher editions, full-text search indexes, and audio files. Metadata and source identifiers document the implementation; they do not convey permission to redistribute the underlying works.

| Publisher | Content handled by the deployment | Rights and provenance handling |
| :--- | :--- | :--- |
| [HadeethEnc](https://hadeethenc.com/) | Hadith, explanations, published translations | Retain the publisher's embedded source notice, language, version, update URL, and attribution when using an authorized edition. No blanket MIT grant is asserted for these texts |
| [QuranEnc](https://quranenc.com/) | Quranic text and published translations of meanings | Keep translator/edition identity, version, notes, and source links. Translation rights and publisher terms remain separate from the application license |
| [ICADB](https://icadb.com/) | Published book passages and approved encyclopedia cards | Preserve phrase/card identity, publisher attribution, version when supplied, and the selected source-language text. An `approved` content flag indicates publisher review status, not an open-source license |
| [Quranpedia](https://quranpedia.net/) | Quranic text, commentary, translations | Keep verse and edition identity and bibliographic attribution; rights can differ between works and translations |
| [Surah](https://surahapp.com/) | Al-Sa'di commentary via a verse-addressed endpoint | Preserve author, work, and verse attribution; verify applicable endpoint and edition terms before reuse |
| [Byenah](https://byenah.com/) | A published introductory work in seven editions | Preserve edition, author, and source information; a previously saved response does not establish unrestricted redistribution rights |
| [MP3Quran](https://mp3quran.net/) | Recitation catalog and publisher-hosted audio URLs | Record the reciter and reading; recordings remain hosted by the publisher. This repository grants no rights to audio recordings |
| [IslamHouse](https://islamhouse.com/) | Catalog metadata, article text where supplied, original attachments | Keep authorship and item links; inspect the relevant item and attachment conditions. Catalog accessibility does not grant a license over all linked files |
| [Sheikh Ibn Baz — Official Website](https://binbaz.org.sa/) | Selected original Arabic answers | The recorded publisher notice permits copying subject to source attribution. Preserve author and exact answer links; these works are not relicensed under MIT |

Future sources, including Dorar and Siwar, require their own access and rights review. A working public endpoint, HTTP 200, an API key, a source approval flag, or the existence of an import script is not by itself proof of unrestricted reuse.

## Before importing or distributing a collection

Record the source URL, retrieval date, author or publisher, edition/version, applicable notice or permission, and the intended use. Preserve required attribution and update information. Keep raw content and derived indexes out of a public repository unless that distribution is supported by the applicable terms or permission.

Third-party source names are used for identification. Madar Al Bayan does not claim publisher partnership, endorsement, ownership of source material, or exclusive rights in the cited works.

See [Sources & Provenance](docs/SOURCES.md) for the deployment inventory and [Language Coverage](docs/LANGUAGES.md) for the selected editions.
