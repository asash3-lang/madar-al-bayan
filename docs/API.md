# HTTP API

The API serves the web application. It is not a promise of unrestricted third-party access or permanent publisher availability. Examples use `BASE_URL` to refer to your own configured deployment.

**Supported language codes:** `en`, `ar`, `fr`, `es`, `zh`, `hi`, `fa`, `id`, `ur`.

Mutating requests require `Content-Type: application/json`. When an `Origin` header is present, it must match the request URL origin. This is a same-origin application interface, not a configured cross-origin public API. Validation limits refer to JavaScript string length. Never place secret keys in browser requests.

## Search

### `POST /api/ask`

```json
{
  "question": "How should prayer be performed when a person cannot stand?",
  "language": "en"
}
```

| Field | Contract |
|---|---|
| `question` | Required string, 1–1,000 characters after trimming. |
| `language` | Optional supported language code; default `en`. It is a hint for language detection. |

The request body is limited to 6,000 characters. A question in a recognized supported language can override the supplied language. Very short or ambiguous text may retain the hint.

```sh
curl "$BASE_URL/api/ask" \
  --header 'Content-Type: application/json' \
  --data '{"question":"What is Islam?","language":"en"}'
```

A successful HTTP response is `200` even when no evidence is found. The application outcome is in `status`:

| Value | Meaning |
|---|---|
| `found` | One or more accepted publisher excerpts. |
| `insufficient` | No acceptable evidence, or contextual/source service unavailable. |
| `referral` | The request requires individual review. |
| `clarify` | The request needs clarification. |

Important response fields:

| Field | Meaning |
|---|---|
| `question`, `language` | The original request and effective response language. |
| `detected`, `ambiguous` | Language-detection diagnostics; not a confidence percentage. |
| `evidence[]` | Ordered publisher excerpts with source metadata. No public `score` field. |
| `dataMode` | `live`, `snapshot`, or `mixed`; meaningful when evidence exists. |
| `contextMode` | Processing mode, such as `semantic`, `direct-topic`, `exact-title`, `exact-reference`, `exact-intent`, `no-candidates`, or `context-unavailable`. |
| `queryUnderstanding` | `astra` or `unavailable` when the free-query planning path runs; may be absent for direct lookup. |
| `suggestion` | Optional `{text, language}` spelling suggestion. Heuristic; may be incorrect. |
| `generationEnabled` | `false` in this public search flow. |
| `generationStatus`, `answer`, `generatedBy` | `"disabled"`, `[]`, and `null`; no generated answer text. |
| `durationMs` | Application timing diagnostic, not an end-to-end latency guarantee. |
| `analysis` | Internal policy metadata retained for compatibility; not a scholarly ruling. |

Each evidence item contains `excerpt`, `kind`, and `source`. `kind` is `hadith` or `explanation`; `hadith` is also the legacy storage field for Quran, tafsir, and other publisher body text. Use `source.sourceType` where available to distinguish content type.

A `source` includes `id`, `publisher`, `language`, `title`, `hadith`, `explanation`, `grade`, `attribution`, `references`, `canonicalUrl`, `apiUrl`, `retrievedAt`, `contentVersion`, and `accessMode`. Some publishers omit grade, version, or descriptive metadata. The UI's link helper validates the source URL and may expose an official data response when no reading page exists.

A `semantic` mode indicates the model-based validation path completed; it does not certify correctness. Exact lookup modes are intentionally distinct. Unsupported or unavailable evidence must not be synthesized by an API client.

## Public reference endpoints

| Method and path | Parameters | Response and purpose |
|---|---|---|
| `GET /api/catalog` | None | Snapshot metadata, text-record counts, language coverage, current references, and Quran scope. Cached for 300 seconds. |
| `GET /api/status` | None | Configuration metadata and publisher health probes. No API key values. Probe success is not proof of full corpus coverage. |
| `GET /api/publisher-library` | `language=en`; `page=1`, integer 1–1,000 | Up to 50 IslamHouse article catalog entries per page, with official links and available attachment metadata. Cached for 900 seconds. |
| `GET /api/recitations` | Required `surah=1` through `114`; optional `language=en` | MP3Quran reciter/reading metadata and a recording URL. Cached for 3,600 seconds. |
| `GET /api/dictionary` | Required `q`, 1–100 characters | Siwar linguistic definitions when its key and lexicon IDs are configured. Optional integration; not part of the nine available references. |

Publisher catalog descriptions and attachments are not equivalent to retrieved full answer text. Corpus counts describe the hosted, provisioned data; copying the source code alone does not create those records. Publisher-only failures normally return `503` from these helper endpoints.

## Submit a question for review

### `POST /api/referrals`

```json
{
  "question": "My question for the review team",
  "language": "en",
  "email": "review-demo@example.com",
  "consent": true,
  "website": ""
}
```

`question` uses the search length limit. `language` is required and must be supported. `email` is required, validated, and normalized to lowercase. `consent` must be `true`. The anti-spam field `website` must be empty or absent.

A `201` response contains:

