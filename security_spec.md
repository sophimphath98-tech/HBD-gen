# Security Specification: Zero-Trust Birthday Celebration Security Matrix

This document defines the security configuration, assertions, and mock payloads for testing our secure Firestore databases.

## 1. Data Invariants

- **Birthday Cards (`/birthday_content/{cardId}`)**:
  1. Only signed-in, email-verified users can create documents.
  2. The `authorId` field MUST match the authenticated user's `request.auth.uid`.
  3. The `authorEmail` field MUST match the authenticated user's `request.auth.token.email`.
  4. The `createdAt` field on creation MUST match `request.time` exactly.
  5. During an update, `createdAt`, `authorId`, `authorEmail`, and `authorName` are immutable fields.
  6. Users can only modify or delete documents where they are the owner (`authorId == request.auth.uid`).
  7. Values for `title` and `description` must be validated strings (under 256 and 5000 chars respectively).
  
- **Settings (`/settings/{settingId}`)**:
  1. Anyone (even guests) can read the celebrant setting (`/settings/celebrant`) to load the page.
  2. Only signed-in, email-verified users can update the settings.
  3. The `updatedAt` field on update MUST match `request.time`.
  4. The document ID for the active name MUST be `celebrant`.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following lists 12 specific payloads or operations designed to breach integrity, which our ruleset strictly blocks:

1. **Identity Spoofing - Card Ownership Hijack**: An authenticated user `attacker_uid` attempts to create a memory card with `authorId` set to `victim_uid`.
2. **PII Exposure - Blanket Reads**: An unauthenticated guest or malicious user attempts to get all raw lists from the database without specific queries or filters.
3. **Ghost Field Injection (Shadow Update)**: A user updates a memory card but injects a hidden `isAdmin: true` attribute or other non-existent fields.
4. **Creation Timestamp Poisoning**: A user tries to create a card with a manual historical `createdAt` (e.g. `2020-01-01`) instead of the server timestamp.
5. **Modification Timestamp Poisoning**: A user updates a card but sets `updatedAt` to a future date to stay on top.
6. **Immutable Field Mutate - Changing Creator**: A user attempts to update a card and change `authorId` to transfer ownership.
7. **Privilege Escalation - Settings Write by Guest**: A non-authenticated user attempts to write or change the celebrant name under `/settings/celebrant`.
8. **Malicious Content Spraying - Over-sized Title**: An authenticated user tries to save a memory card where the `title` contains a 10MB string.
9. **Malicious Content Spraying - Empty/Null Fields**: Creating a memory card with null fields or missing properties listed as required.
10. **Resource Poisoning - ID Sabotage**: Attacking the system by registering a document with an ID containing wild punctuation like `$$$MALICIOUS!!!` or over 4096 characters to break routing.
11. **Settings Theft (Delete)**: A standard user tries to delete the global `celebrant` settings record.
12. **Bypassing Verification**: A user whose Google Account email is *not* verified (`email_verified == false`) attempts to post or edit memories.

---

## 3. Test Runner Implementation

Here is an abstract representation of our rules tests. Since we are in a sandboxed runtime environment, we maintain this specification to verify structural integrity.

```typescript
// firestore.rules.test.ts
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

// Tests will verify:
// 1. Unauthenticated users cannot read/write /birthday_content.
// 2. Verified users can read any card, but only write cards they own.
// 3. User with email_verified = false cannot create cards.
// 4. Updating a card cannot modify immutable fields (authorId, createdAt).
```
