# ⬡ OPTX PRO — Options Trade Tracker

A Bloomberg-terminal-style options trading tracker with S&P 500 comparison, analytics, and Greeks tracking.

## 🚀 Deploy to Vercel in 3 steps

### Step 1 — Push to GitHub

```bash
# In this folder:
git init
git add .
git commit -m "Initial commit — OPTX PRO"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/optx-pro.git
git branch -M main
git push -u origin main
```

### Step 2 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"**
3. Import your `optx-pro` repo
4. Leave all settings as default (Vercel auto-detects Vite)
5. Click **Deploy** ✓

### Step 3 — Done!

Your site will be live at `https://optx-pro.vercel.app` (or similar).

---

## 💻 Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

## 🏗️ Build for production

```bash
npm run build
```

---

## Features

- **Overview** — KPIs, cumulative P/L, monthly P/L, per-trade bars, quick stats
- **Log** — Full trade table with sort, filter, expand rows, edit/duplicate/delete
- **Analytics** — Ann. ROC, IV vs P/L, days held, strategy breakdown, Greeks summary
- **vs Market** — Your returns vs S&P YTD, S&P historical avg, T-Bill rate
- **Add Trade** — Strategy, Greeks, DTE, tags, notes, live preview, auto-collateral
- **Export CSV** — Download all trades as CSV
- **Persistent** — All trades saved to localStorage in your browser

## Tech Stack

- React 18
- Recharts
- Vite
- Deployed on Vercel
