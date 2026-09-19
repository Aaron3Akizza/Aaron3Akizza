# Connecting BizFlow to Supabase

This guide walks you through everything from creating your Supabase project to having a fully working app. Follow the steps in order.

---

## Step 1 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in (or create a free account).
2. Click **New project**.
3. Give it a name like `bizflow`, choose your region (pick the closest one to Uganda — `eu-west-2` London or `ap-southeast-1` Singapore are good choices), and set a strong database password. Save that password somewhere safe.
4. Wait about 2 minutes for the project to finish setting up.

---

## Step 2 — Get your API keys

1. In your Supabase project, go to **Project Settings → API**.
2. Copy two values:
   - **Project URL** — looks like `https://abcdefghijkl.supabase.co`
   - **anon / public key** — the long `eyJ...` string under "Project API keys"

---

## Step 3 — Add environment variables to BizFlow

In your BizFlow project folder, there is a file called `.env.example`. Copy it to `.env`:

```
# In your BizFlow folder, run:
copy .env.example .env
```

Open `.env` and fill in your two values:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJyour-anon-key-here
```

Save the file. Never share this file or commit it to git (it is already in `.gitignore`).

---

## Step 4 — Run the SQL migrations

You need to run 4 SQL files against your Supabase database **in this exact order**:

1. `db/bizflow_schema.sql` — users, businesses, roles
2. `db/phase2_products_inventory.sql` — products, devices, stock movements
3. `db/phase3_sales.sql` — customers, sales, payments, receipts
4. `db/phase4_customers_expenses.sql` — expenses table, customer notes

### How to run them

**Option A — Supabase SQL Editor (easiest)**

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open `db/bizflow_schema.sql` in a text editor, copy all the content, paste it into the SQL Editor, and click **Run**.
4. Wait for it to say "Success". If you see an error, read it — most errors at this stage are about running the same migration twice (safe to ignore if it says "already exists").
5. Repeat for each of the other 3 files in order.

**Option B — Supabase CLI (for developers)**

```bash
# Install the CLI if you haven't already
npm install -g supabase

# Login
supabase login

# Link to your project (get your project ref from Settings → General)
supabase link --project-ref your-project-ref

# Run each file
supabase db execute --file db/bizflow_schema.sql
supabase db execute --file db/phase2_products_inventory.sql
supabase db execute --file db/phase3_sales.sql
supabase db execute --file db/phase4_customers_expenses.sql
```

---

## Step 5 — Configure Supabase Auth email settings

1. In Supabase, go to **Authentication → Settings**.
2. Under **Email Auth**, make sure it is enabled.
3. Set **Site URL** to `http://localhost:5173` for local development. When you deploy, change this to your real URL.
4. Under **Redirect URLs**, add:
   - `http://localhost:5173/login`
   - `http://localhost:5173/login?mode=update-password`
5. Under **Email Templates**, you can customise the confirmation and password reset emails to say "BizFlow" instead of "Supabase".

---

## Step 6 — Start the app and test

```bash
npm run dev
```

Open `http://localhost:5173`. You should see the BizFlow landing page.

**Test this checklist in order:**

- [ ] Click "Start free trial" → creates an account → confirms email → logs in
- [ ] "Set up your business" form → creates business → lands on Dashboard
- [ ] Dashboard shows "No sales yet" (not hardcoded numbers)
- [ ] Go to Products → Add a phone with IMEI tracking
- [ ] Go to Products → Add an accessory with quantity tracking
- [ ] Go to Sales → New sale → add product → complete the sale
- [ ] Go back to Dashboard → today's sales should now show a real number
- [ ] Go to Customers → the customer from the sale should appear
- [ ] Go to Reports → Sales tab → generate report → see the sale
- [ ] Go to Settings → update business name → save → sidebar updates
- [ ] Log out → "Forgot password?" → enter email → check inbox → reset

---

## Step 7 — Deploying to production

When you're ready to go live (e.g. on Vercel or Netlify):

1. Add your two environment variables (`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`) to your hosting platform's environment settings.
2. Update the **Site URL** in Supabase Auth settings to your real domain.
3. Add your real domain to the **Redirect URLs** list as well.
4. Run `npm run build` locally first to make sure it builds clean before deploying.

---

## Common errors and fixes

| Error | What it means | Fix |
|---|---|---|
| "Supabase is not configured" on login screen | `.env` file is missing or the variable names are wrong | Check `.env` has exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` |
| Login says "invalid login credentials" | Wrong email/password, or email not confirmed | Confirm the email first, then try again |
| Dashboard loads but shows no data | SQL migrations not applied | Run all 4 SQL files in order via the SQL Editor |
| "relation does not exist" error in console | A table is missing | The relevant SQL file has not been run yet |
| Products save but stock doesn't deduct on sale | The `complete_sale` RPC is missing | Re-run `db/phase3_sales.sql` |
| Staff invite sends but user can't access the business | The `business_members` row is not created automatically on invite | After the invited user signs up, an owner needs to run the setup flow or you can insert the row manually in the Supabase Table Editor |
| "permission denied" errors | Row Level Security blocking a query | Make sure the user is an active member of the business (`business_members.is_active = true`) |

---

## Adding a `due_date` column to the sales table

The due date feature requires a column that may not be in the original Phase 3 schema. Run this in the Supabase SQL Editor:

```sql
alter table public.sales add column if not exists due_date date;
```

That's it. One line.

---

## Summary of what connects where

```
Your .env file
  └── VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY
        └── src/lib/supabase.ts  (creates the client)
              └── src/context/AuthContext.tsx  (session, business, role)
                    └── All pages use useAuth() / useBusiness()
```

Every database call goes through the Supabase client in `src/lib/supabase.ts`. Row Level Security (RLS) on every table ensures one business can never see another business's data.
