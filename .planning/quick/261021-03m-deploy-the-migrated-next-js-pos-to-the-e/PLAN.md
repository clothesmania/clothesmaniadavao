# Production deployment plan

Deploy the existing reviewed Next.js migration to the user's existing Vercel project and verify the live public shell without writing business records.

1. Check GitHub and the existing authenticated Vercel project. Configure the repository root, Next.js defaults, Node 22, and the supplied public Supabase environment variables where needed.
2. Deploy the existing migration commit to Production using the connected repository. Preserve the current production domain and all Supabase data/security settings.
3. Wait for Vercel's successful deployment, verify the live routes/assets and browser sign-in screen, and record the deployment URL and remaining authenticated-sync limitation.

The user explicitly authorized production deployment on 2026-10-21. Execute inline using the GSD quick workflow. Initial read-only checks found origin/main already contains migration commit 8e0d3b1 and documentation commit 08fceae; no source push is currently needed.
