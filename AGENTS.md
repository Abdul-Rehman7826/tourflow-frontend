<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## TourFlow Project Guidance

These rules apply to the entire repository and are maintained separately from
the generated Next.js block above.

1. Read `PROJECT_PROGRESS.md` before substantial implementation, refactoring,
   branch integration, or architecture work.
2. Update `PROJECT_PROGRESS.md` when a milestone, route, data contract,
   persistence key, role boundary, invariant, test result, or known limitation
   changes. Keep verified current-branch behavior separate from work that only
   exists on another branch.
3. Preserve tenant scoping and enforce RBAC in navigation, route rendering,
   context mutations, and sensitive exports. Client-side guards and
   `localStorage` are prototype controls, not production security.
4. Keep shared business mutations in `context/DataContext.tsx` or focused pure
   helpers under `lib/`; do not create disconnected component-only copies of
   authoritative ERP state.
5. On Windows PowerShell, use `npm.cmd` and `npx.cmd` when script execution
   policy blocks the `.ps1` launchers.
6. Validate focused behavior, TypeScript, changed-source lint,
   `git diff --check`, and the production build. Report pre-existing failures
   and unperformed browser QA separately from successful checks.
