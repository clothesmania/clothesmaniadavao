---
status: complete
---

# Summary

Added accessible password visibility controls to admin sign-in, signup, and password recovery. New and recovered passwords must be at least 14 characters and include lowercase, uppercase, a number, and a symbol. Added 2 regression tests; all 17 focused tests pass. Existing passwords and Supabase-wide authentication settings were left unchanged to avoid unexpectedly blocking current admins. The changes have not been deployed.
