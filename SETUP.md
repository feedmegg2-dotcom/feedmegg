# feedme.gg — Complete Setup & Deployment Guide

## Overview
feedme.gg is a Next.js 14 application using:
- **Vercel** for hosting
- **Supabase** for database and authentication
- **SumUp** for payment links
- **What3Words** for address lookup
- **Resend** for email
- **OpenAI** for AI features (allergens, calories)

---

## Step 1 — Create Your Accounts

### 1.1 GitHub
1. Go to **github.com** and sign up
2. Create a new repository called `feedmegg`
3. Upload the contents of this folder to that repository

### 1.2 Supabase
1. Go to **supabase.com** and sign up
2. Create a new project called `feedmegg`
3. Choose a strong database password (save it!)
4. Once created, go to **Settings → API**
5. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

### 1.3 Run Database Schema
1. In Supabase, go to **SQL Editor**
2. Open `supabase/schema.sql` from this project
3. Paste it in and click **Run**
4. Then open `supabase/seed.sql` and run that too

### 1.4 Vercel
1. Go to **vercel.com** and sign up with your GitHub account
2. Click **Add New Project**
3. Import your `feedmegg` GitHub repository
4. **DO NOT deploy yet** — add environment variables first (Step 2)

### 1.5 SumUp Developer Account
1. Go to **developer.sumup.com**
2. Sign up / log in
3. Create a new application
4. Get your `Client ID` and `Client Secret`

### 1.6 What3Words API
1. Go to **what3words.com/select-plan** → choose free Developer plan
2. Create an API key
3. Copy the key → `NEXT_PUBLIC_W3W_API_KEY`

### 1.7 Resend (Email)
1. Go to **resend.com** and sign up
2. Create an API key
3. Add your domain (feedme.gg) and verify it
4. Copy the API key → `RESEND_API_KEY`

### 1.8 OpenAI (for AI features)
1. Go to **platform.openai.com**
2. Create an API key
3. Copy it → `OPENAI_API_KEY`

---

## Step 2 — Configure Environment Variables

In Vercel, go to your project → **Settings → Environment Variables**

Add each variable from the `.env.example` file:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=https://feedme.gg
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
SUMUP_CLIENT_ID=your-sumup-client-id
SUMUP_CLIENT_SECRET=your-sumup-client-secret
NEXT_PUBLIC_W3W_API_KEY=your-w3w-key
RESEND_API_KEY=re_xxx
EMAIL_FROM=hello@feedme.gg
OPENAI_API_KEY=sk-xxx
NEXT_PUBLIC_APP_URL=https://feedme.gg
CRON_SECRET=generate-a-random-string
```

---

## Step 3 — Configure Your Domain

### Point feedme.gg to Vercel
1. In Vercel → Project → **Settings → Domains**
2. Add `feedme.gg` and `www.feedme.gg`
3. In your domain registrar (where you bought feedme.gg):
   - Add a CNAME record: `www` → `cname.vercel-dns.com`
   - Add an A record: `@` → `76.76.21.21`
4. Wait 5-30 minutes for DNS to propagate

### Set up subdomains
Add these in Vercel Domains:
- `merchants.feedme.gg` → points to same project
- `admin.feedme.gg` → points to same project
- `status.feedme.gg` → points to same project

---

## Step 4 — Deploy

1. In Vercel, click **Deploy**
2. Wait ~2 minutes for build to complete
3. Visit feedme.gg — it should be live!

---

## Step 5 — Configure SumUp Webhook

1. In SumUp developer portal, add webhook URL:
   `https://feedme.gg/api/sumup/webhook`
2. Select event: `CHECKOUT_STATUS_CHANGED`
3. Save

---

## Step 6 — Add Your First Restaurant

1. Go to **admin.feedme.gg**
2. Log in with your admin credentials
3. Click **+ Add Restaurant**
4. Enter restaurant details + their food.gg URL
5. Click **Import from food.gg** — menu auto-populates
6. Set the merchant's SumUp API key
7. Restaurant is live on feedme.gg!

---

## URLs After Deployment

| URL | Purpose |
|-----|---------|
| feedme.gg | Customer ordering app |
| merchants.feedme.gg/terminal | Tablet terminal for orders |
| merchants.feedme.gg/dashboard | Merchant stats & menu management |
| admin.feedme.gg | Your platform admin |
| status.feedme.gg | System status page |

---

## Making Changes After Deployment

### Option 1 — Edit on GitHub (easiest)
1. Go to your file on github.com
2. Click the ✏️ pencil icon
3. Make your change
4. Click "Commit changes"
5. Vercel automatically redeploys in ~60 seconds

### Option 2 — Tell Glen's developer (Claude!)
1. Describe what you want to change
2. Get the exact code
3. Paste it into GitHub
4. Done!

### Option 3 — GitHub Desktop (for bulk changes)
1. Download GitHub Desktop app
2. Clone your repository
3. Make changes locally
4. Push to GitHub
5. Vercel auto-deploys

---

## Cron Jobs (Automatic Tasks)

These run automatically via Vercel Cron:

| Job | Schedule | Purpose |
|-----|----------|---------|
| food.gg availability sync | Every 2 minutes | Check if items are disabled on food.gg |
| food.gg full menu sync | Every 6 hours | Check for price/description changes |
| Order timeout cleanup | Every 3 minutes | Cancel unpaid orders after 2 mins |

---

## Merchant SumUp Setup

Each merchant needs to provide you with:
1. Their SumUp API key
2. Their SumUp merchant code

You enter these in admin.feedme.gg → Merchants → Edit → SumUp Settings

Payments then go DIRECTLY to the merchant's SumUp account. You collect commission monthly via invoice.

---

## Monthly Commission Process

1. Go to admin.feedme.gg → Commission
2. View each merchant's commission owed
3. Click "Generate Invoice" — sends PDF to merchant
4. Merchant pays within 7 days
5. Mark as paid in the system
6. Trial merchants show as "Trial — no invoice"

---

## Backups

- Supabase automatically backs up your database hourly
- Merchants can download their menu backup from their dashboard
- You can export all data from Supabase → Storage at any time

---

## Support

If something breaks:
1. Check **status.feedme.gg** first
2. Check Vercel logs: vercel.com → Project → Functions → Logs
3. Check Supabase logs: supabase.com → Project → Logs

---

## Costs (Monthly)

| Service | Cost |
|---------|------|
| Vercel (Hobby) | Free |
| Supabase (Free tier) | Free |
| Vercel (Pro - when you scale) | $20/month |
| Supabase (Pro - when you scale) | $25/month |
| Resend (100 emails/day free) | Free to start |
| OpenAI (AI features) | ~$5-20/month |
| **Total to start** | **Free** |
| **Total when scaling** | **~£40/month** |

Your commission revenue should far exceed running costs!

---

*Built by Claude for Glen — feedme.gg 2026*
