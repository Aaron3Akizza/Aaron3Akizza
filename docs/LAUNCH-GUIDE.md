# BizFlow — Complete Launch Guide

Everything you need to go from code on your computer to a live system
that 10 clients can use, with an admin dashboard and a custom domain.

---

## PART 1 — SUPABASE SETUP (Database)

### Step 1 — Get your real Supabase anon key

Your current `.env` has the old `sb_publishable_` key format.
You need the standard **anon/public** key.

1. Go to **supabase.com** → open your project
2. Go to **Project Settings → API**
3. Copy the value under **"anon public"** — it starts with `eyJ`
4. Open `C:\Users\Akizza Aaron\Desktop\bizflow\.env` and update it:

```env
VITE_SUPABASE_URL=https://qqzklokmkxgbfdqkmkig.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-real-anon-key-here
```

> **NEVER commit this file to GitHub.** It is already in `.gitignore`. ✅

---

### Step 2 — Run all SQL migrations in order

Go to **Supabase → SQL Editor → New query** and run each file in order.
Copy the full content of each file, paste it, click **Run**.

| Order | File | What it does |
|---|---|---|
| 1 | `db/bizflow_schema.sql` | Users, businesses, roles, auth |
| 2 | `db/phase2_products_inventory.sql` | Products, devices, stock |
| 3 | `db/phase3_sales.sql` | Sales, receipts, payments |
| 4 | `db/phase4_customers_expenses.sql` | Customers, expenses |
| 5 | `db/phase5_patches.sql` | Due dates, triggers, indexes |
| 6 | `db/phase6_inventory_fixes.sql` | Per-device pricing, receiveDevices RPC |
| 7 | `db/phase7_production_fixes.sql` | RLS policies, atomic payment RPC, admin RPCs |
| 8 | `db/phase8_admin.sql` | Platform admin system, subscriptions |

Run them one at a time. If a file succeeds it says **"Success. No rows returned."**

---

### Step 3 — Make yourself a platform admin

After running all migrations, run this in the SQL Editor.
Replace the email with YOUR real email (the one you signed up with).

```sql
insert into public.platform_admins (user_id, note)
select id, 'Founder / System Administrator'
from auth.users
where email = 'your-email@example.com';
```

After this, when you log in to BizFlow you will see **"Platform Admin"**
in the sidebar. Going to `/admin` shows the full dashboard.

---

### Step 4 — Configure Supabase Auth redirect URLs

This is **critical** for email confirmation and password reset to work.

Go to **Supabase → Authentication → URL Configuration**.

Set **Site URL** to your Vercel URL (update after you connect your domain):
```
https://your-app.vercel.app
```

Add all of these to **Redirect URLs** (one per line):
```
http://localhost:5173/auth/callback
https://your-app.vercel.app/auth/callback
https://yourdomain.com/auth/callback
```

> When you connect your custom domain, add it to this list too.
> Without these entries, email verification links will fail.

---

## PART 2 — VERCEL DEPLOYMENT

### Step 1 — Connect your GitHub repo to Vercel

1. Go to **vercel.com** → New Project
2. Import from GitHub → select **Aaron3Akizza/Aaron3Akizza**
3. Vercel auto-detects Vite — confirm these settings:
   - **Framework:** Vite
   - **Root Directory:** `/` (leave blank)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Click **Deploy** — it will fail on first deploy because env vars are missing. That's OK.

---

### Step 2 — Add environment variables in Vercel

Go to your Vercel project → **Settings → Environment Variables**.

Add these two (both for **Production**, **Preview**, and **Development**):

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://qqzklokmkxgbfdqkmkig.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...your-real-anon-key` |

> Only the **anon/public** key goes here. Never add your service role key.

After saving, go to **Deployments → Redeploy** (click three dots → Redeploy).

---

### Step 3 — Turn off Deployment Protection

Go to **Settings → Deployment Protection** → turn off **Vercel Authentication**.

This lets anyone visit the site without needing a Vercel account.

---

### Step 4 — Verify the deployment works

Visit your Vercel URL. Test the full flow:

```
Register → Check email → Click verification link → /auth/callback → 
Set up business → Dashboard loads → Add product → Make a sale → 
Edit profile → Log out → Log back in
```

---

## PART 3 — CUSTOM DOMAIN

