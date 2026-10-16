# Quick Task Plan

## Objective

Add accessible password visibility controls to the sign-in and account forms, and prevent weak admin passwords during signup and recovery.

## Tasks

1. Add show/hide controls to sign-in and signup password fields.
2. Require a robust password policy for account creation and password recovery, with clear guidance.
3. Add focused tests for visibility controls and policy enforcement.
4. Verify whether the connected Supabase Auth project has a matching server-side password policy.

## Completion

- Added accessible show/hide password buttons to sign-in, signup, and password-recovery fields; visibility resets when switching auth screens.
- Signup and password recovery now require 14+ characters, lowercase, uppercase, a number, and a symbol, with plain-language guidance.
- Added regression tests for the visibility control and every password rule; focused suite passes 17/17.
- Did not strengthen the Supabase-wide password rule: Supabase warns that weaker existing passwords may then be rejected during sign-in, which could lock current admins out until reset. The UI enforces the rule for new and reset passwords without changing existing logins.
- Changes are local and not deployed yet.
