# NannyElite — Product Requirements Document

## Original Problem Statement
NannyElite is a Swiss nanny/childcare marketplace connecting families with verified caregivers. Built with Vite + React + TypeScript frontend and Supabase backend (auth, database, edge functions).

## Architecture
- **Frontend**: Vite + React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI (server.py) + Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **Auth**: Supabase Auth with Google/Apple OAuth
- **i18n**: i18next with 4 languages (EN, DE, FR, IT)
- **Error Tracking**: Sentry
- **Maps**: Leaflet + OpenStreetMap

## Trust & Verification System (Implemented Feb 2026)

### Components
1. **TrustBadges.tsx** — Badge container + buildBadges() helper
2. **ProfileVisibilitySelector.tsx** — public/members/private selector
3. **CertificateUpload.tsx** — Professional certificate upload
4. **DiditVerificationPopup.tsx** — DIDIT verification (MOCKED, calls backend)
5. **AdminCertificateReview.tsx** — Independent certificate review panel
6. **VerificationProgress.tsx** — Dashboard progress indicator (4 steps)

### Backend API Endpoints (server.py)
- `GET /api/health` — Health check
- `POST /api/didit/create-session` — Create DIDIT verification session (mock when no API key)
- `POST /api/didit/webhook` — Receive DIDIT verification results
- `POST /api/didit/manual-verify` — Admin manual identity verification

### Profile Visibility Enforcement
- Search filters by visibility: public (everyone), members (logged-in), private (contacts/favorites)
- Rejected profiles hidden from search
- Legacy profiles (null status) remain visible for backwards compatibility

### Database Migration Required
File: `/app/supabase/migrations/20260316_trust_verification_system.sql`
- `user_certificates` table
- `profiles.profile_visibility`, `email_verified`, `phone_verified`
- `nanny_profiles.identity_verified`, `identity_verification_status`, `identity_verified_at`, `manual_identity_verified`, `availability_last_updated`

## Test Results
- Iteration 1: 100% frontend pass
- Iteration 2: 100% backend (13/13) + frontend pass

## Pending Tasks
- [ ] Apply Supabase migration SQL
- [ ] Configure real DIDIT_API_KEY in backend .env
- [ ] Phone verification via Twilio (future/optional)

## Backlog
- Loading skeletons
- Bundle size optimization
- Split large components
- i18n for remaining strings