### Recommended registrar options (Uganda-friendly)

| Registrar | .com price/yr | Notes |
|---|---|---|
| **Namecheap** | ~$10–12 USD | Cheapest, accepts cards |
| **GoDaddy** | ~$12–15 USD | Easy UI, accepts mobile money via Flutterwave |
| **Google Domains** (now Squarespace) | ~$12 USD | Clean, reliable |
| **Africa-specific: Webhosting.Africa** | Varies | Local support |

**Suggested domain:** `bizflow.app` / `bizflow.ug` / `mybizflow.com`

`.ug` domains (Uganda ccTLD) cost ~$30–50/yr but make the brand local.
`.com` is the most professional and globally recognized.

---

### Connect domain to Vercel

1. Buy your domain from any registrar above
2. In Vercel → **Settings → Domains → Add domain**
3. Type your domain (e.g. `bizflow.app`)
4. Vercel gives you DNS records to add — typically:
   - An **A record** pointing to Vercel's IP, OR
   - A **CNAME record** pointing to `cname.vercel-dns.com`
5. Go to your domain registrar → DNS settings → add those records
6. Wait 5–30 minutes for DNS to propagate
7. Vercel auto-issues a free SSL certificate

After connecting:
- Add the new domain to Supabase redirect URLs
- Update your Supabase **Site URL** to the new domain

---

## PART 4 — COST BREAKDOWN

All prices in USD. Approximate as of 2025.

### Infrastructure costs per month

| Service | Plan | Cost/month | Notes |
|---|---|---|---|
| **Supabase** | Free tier | $0 | Up to 50,000 monthly active users, 500MB DB |
| **Supabase** | Pro (if needed) | $25 | 8GB DB, daily backups, more MAUs |
| **Vercel** | Hobby (free) | $0 | Personal projects, custom domain OK |
| **Vercel** | Pro (if needed) | $20 | Team features, bandwidth, analytics |
| **Domain (.com)** | Any registrar | ~$1/month | ~$10–12/yr billed annually |
| **Domain (.ug)** | Webhosting.Africa | ~$3–4/month | ~$35–50/yr |

### Realistic starting cost for 10 clients

| Scenario | Monthly cost | Annual cost |
|---|---|---|
| **Minimum (free tiers + .com)** | ~$1/month | ~$12/year |
| **Safe (free tiers + .ug domain)** | ~$4/month | ~$50/year |
| **Growth (Supabase Pro + .com)** | ~$26/month | ~$312/year |
| **Professional (Supabase Pro + Vercel Pro + .com)** | ~$46/month | ~$552/year |

> For the first 10 clients, **free Supabase + free Vercel + .com domain** 
> is completely sufficient. Supabase free tier supports up to 
> **50,000 monthly active users** — far more than 10 clients.
> You only need to upgrade when the business grows significantly.

---

## PART 5 — CLIENT PRICING

### What costs are you covering?

At launch (10 clients, free tiers):

| Item | Monthly cost |
|---|---|
| Supabase | $0 |
| Vercel | $0 |
| Domain .com | ~$1 |
| Your time (support + maintenance) | Your value |
| **Total infrastructure** | **~$1/month** |

Even if you upgrade to paid plans for reliability and growth:

| Item | Monthly cost |
|---|---|
| Supabase Pro | $25 |
| Vercel Pro | $20 |
| Domain | $1 |
| **Total infrastructure** | **$46/month** |

---

### Recommended client pricing

| Tier | Price/month (UGX) | Price/month (USD) | What's included |
|---|---|---|---|
| **Starter** | UGX 50,000 | ~$13 | 1 business, 3 staff, full features |
| **Business** | UGX 100,000 | ~$26 | 1 business, 10 staff, priority support |
| **Pro** | UGX 200,000 | ~$52 | 1 business, unlimited staff, premium support |

### Revenue at 10 clients (all on Starter)

```
10 clients × UGX 50,000 = UGX 500,000/month
Infrastructure cost       = UGX 4,000/month (domain only, free tiers)
───────────────────────────────────────────
Net profit                = UGX 496,000/month
```

### Revenue at 10 clients (all on Business)

```
10 clients × UGX 100,000 = UGX 1,000,000/month
Infrastructure (Pro plans) = UGX 170,000/month (~$46)
───────────────────────────────────────────────
Net profit                 = UGX 830,000/month
```

