# User Acceptance Testing (UAT) Tracker

## P0 - Critical Issues

### [x] FAMILY ONBOARDING BLANK PAGE
- **Problem:** When an unauthenticated user opens `/onboarding/family`, the page sometimes renders blank instead of redirecting to login.
- **Expected behavior:** If user is not authenticated, `/onboarding/family` must redirect to `/login` (same as Nanny onboarding).
- **Action:** Apply same auth guard logic used in nanny onboarding.

### [ ] /ONBOARDING ROUTE RETURNS 404
- **Problem:** The route `/onboarding` returns 404.
- **Clarification:** This is about direct access to `/onboarding`, not necessarily Google or Apple login.
- **Expected behavior:** Either redirect to `/signup` or show role selection and redirect to correct onboarding.
- **Action:** Define one clear behavior for `/onboarding` and remove 404.

### [ ] EMAIL SYSTEM NOT EXECUTING / Fix Email Sending
- **Problem:** Email system is configured but emails are not sent.
- **Cause:** Missing `run_id` in payload.
- **Expected behavior:** Emails are processed successfully without failed jobs.
- **Action:** Add `run_id` and test queue.

### [ ] EMAIL AND OTP VERIFICATION FLOW
- **Current situation:** OTP verification exists but is not properly enforced.
- **Issue:** Email sending fails (run_id), and auto-confirm is enabled, bypassing verification.
- **Expected behavior:** User signs up -> receives email -> must verify before accessing the app.
- **Action:** Fix email sending, disable auto-confirm, and test full verification flow.

### [ ] PROFILE VISIBILITY LOGIC
- **Problem:** Profiles may be created with `profile_visible: false` and never become visible.
- **Expected behavior:** Profile should become visible at the correct moment according to product logic.
- **Action:** Confirm flow and ensure visibility is properly updated.

### [ ] CHILDREN DUPLICATION
- **Problem:** If onboarding or profile save runs more than once, children may be duplicated.
- **Explanation:** System inserts children records each time instead of replacing existing ones.
- **Expected behavior:** Children data should be updated or replaced, not duplicated.
- **Action:** Implement replace or update logic instead of repeated insert.

### [ ] PROFILE_VISIBILITY FIELD
- **Problem:** Code writes to `profile_visibility` but field may not exist in database.
- **Expected behavior:** Field must exist and save correctly or be removed from logic.
- **Action:** Align database and code.

### [ ] AI STEP BLOCKING
- **Problem:** AI step may block onboarding if it fails.
- **Expected behavior:** User can skip AI and continue.
- **Action:** Add skip or manual option.

### [ ] VALIDATION UX
- **Problem:** Validation relies mostly on browser default behavior.
- **Expected behavior:** Clear inline validation messages for required fields and errors.
- **Action:** Implement custom validation messages.

### [ ] TERMS AND CONDITIONS
- **Problem:** No clear enforcement of terms and privacy acceptance.
- **Expected behavior:** User must accept terms and privacy policy before signup.
- **Action:** Add required checkbox and block signup if not accepted.

### [ ] ROUTE PROTECTION
- **Problem:** Auth protection is inconsistent across routes.
- **Expected behavior:** All protected routes follow the same guard logic.
- **Action:** Standardize route protection.

### [ ] SECURITY IMPROVEMENTS
- **Goal:** Ensure no personal information (email, phone, etc.) can be exposed before booking/payment.
- **Action:** Implementation of data masking or restricted access.

---

## P1 - Improvements

### [ ] GOOGLE AND APPLE LOGIN
- **Problem:** Possible 404 or broken flow when using Google or Apple sign in.
- **Expected behavior:** User clicks provider -> Auth completes -> User returns to correct page without error.
- **Action:** Verify provider configuration, redirect URLs, and callback routes. Hide buttons if not ready.

### [ ] UX POLISH
- **Action:** General visual and interaction improvements.

---

## Developer Questions to Resolve
- Is onboarding strictly one time only?
- Can users re-enter onboarding from edit profile?
- When does profile become visible?
- What should `/onboarding` do?
- Should Google and Apple be active now?
- Should OTP verification be mandatory?
