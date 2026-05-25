# SLS Grid Permanent — Migration TODO

## Phase 1: Shared & Server Layer
- [x] Copy drizzle/schema.ts with all 13 tables and SLS role enums
- [x] Copy drizzle/relations.ts
- [x] Copy shared/const.ts and shared/types.ts
- [x] Copy server/db.ts with all query helpers
- [x] Copy server/routers.ts with all 18 tRPC routers
- [x] Copy server/routers/seed.ts demo data seeder
- [x] Copy server/storage.ts

## Phase 2: Client Source Files
- [x] Copy client/src/index.css with full SLS brand tokens
- [x] Copy client/src/App.tsx with all 14 routes
- [x] Copy client/src/main.tsx
- [x] Copy client/src/const.ts
- [x] Copy client/src/components/SLSLayout.tsx (sidebar, login page, mobile nav)
- [x] Copy client/src/components/SLSComponents.tsx (shared UI)
- [x] Copy client/src/components/OnboardingTour.tsx
- [x] Copy client/src/components/AskTheGrid.tsx
- [x] Copy all 16 page components (Dashboard, Projects, ProjectDetail, etc.)
- [x] Copy client/index.html with Google Fonts

## Phase 3: Database
- [x] Apply migration 0000 (full schema creation)
- [x] Apply migration 0001 (users table extension + new tables)
- [x] Apply migration 0002 (onboardingCompleted column)

## Phase 4: Dependencies & Build
- [x] Add missing npm packages (all already present in WebDev template)
- [x] Fix TypeScript errors (zero errors)
- [x] Verify clean build with zero errors
- [x] Run test suite (1/1 passed)

## Phase 5: Checkpoint & Delivery
- [x] Create checkpoint
- [x] Deliver permanent website URL to user

## Feature: Password-Protected Invite System
- [x] Add invite_tokens table to drizzle/schema.ts (token, role, inviteCode, createdBy, usedBy, expiresAt, usedAt)
- [x] Apply invite_tokens migration SQL to the database
- [x] Build server/routers/invites.ts tRPC router (create, list, revoke, redeem procedures)
- [x] Register invites router in server/routers.ts
- [x] Build client/src/pages/InviteAccept.tsx (invite code gate + OAuth redirect)
- [x] Add /invite/:token route to App.tsx
- [x] Add Invite Management section to Admin.tsx (generate link, copy, list, revoke)
- [x] Write vitest tests for invite router
- [x] Save checkpoint and deliver
