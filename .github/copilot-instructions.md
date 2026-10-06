# Copilot instructions — BizFlow

These instructions apply to any AI-assisted change in this repository
(GitHub Copilot, Copilot Chat, or any other coding agent).

1. **BizFlow is a SaaS application for small phone shops and phone-accessory
   shops.** Every feature decision should be evaluated against that specific
   use case, not "businesses in general."

2. **Inspect existing code before modifying it.** Read the relevant files in
   full before proposing a change. Do not assume file contents from their
   names.

3. **Reuse the current stack.** React + TypeScript/JSX + Vite + Tailwind CSS
   + react-router-dom. Do not introduce a different framework, styling
   system, state manager, or build tool without an explicit, separate
   request to do so.

4. **Do not replace working architecture unnecessarily.** If something
   already works, extend it — don't rewrite it as a side effect of an
   unrelated task.

5. **Do not redesign the existing UI unless explicitly instructed.** Match
   the patterns in `docs/BIZFLOW-DESIGN-SYSTEM.md` exactly — same color
   classes, same component patterns, same spacing conventions.

6. **Follow `docs/BIZFLOW-ARCHITECTURE.md`** for how the frontend, backend,
   and database are (or are not) structured.

7. **Follow `docs/BIZFLOW-DESIGN-SYSTEM.md`** for all visual decisions —
   colors, typography, spacing, component patterns.

8. **Follow `docs/PHONE-SHOP-MVP.md`** for product behavior — especially the
   quantity-vs-device (IMEI) tracking distinction, credit/debt handling, and
   the revenue/COGS/profit calculation rules. Do not simplify these away.

9. **Maintain strict business-data isolation.** Every business-scoped table
   carries a `business_id`. Any new query, endpoint, or UI screen that reads
   or writes business data must be scoped to the current user's business
   (or businesses, via `business_members`) — never trust a client-supplied
   `business_id` without verifying membership server-side.

10. **Do not create fake backend integrations.** If a backend or database
    call is not actually implemented, say so in code comments and in
    `docs/BIZFLOW-STATUS.md` — do not silently stub it with a fake success
    response that looks real.

11. **Do not claim functionality is complete when it is mocked.** Update
    `docs/BIZFLOW-STATUS.md` honestly whenever the true state of a feature
    changes — including moving something from "Frontend Only" to
    "Implemented" only once it's actually wired to real data.

12. **Validate inputs on both frontend and backend** once a backend exists.
    Frontend validation alone is not sufficient for anything that touches
    money, stock, or credentials.

13. **Handle errors properly.** No silent failures — show the user
    something meaningful, and don't let a failed request look like success.

14. **Prefer reusable components and services.** `Button`, `Badge`, and
    `TextField` are currently duplicated between `LandingPage.jsx` and
    `AppShell.jsx` — new shared UI should go in `src/components/`, and
    consolidating the existing duplicates is welcome as a deliberate,
    reviewed refactor (not an incidental one).

15. **Avoid unnecessary dependencies.** Check `package.json` before adding a
    library — prefer what's already installed (`lucide-react` for icons,
    Tailwind for styling, `react-router-dom` for routing).

16. **Explain important architectural changes.** If a change affects data
    model, routing structure, auth flow, or the design system, say so
    clearly in the PR/commit description and update the relevant doc.

17. **Test changes where possible.** No test runner is configured yet
    (see `docs/BIZFLOW-STATUS.md`); at minimum, run `npm run build` before
    considering a change done, since that catches broken imports/routes/TS
    errors.

18. **Preserve existing functionality.** Before finishing a task, confirm
    the landing page (`/`) and the app shell (`/app`) still render and
    build correctly.
