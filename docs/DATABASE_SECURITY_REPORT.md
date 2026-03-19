# NannyElite Database & Security Report (March 2026)

This document provides a comprehensive overview of the database schema, security policies, and administrative features based on the applied migration history.

## 1. Core Architecture
The system uses a multi-role architecture (Family, Nanny, Admin, Moderator, Support) built on Supabase.

### Primary Tables:
- `profiles`: Base user information (ID, role, full_name, is_seeded).
- `nanny_profiles`: Extended data for caregivers (experience, rates, certifications, verification status).
- `family_profiles`: Extended data for families (household info, requirements).
- `user_roles`: Security-critical table mapping users to their application roles.
- `user_certificates`: Centralized tracking for professional certifications and IDs.
- `jobs` & `job_applications`: The marketplace engine.
- `conversations` & `messages`: Secure internal messaging.

---

## 2. Admin System & Credentials

### Administrative Access:
Admin status is determined by the `user_roles` table. The following roles grant administrative or elevated access:
- `admin`: Full system access, including deletion and status overrides.
- `moderator`: Access to review profiles, documents, and references.
- `support`: Access to view bookings and system logs.

### Known Admin User:
Based on migration `20260317000001`, a temporary administrative user is configured:
- **User ID:** `aa18e6f6-2249-415a-ae95-9fc1e43acf23`
- **Email:** `temp.admin.1773708390929@nannyelite.ch`
- **Password:** *[Set during manual creation in Supabase Auth]*

### Admin Interface Features:
The frontend contains a dedicated Admin Dashboard (`/src/pages/AdminDashboard.tsx`) with the following capabilities:
- **Profile Review:** Approve or reject nanny and family profiles.
- **Certificate Management:** Review and verify uploaded certifications.
- **Job Marketplace Control:** Manage job source (Family vs. Platform) and status.
- **Data Cleanup:** Ability to delete profiles and manage "Seeded" (demo) vs. "Real" user data.

---

## 3. Row Level Security (RLS) Policies

The system implements strict RLS to ensure data privacy:

### For Nannies:
- Can only update their own `nanny_profile`.
- Can view approved public profiles of other nannies.
- Can view their own private documents and certificates.

### For Families:
- Can manage their own `family_profile` and `children` records.
- Can only view `children` of other families if they have a confirmed booking with them.
- Can create and manage their own job postings.

### For Admins (Global Policies):
- **is_admin() Helper:** A central function used across the database to verify `admin` or `moderator` roles.
- **Delete Access:** Admins have exclusive permission to DELETE records from `profiles`, `jobs`, `user_roles`, and `user_certificates`.
- **Status Control:** Only Admins can modify `profile_status` (pending/approved/rejected) on nanny and family profiles.

---

## 4. Trust & Verification Workflow

1. **Identity:** Verified via the `didit-verification` edge function or manual admin check.
2. **Certificates:** Nannies upload documents to `user_certificates`. 
3. **Approval:** Admin reviews the `user_certificates` and `nanny_profile`. 
4. **Visibility:** Once `profile_status` is set to 'approved' by an admin, the profile becomes visible in the public marketplace.

---

## 5. Seeded Data Management
Migrations now include an `is_seeded` boolean.
- **is_seeded = true:** Demo/Test data (appears with an 'S' badge in admin).
- **is_seeded = false:** Real user data (appears with an 'R' badge in admin).
This allows for easy filtering and cleanup of test accounts without affecting real customers.
