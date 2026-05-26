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

## Feature: Invite Project Auto-Assignment
- [x] Add projectId column to invite_tokens table in drizzle/schema.ts
- [x] Apply ALTER TABLE migration to add projectId column to database
- [x] Update invites.create procedure to accept optional projectId
- [x] Update invites.redeem procedure to auto-insert into project_members on redeem
- [x] Update invites.list to return projectId and project name
- [x] Add project selector dropdown to Admin invite form
- [x] Write/update tests for project auto-assignment on redeem
- [x] Save checkpoint and deliver

## Feature: Global Search Bar
- [x] Add search tRPC procedure querying projects, documents, and submittals
- [x] Build GlobalSearch command-palette component with keyboard shortcut (Cmd/Ctrl+K)
- [x] Wire search trigger button into SLSLayout sidebar
- [x] Write tests for search procedure
- [x] Save checkpoint and deliver

## Bug Fix + Feature: Document Upload & Type Selector
- [x] Diagnose file upload error from server/browser logs
- [x] Fix root cause of upload failure — replaced FileReader with arrayBuffer+btoa, added try/catch/finally, added file size validation
- [x] Add document type selector to upload form (dropdown with human-readable labels)
- [x] Include all existing types plus: Marketing Materials, Case Studies
- [x] Ensure document type is saved to the documents table on upload (Zod enum + DB enum updated)
- [x] Write/update tests for document upload router (18/18 passing)
- [x] Save checkpoint and deliver

## Feature: Bulk Document Download (Zip Export)
- [x] Add documents.getBulkDownloadUrls tRPC procedure (returns fileUrl + fileName for given IDs)
- [x] Install jszip on the client for in-browser zip generation
- [x] Add checkbox column to Document Vault table with Select All toggle
- [x] Add "Download Selected (N)" action bar that appears when files are selected
- [x] Implement zip generation: fetch each file, add to JSZip, trigger browser download
- [x] Show progress indicator during zip generation
- [x] Write tests for getBulkDownloadUrls procedure
- [x] Save checkpoint and deliver

## Feature: Link to Project at Upload
- [x] Add projectId state to upload form in Documents.tsx
- [x] Fetch accessible projects list for the dropdown
- [x] Add optional "Link to Project" Select dropdown to upload dialog
- [x] Pass projectId through to the documents.upload tRPC mutation
- [x] Verify projectId is already accepted by the server upload procedure (confirmed, no backend changes needed)
- [x] Write tests for project-linked upload (covered by existing documents.test.ts)
- [x] Save checkpoint and deliver

## Feature: Document Version History
- [x] Add document_versions table to drizzle/schema.ts (documentId, versionNumber, fileUrl, fileKey, fileName, fileSize, mimeType, uploadedBy, createdAt, notes)
- [x] Apply CREATE TABLE migration to the database
- [x] Add documents.uploadVersion tRPC procedure (creates new version row, bumps currentVersion on parent document)
- [x] Add documents.listVersions tRPC procedure (returns all versions for a document ordered newest first)
- [x] Add currentVersion column to documents table
- [x] Build version history Sheet in Documents.tsx (opens per-document, lists all versions with download links)
- [x] Add "Upload New Version" form inside the version history Sheet
- [x] Show version badge (v1, v2...) on each document row in the vault table
- [x] Write tests for uploadVersion and listVersions procedures (31/31 passing)
- [x] Save checkpoint and deliver

## Feature: Document Vault Live Filter
- [x] Add text search input (filename / document name) above the vault table
- [x] Add document type dropdown filter
- [x] Add linked project dropdown filter
- [x] Wire all three filters together with client-side useMemo filtering
- [x] Show active filter count badge and a Clear Filters button
- [x] Save checkpoint and deliver
## Feature: Prospect Radar Module (commit d8ed4ad)
- [x] Apply drizzle/0003_prospect_radar.sql migration (prospect_leads + prospect_signals tables)
- [x] Add prospect radar schema objects to drizzle/schema.ts (prospectLeads, prospectSignals, enums, types, INTERNAL_ROLES)
- [x] Write and register server/routers/prospectRadar.ts (list, get, create, update, addSignal, loadDemo)
- [x] Register prospectRadarRouter in appRouter in server/routers.ts
- [x] Port frontend page to client/src/pages/ProspectRadar.tsx (adapted for Vite/Wouter/shadcn stack)
- [x] Add /prospect-radar route to client/src/App.tsx
- [x] Add Prospect Radar sidebar nav item to SLSLayout.tsx (gated to sls_admin, sls_rep, sls_pm, admin)
- [x] Write 14 Vitest tests for prospect radar (input validation, signal validation, money helper, enum coverage)
- [x] 45/45 tests passing, 0 TypeScript errors
- [x] Save checkpoint and deliver

## Feature: Prospect Radar Enhancements (Round 2)
- [x] Add signal ingestion form (Add Signal sheet on Prospect Radar page, wired to prospectRadar.addSignal)
- [x] Add lead create/edit modal (full form wired to prospectRadar.create + prospectRadar.update)
- [x] Add project conversion action (Convert to Project button on qualified leads, pre-populates project modal)
- [x] Add AI cold outreach sequence generator (per-lead, per-signal, LLM-powered, 3-touch email sequence)
- [x] Extend prospectRadar router: generateOutreach procedure using invokeLLM
- [x] Write Vitest tests for all new router procedures
- [x] Save checkpoint and deliver

## Feature: Projects Module Load Demo
- [x] Write projectsSeed router (loadDemo + clearDemo procedures) with full realistic project data
- [x] Register projectsSeed router in appRouter
- [x] Add Load Demo / Clear Demo buttons to Projects page (matching Prospect Radar style)
- [x] Seed data: 1 project + products, milestones, budget items, change orders, submittals, team members, messages
- [x] Write Vitest tests for seed data shape
- [x] Save checkpoint and deliver

## Feature: Collapsible Sidebar Departments + CRM Pursuits Module
- [ ] Restructure SLSLayout sidebar into collapsible department sections (Project Management, Sales & CRM, Tools & Admin)
- [ ] Persist collapse state per section in localStorage
- [ ] Add Pursuits nav item under Sales & CRM section
- [ ] Add pursuits table to drizzle schema (company, contact, value, stage, source, notes, assignedRep, etc.)
- [ ] Run drizzle migration for pursuits table
- [ ] Write pursuitsCRM tRPC router (list, get, create, update, delete, bulkImport)
- [ ] Register pursuitsCRM router in appRouter
- [ ] Build Pursuits page: list/table view with filters, status badges, sort, pagination
- [ ] Add CSV/spreadsheet upload modal with column mapping and preview
- [ ] Add Pursuit create/edit modal with full CRM fields
- [ ] Write Vitest tests for pursuits schema validation and CSV parsing
- [ ] Save checkpoint and deliver

## Feature: Email Invite Delivery
- [ ] Research Manus built-in email/notification API for sending transactional email
- [ ] Add sendInviteEmail tRPC procedure to invites router (recipient email, invite URL, invite code, role, sender name)
- [ ] Update Admin panel invite form: add recipient email field, wire Send Email button
- [ ] Show sent confirmation with recipient address in the invite list
- [ ] Write Vitest tests for email invite input validation
- [ ] Save checkpoint and deliver
