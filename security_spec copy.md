# Security Specification - WM Saúde Inventory

## 1. Data Invariants
- A session must have a valid creator (userId).
- A session cannot be deleted by anyone other than its creator or an admin.
- Only authenticated users can create or edit sessions/actions.
- Visitors can ONLY read (list/get) sessions and actions.
- Action resolution can only be toggled by authenticated users.
- All IDs must match '^[a-zA-Z0-9_\\-]+$'.

## 2. The Dirty Dozen Payloads (Rejection Targets)

### Sessions
1. **Unauthorized Create**: Payload with `userId` not matching `request.auth.uid`.
2. **Anonymous Create**: Attempting to create a session without being logged in.
3. **Ghost Field Update**: Adding an `isAdmin: true` field to a session document.
4. **Session Hijack**: User A trying to update User B's session.
5. **ID Poisoning**: Creating a session with a 2KB junk string as the ID.
6. **Type Mismatch**: Sending `completed: "yes"` instead of `true`.
7. **Size Bomb**: Sending a 1MB string in `locality`.

### Actions
8. **Orphaned Action**: Creating an action for a sessionId that doesn't exist.
9. **Identity Spoofing**: Setting `userId` in action to a different user's UID.
10. **State Shortcut**: Resolving an action without providing a `resolutionDate` (if required by app logic, though here resolved is a boolean).
11. **Malicious Delete**: User B trying to delete User A's corrective action.
12. **PII Leak**: (Not applicable here as we don't have sensitive PII in these collections, but standard rules apply).

## 3. Test Runner (Draft)

```typescript
// firestore.rules.test.ts
// This file would be used with @firebase/rules-unit-testing
// to verify all "Dirty Dozen" payloads are denied.
```
