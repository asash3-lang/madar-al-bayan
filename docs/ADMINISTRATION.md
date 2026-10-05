# Administration and human review

When Madar Al Bayan cannot retrieve suitable published evidence, it provides a path to a human response. The owner or an authorized reviewer can receive the enquiry, inspect its context and send a reply using the visitor's saved email address. This guide describes the implemented workflow; it does not imply that an external scholarly body has approved the platform or joined the project.

## From an unanswered question to a reply

| Step | Visitor experience | Administration responsibility |
| ---: | :--- | :--- |
| 1. Search | The visitor writes in a supported language. Suitable published passages are shown when available. | The model assists retrieval and context assessment; it does not write a replacement religious answer. |
| 2. Request review | If no suitable result is available, the visitor may submit the question with a required email address and consent. A temporary context-check failure can also offer this route. | Submission is voluntary. Merely searching does not create a private correspondence request. |
| 3. Receive a reference | Successful saving displays a numbered message reference. | The database preserves the question, language, recipient, arrival date and status. A saved request means received for review, not answered or emailed. |
| 4. Review and compose | The visitor does not need to repeat the question or contact details. | Open the record, inspect its language and full question, write an appropriate reply, and include relevant references in the response. |
| 5. Send and follow up | The reply is addressed to the email supplied with the request. | Send through Resend with the primary recipient already filled in; inspect the recorded sending state and Sent folder. |

The reviewer should answer in the questioner's language. Localized email templates provide the surrounding message and reading direction, while the answer itself is human-authored. There is no automatic translation of the reviewer's response and no guaranteed response deadline.

## The private workspace

| Capability | Implemented behavior |
| :--- | :--- |
| Inbox | Displays incoming questions and contact messages, newest first |
| Number and date | Each message has a reference; dates are presented in Riyadh time |
| Language | Shows the full language name in Arabic for the administrator, rather than only an abbreviated code |
| Quick preview | Hovering over or focusing a row previews its question and essential details |
| Full details | Opening a row shows the complete enquiry, contact information, language, dates, status and saved response |
| Search | Finds previous correspondence by reference number or message information |
| Reply | Keeps the primary recipient available; the administrator writes the answer and sends it |
| Draft | Saves an unfinished response before sending |
| Urgent | Marks an existing message for priority follow-up |
| Cc / Bcc | Adds validated additional recipients when the administrator intentionally requests a copy |
| Sent | Presents replies recorded as accepted by the sending provider |
| Trash | Moves messages out of active folders with a restore option; deletion is reversible |
| Authentication | Requires an administrator session for messages, replies and analytics |

The review form requires email. The separate contact form can accept a phone contact; a phone-only message cannot receive an email reply without an email address. The public repository includes neither real correspondence nor production credentials.

## What the statistics mean

| Audience | Statistics | Purpose |
| :--- | :--- | :--- |
| Visitors | Current references, supported languages, text records, Quran scope, hadith and explanation counts, and publisher catalog scope | Understand the available reference collection |
| Administrator | Searches, result outcomes, language participation, frequently repeated questions, messages, replies and activity over time | Identify demand, unanswered topics and follow-up needs |

Administration analytics are private. Their totals count interactions, not unique people. Supported ranges are 7, 30, 90 days and all time; the daily activity chart is capped at the latest 90 available days. Reference-content statistics and visitor activity are different measures and must not be combined.

## Delivery and operational responsibility

The application saves the reply and uses a durable sending claim and revision-based idempotency key to reduce duplicate sends. A failed or uncertain request retains the answer and sending state for follow-up. **Resend accepting an email is not proof of inbox delivery or reading.** The current release does not claim implemented delivery/bounce webhook reconciliation.

The administrator is responsible for the substance and language of the human reply. Access to the administration interface does not establish scholarly qualifications. For a demonstration, use a clearly marked test question and a mailbox controlled by the owner.

See [Email and supporting services](EMAIL_AND_SERVICES.md) for delivery details, [Architecture](ARCHITECTURE.md) for storage and access boundaries, [Sources](SOURCES.md) for reference counts, and [Languages](LANGUAGES.md) for current and planned language coverage.