```json
{
  "id": "opaque-request-uuid",
  "number": 123,
  "reference": "MB-000123",
  "status": "pending",
  "emailDeliveryEnabled": true
}
```

The example number is illustrative. The database allocates real references. Saving the request does **not** send an answer; an authorized reviewer must write and send it. `emailDeliveryEnabled` checks sender configuration, not end-to-end delivery.

`GET /api/referrals` returns only that configuration flag; it does not expose submitted questions.

### `POST /api/contact`

```json
{
  "contact": "review-demo@example.com",
  "name": "Demo visitor",
  "message": "A question about the service",
  "language": "en",
  "website": ""
}
```

`contact` must be an email address or a valid 7–15 digit phone number with an optional leading `+`. Name is optional, at most 100 characters; message is optional, at most 4,000. Language defaults to English when invalid or missing. Returns `201` with `id`, `number`, `reference`, and `status: "saved"`. Phone-only requests cannot receive an email reply through this flow.

## Administration

These routes require an administrator session, except the login operation and session-status check. Credentials are configured privately and are deliberately absent from this document.

### Session

| Method | Path | Contract |
|---|---|---|
| `GET` | `/api/admin/session` | Returns `{authenticated: boolean}`. |
| `POST` | `/api/admin/session` | JSON `{username, password}`. On success returns `authenticated: true` and sets the secure session cookie. Body limit: 1,000 characters. |
| `DELETE` | `/api/admin/session` | JSON `{}`. Invalidates the session and clears the cookie. |

### Inbox and message details

`GET /api/admin/inbox` accepts:

- `folder`: `inbox` (default), `sent`, `urgent`, or `trash`.
- `q`: optional search text, up to 200 characters. Accepts a reference such as `MB-000123` or a number such as `123`.
- `before`: the opaque cursor returned as `next`; pass it back unchanged.

The response is `{items, next, counts}` with up to 30 items per page. Search covers subject, contact, name, answer, and reference. When a query is supplied, it searches across active folders; Trash search remains within deleted messages. The total mailbox is not capped at one page.

`GET /api/admin/questions/{id}` returns `{item, kind}` where `kind` is `question` or `contact`. The item includes reference number, language, contact, timestamps, current status, saved answer, urgency, and deletion status.

`POST /api/admin/questions/{id}` accepts the following actions:

| Action | Body fields | Behavior |
|---|---|---|
| `draft` | `answer`, `updatedAt`, optional `cc`, `bcc` | Saves a reply without sending. |
| `send` | `answer`, `updatedAt`, optional `cc`, `bcc` | Sends to the stored requester address; no separate recipient entry required. |
| `priority` | `urgent: boolean` | Sets or clears the Urgent flag. |
| `delete` | No additional fields | Moves the message to Trash. |
| `restore` | No additional fields | Restores the message. |

Draft/send answers must be nonempty and no longer than 12,000 characters; the route body limit is 32,000. Copy fields accept arrays or delimiter-separated addresses. Duplicates and the primary recipient are removed; the combined maximum is 49 additional recipients. `updatedAt` must match the latest detail response. Stale edits return `409`.

Delivery states can include `pending`, `draft`, `approved`, `sending`, `sent`, `delivery_failed`, and `delivery_unknown`. A `sent` state means the email provider accepted the request. An uncertain response must be reconciled before another attempt; it is not safe to assume failure and resend blindly. Replies remain stored after a delivery failure.

### Analytics

`GET /api/admin/analytics?days=30` accepts `7`, `30` (default), `90`, or `all`. It returns `summary`, `languages`, `questions`, and `activity`, plus range metadata. Repeated-query aggregation uses normalized query text; counts represent searches and messages, not unique visitors. Daily grouping uses UTC+3. The daily chart is limited to the latest 90 available days even for `all`.

## Compatibility endpoints

These are retained for the earlier reviewer workflow and are outside the primary public demo:

| Routes | Access and purpose |
|---|---|
| `GET /api/contact` | Authorized administrator or configured committee identity; contact list. |
| `GET`, `POST /api/committee` | Authorized reviewer; list referrals or approve an answer. |
| `GET`, `POST /api/cases` | Hosting user identity; list or create that user's evidence cases. |
| `GET`, `POST /api/cases/{id}` | Owning hosting identity; read or review a versioned case. |
| `GET /api/cases/{id}/export?format=json` | Owning hosting identity; JSON export; otherwise Markdown. |

The case workflow uses the hosting identity integration and must not be represented as a generic standalone login feature.

## Common errors

| HTTP status | Typical cause |
|---|---|
| `400` | Invalid language, fields, or question. |
| `401` / `403` | Missing authorization or disallowed origin/identity. |
| `404` | Message or owned case not found. |
| `409` | Stale edit, conflicting state, or send already in progress. |
| `413` | Request body exceeds the route limit. |
| `415` | Content type is not JSON. |
| `429` | Administrator login throttling. |
| `503` | Service, database, model, publisher helper, or delivery unavailable. |

Error payloads use `{error: string}` and may contain localized text. Do not parse wording as a stable machine code. Search model/source failures can also produce a valid `200` result with no evidence; inspect the application fields rather than HTTP status alone.
