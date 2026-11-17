# Wholesale application review workflow

This is a proposed future workflow, not an implemented service. See the [wholesale requirements](./wholesale-registration-requirements.md), [application preview](../sections/wholesale-application-preview.liquid), [customer-access audit](./customer-access-audit.md), [access decision brief](./wholesale-access-decision-brief.md), and [launch checklist](./launch-readiness-checklist.md) for existing fields, evidence, and launch dependencies.

## Confirmed rules and current boundary

- Brian or his supervisor reviews applications. Approval and revocation are manual, case-by-case decisions.
- Existing customers automatically qualify after secure identity matching; migration does not require discretionary reapproval. Login or a claimed email alone is not a secure match or wholesale approval.
- Visitors and unapproved, pending, declined, or revoked customers may browse but must not receive prices or place orders. Eligibility is not established by signing in.
- Shopify access architecture is unresolved. The current application and document handling are preview-only: no application is submitted, no account is created, and selected sample files stay in page memory, not uploaded or saved. No review or access change results from using the preview.

## Proposed states and reviewer actions

These states and transitions describe a possible future process, not current functionality. Customer-facing text is illustrative; delivery and status-display mechanisms are undecided.

| State | Reviewer action and allowed transitions | Customer-facing status |
| --- | --- | --- |
| Awaiting review | Review the application; request clarification → **needs information**, approve → **approved**, or decline → **declined**. | Application awaiting review; access is not available. |
| Needs information | Record what is needed and prepare a separate customer-facing request. When information is received, return to **awaiting review**; the reviewer may instead approve or decline case by case. | More information is needed; identify the request without exposing internal notes. Access is not available. |
| Approved | Record the decision and initiate or track separate access provisioning. Brian or his supervisor may revoke → **revoked**. | Approved; distinguish access pending from access available once verified. |
| Declined | Record the decision and reason. A reviewer may reopen → **awaiting review** if circumstances or information change. | Application declined; access is not available. |
| Revoked | Record the decision and initiate or track separate enforcement. A reviewer may reopen → **awaiting review** for a later case-by-case decision. | Access revoked; do not imply enforcement has completed until verified. |

A reviewer should identify the missing information, record the request and its status, and return the case to review when a response is received. The request should explain what the customer can provide without promising a notification channel or review time. An optional preview field or document is not automatically a mandatory production requirement; required-field and document rules remain undecided.

**Proposed confirmation:** Before approval, decline, or revocation, show the business and intended action, require a reason, and let the reviewer confirm or cancel without changing the state.

**Proposed production conflict protection:** Detect conflicting updates from concurrent reviewers against the current authoritative record, reject stale decisions, and require the reviewer to refresh and reconsider before submitting again. The preview does not implement concurrent-review protection, production permissions, or audit integrity.

## Proposed review screen and records

A staff-facing screen could show the application ID, state, timestamps, decision history, and the fields already represented in the [application preview](../sections/wholesale-application-preview.liquid):

- Business name, contact name, email, phone, fax and address; products sold, merchandise interests, business type, location type, and prior-purchase response.
- Retail or sales-tax permit number and issuing state/region; authorized buyers.
- Organization structure and applicable officer, partner, or sole-proprietor names; owner/principal officer home contact details, separate from business details.
- Identification and resale-certificate document status, including whether provided or not provided, without assuming secure document handling exists. Applicant name, title, and acknowledgment date may be shown as previewed; the local preview date is not an authoritative timestamp or a legal signature.

For a future production workflow, the **proposed required review record** is an application ID; creation, update, and decision timestamps; reviewer identity; decision history with prior and new states; internal notes; and reasons for decisions, including revocation. Record requests for information and their resolution as part of the history. Production must generate authoritative timestamps; this does not add mandatory applicant fields.

Keep internal notes and decision reasons in a staff-only area, separate from explicitly prepared customer-facing status or messages. Do not automatically expose internal notes or decision history to customers. Production storage and staff permissions require separate decisions.

## Proposed matching and access handoff

Use authoritative existing-customer records and an approved identity-proof process to establish a secure match; record the match, evidence or reference, reviewer/operator identity, and timestamp. A prior-purchase answer, login, or email claim alone is not proof. Send duplicate, shared-email, multi-location, or otherwise ambiguous matches to manual resolution; do not grant access while identity is unresolved. Once securely matched, the existing customer automatically qualifies without discretionary reapproval. The authoritative records, proof method, and exception process remain open decisions.

Track eligibility separately from technical provisioning and enforcement. **Approved, access pending** means an eligibility decision or secure existing-customer match is recorded but access is not yet verified; it is not permission to receive prices or order until a trusted access path is ready. **Revoked, enforcement pending** means the decision is recorded but technical denial has not yet been verified; treat this as an operational exception requiring follow-up, not as proof that access was removed. Verify denial across enabled price and order paths, including existing sessions and links. Fail closed where enforcement is implemented; the current preview does not enforce either state.

## Open decisions

The supervisor/team and technical owners still need to decide secure document upload and storage, staff permissions, retention and deletion, the production submission/backend and authoritative records, matching procedures, customer communication and status delivery, and the Shopify access architecture and enforcement synchronization. No retention period, legal requirement, or new mandatory application field is established here.

## Future staff-facing preview scope

Create a clearly labeled, local-only screen with a small set of fictional applications illustrating the five states, missing-information requests, and access-pending/enforcement-pending indicators. Show the proposed field groups, separate sample internal notes and customer messages, and a sample decision history. It must use no real uploads, persistence, notifications, or approval changes, and must not imply that review, matching, provisioning, or enforcement is operational.

Review-preview locale strings outside the default English locale are English fallbacks pending translation. Fictional sample details are also in English.
