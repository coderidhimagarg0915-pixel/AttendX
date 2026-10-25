## Description of Changes
<!-- Clearly summarize what this PR implements and reference the relevant Milestone/Issue -->

## Milestone Alignment
- [ ] Milestone explicitly requested by product plan (No unrequested features)

## Engineering Rules Checklist (AttendX)
- [ ] **Rule 1 & 14:** Milestone scope verified; changed files and test outputs documented.
- [ ] **Rule 3:** Components are reusable; business logic separated from presentation.
- [ ] **Rule 4:** Tested on mobile, tablet, and desktop breakpoints.
- [ ] **Rule 5:** Includes keyboard navigation, accessible forms, loading states, empty states, and explicit error messages.
- [ ] **Rule 6:** Mock data is clearly marked with prototype alerts; never presented as verified real attendance.
- [ ] **Rule 7 & 8:** No secrets or Supabase `service_role` keys are committed or exposed in frontend code.
- [ ] **Rule 9 & 10:** Authorization and data validation enforced on database/server (RLS & RPC), not only frontend route guards.
- [ ] **Rule 11:** Student presence is verified cryptographically by the database, not assumed by client 200 responses.
- [ ] **Rule 12:** TypeScript strict mode compilation (`npm run build`) and Vitest test suite (`npm run test`) were executed and passed locally.

## Testing & Verification Output
```bash
# Paste terminal output of test / build run:
npm run test
npm run build
```

## Reviewers
- Assigned Teammate 1: @
- Assigned Teammate 2: @
