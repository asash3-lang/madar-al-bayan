# Contributing

Thank you for improving access to verifiable Islamic reference material. Changes should make the experience easier to use while keeping the link between a displayed excerpt and its publisher inspectable.

## Before opening a change

Read [Getting started](docs/GETTING_STARTED.md), [Architecture](docs/ARCHITECTURE.md) and [Sources](docs/SOURCES.md). Work on a focused branch and explain the user-visible problem in the pull request. Keep discussion and repository documentation in English; preserve the application's multilingual interface and original publisher text.

## Content and retrieval changes

- Keep quotations verbatim and preserve publisher attribution, language, version and record identifiers.
- Do not add generated religious answers or machine-translated answers to the evidence corpus.
- For a new publisher, document its official API, request limits, available languages, terms and exact-link behavior before adding it to the allowlist.
- A working HTTP response does not establish permission to redistribute a corpus. Do not commit publisher databases or generated search indexes.
- Include a relevant positive case and a concrete negative or conditional case when modifying retrieval. Explain any tradeoff in coverage.
- Never describe a confidence score as independently measured accuracy.

## Verification

```bash
pnpm typecheck
pnpm test:contracts
pnpm build
```

For changes requiring imported content, run the documented bootstrap and state the corpus scope, language and upstream version used. Live model or provider checks must be identified separately from controlled fixtures. Do not trigger paid provider requests in CI by default.

## Privacy and review

Use synthetic questions and example addresses in tests. Do not paste access tokens, private messages, administrator credentials, real beneficiary questions or email addresses into commits, issues, screenshots or logs. Report security concerns through [Security](SECURITY.md).

Keep the original copyright and dependency notices intact. Contributor code falls under the repository's original-code license; third-party data remains subject to its own terms.