### When should you upgrade Supabase?
- More than **500MB of database storage** (unlikely with 10 clients)
- More than **50,000 monthly active users**
- You need **daily automated backups**
- You need **custom SMTP** (your own email sending)

### When should you upgrade Vercel?
- You need **team collaboration** (multiple developers)
- You need **advanced analytics**
- You have **more than 100GB bandwidth/month** (unlikely at start)

**Recommendation for launch:** Start on all free tiers. Charge UGX 50,000–100,000/month per client. After 10 clients are paying, upgrade to Supabase Pro ($25/month) for peace of mind and daily backups. Keep Vercel free until you genuinely need team features.

---

## PART 6 — SECURITY CHECKLIST

Before going live, confirm every item:

- [ ] `.env` is NOT in GitHub (check: `git log --all -- .env` should return nothing)
- [ ] `VITE_SUPABASE_ANON_KEY` is the **anon** key, NOT the service role key
- [ ] Supabase redirect URLs include your production domain
- [ ] All 8 SQL migration files have been run
- [ ] You have made yourself a platform admin via SQL
- [ ] Vercel Deployment Protection is OFF
- [ ] Email confirmation is working (test with a real email)
- [ ] Password reset is working (test with a real email)
- [ ] A non-admin user cannot access `/admin` (test by logging in as a regular client)
- [ ] One business cannot see another business's data (Row Level Security enforced)

---

## PART 7 — MAKING YOURSELF ADMIN (Quick Reference)

```sql
-- Run in Supabase SQL Editor
-- Replace with your actual email address

insert into public.platform_admins (user_id, note)
select id, 'Founder'
from auth.users
where email = 'your-email@example.com';
```

After running this:
1. Log in to BizFlow normally
2. You will see **"Platform Admin"** link in the sidebar
3. Click it or go to `/admin` — full admin dashboard
4. You can manage all client businesses, change subscription status, suspend accounts

---

## PART 8 — ONBOARDING YOUR FIRST 10 CLIENTS

### What a client does

1. Visits your BizFlow URL (Vercel URL or custom domain)
2. Clicks **Start free trial** on the landing page
3. Fills in name, email, password → clicks **Create account**
4. Receives a verification email → clicks the link
5. Gets redirected to BizFlow → sets up their business (name, currency, etc.)
6. Immediately has access to their full dashboard

### What you do as admin

1. Log in to your admin dashboard at `/admin`
2. See the new business appear in the list (status: **Trial**)
3. When they pay you (Mobile Money), click **Manage** → change status to **Active**
4. Set the subscription expiry date (e.g. 30 days from payment)
5. When subscription expires, the client is notified (future feature) and you can suspend

### Sending payment instructions to clients

When a client signs up, send them this message:

> "Thank you for registering on BizFlow!
> To activate your account, send UGX [amount] to Mobile Money number [your number].
> Use your business name as the reference.
> Your account will be activated within 24 hours of payment.
> For support, contact [your phone/email]."

---

## PART 9 — AFTER DOMAIN PURCHASE CHECKLIST

When you buy your domain, do these in order:

1. **Add domain to Vercel** (Settings → Domains)
2. **Add DNS records** at your registrar as Vercel instructs
3. **Wait for SSL** to be issued by Vercel (automatic, free)
4. **Update Supabase Site URL** to your new domain
5. **Add new domain to Supabase Redirect URLs:**
   ```
   https://yourdomain.com/auth/callback
   ```
6. **Test the full flow** on the new domain
7. **Update your marketing materials** with the new URL

---

## PART 10 — FUTURE FEATURES TO BUILD

After the first 10 clients are live and paying:

| Feature | Value | Effort |
|---|---|---|
| Automated subscription expiry reminders | High | Medium |
| Invoice/receipt PDF generation | High | Medium |
| WhatsApp receipt sharing | High | Low |
| Multi-branch support | Medium | High |
| Mobile app (React Native) | High | Very High |
| SMS notifications | Medium | Medium |
| Automated billing (Flutterwave/MTN API) | High | High |
| Google Search indexing + SEO | High | Low |

---

*Document generated: $(date). BizFlow — Run your business. Grow your profit.*
