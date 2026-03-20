# 💸 Splito — Roommate Expense Splitter

> Split expenses fairly with roommates. Pay instantly via UPI — PhonePe, Google Pay, Paytm, BHIM.

[![Deploy to GitHub Pages](https://github.com/YOUR_USERNAME/splito/actions/workflows/deploy.yml/badge.svg)](https://github.com/YOUR_USERNAME/splito/actions/workflows/deploy.yml)

**Live app:** https://YOUR_USERNAME.github.io/splito

---

## Features

- 🔐 **Google + Email/Password auth** — sign in instantly
- 👥 **Multiple groups** — separate groups for flat, trips, office
- 💰 **3 split types** — equal, by percentage, or exact amounts
- 🪙 **Decimal-precise math** — splits calculated in paise, never floats
- 📊 **Debt minimization** — collapses 20 expenses into the fewest possible transfers
- 💳 **UPI deep links** — one tap opens PhonePe / GPay / Paytm pre-filled
- 🤝 **Settlement tracking** — mark debts as paid, balances update instantly
- 📱 **PWA** — installable on Android and iOS, works offline
- 🔗 **Invite via WhatsApp or SMS** — no app download required to join
- 📂 **3-tab group view** — Expenses (red/amber/green status), Settled, Balances
- 📈 **Spending summary** — per-person breakdown and category chart
- 🗂️ **Expense categories** — Food, Rent, Utilities, Transport, and more

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Database | Firebase Firestore (real-time) |
| Auth | Firebase Authentication |
| Hosting | GitHub Pages |
| PWA | vite-plugin-pwa |

---

## Local Development

### Prerequisites
- Node.js 20+ — https://nodejs.org
- Git — https://git-scm.com
- Firebase account — https://console.firebase.google.com (free)

### 1. Firebase Setup

1. Go to https://console.firebase.google.com → **Create project** → name it `splito`
2. **Authentication** → Get Started → Sign-in method → Enable **Google** and **Email/Password**
3. **Firestore Database** → Create database → **Start in production mode** → region `asia-south1`
4. **Project Settings** (gear icon) → **Add app** → Web `</>` → register as `splito-web`
5. Copy the `firebaseConfig` values shown

### 2. Firestore Indexes

Create these composite indexes in Firebase Console → Firestore → Indexes:

| Collection | Fields | Order |
|---|---|---|
| `groups` | `members` (Array) + `updatedAt` | Descending |
| `expenses` | `groupId` (Asc) + `date` | Descending |
| `settlements` | `groupId` (Asc) + `createdAt` | Descending |

### 3. Install and Run

```bash
git clone https://github.com/YOUR_USERNAME/splito.git
cd splito
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and fill in your Firebase config values

npm run dev
# → http://localhost:5173
```

### 4. Deploy Firestore Security Rules

```bash
npm install -g firebase-tools
firebase login
firebase use splito-app-XXXXX   # your project ID
firebase deploy --only firestore:rules
```

---

## GitHub Pages Deployment

Every push to `main` automatically deploys via GitHub Actions.

### Setup (one time only)

**Step 1 — Enable GitHub Pages:**
- Repo → Settings → Pages → Source → **GitHub Actions** → Save

**Step 2 — Add Firebase secrets:**
- Repo → Settings → Secrets and variables → Actions
- Add these 6 secrets:

| Secret name | Where to find it |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Project Settings → Your apps → SDK config |
| `VITE_FIREBASE_AUTH_DOMAIN` | same |
| `VITE_FIREBASE_PROJECT_ID` | same |
| `VITE_FIREBASE_STORAGE_BUCKET` | same |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | same |
| `VITE_FIREBASE_APP_ID` | same |

**Step 3 — Add GitHub Pages domain to Firebase:**
- Firebase Console → Authentication → Settings → Authorized domains
- Add: `YOUR_USERNAME.github.io`

**Step 4 — Push to deploy:**
```bash
git add .
git commit -m "initial commit"
git push origin main
```

App goes live at `https://YOUR_USERNAME.github.io/splito` in ~2 minutes.

---

## Project Structure

```
splito/
├── public/
│   ├── manifest.json        # PWA manifest
│   ├── icon-192.png         # App icon
│   ├── icon-512.png         # App icon
│   └── 404.html             # GitHub Pages SPA routing fix
├── src/
│   ├── types.ts             # All TypeScript types + CATEGORY_META
│   ├── firebase.ts          # Firebase init + offline persistence
│   ├── main.tsx             # React entry point
│   ├── App.tsx              # Routing + ErrorBoundary + PWA prompt
│   ├── main.css             # Global styles + animations
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── CategoryPicker.tsx   # Expense category selector
│   │   ├── ErrorBoundary.tsx    # Crash recovery screen
│   │   ├── ExpenseCard.tsx      # Expense row with status colors
│   │   ├── GroupSummary.tsx     # Spending breakdown header
│   │   ├── PwaInstallBanner.tsx # "Add to Home Screen" prompt
│   │   ├── SettlementCard.tsx   # Settlement row with delete
│   │   ├── SettleUpSheet.tsx    # UPI payment bottom sheet
│   │   └── ui.tsx               # Shared UI primitives
│   ├── hooks/
│   │   ├── useAuth.ts           # Firebase auth listener
│   │   ├── useClipboard.ts      # Copy with timed feedback
│   │   └── useGroupData.ts      # Group + expense subscriptions
│   ├── pages/
│   │   ├── Login.tsx            # Google + email/password auth
│   │   ├── Dashboard.tsx        # Groups list + net balance
│   │   ├── GroupDetail.tsx      # 3-tab group view
│   │   ├── AddExpense.tsx       # Add expense form
│   │   ├── EditExpense.tsx      # Edit expense form
│   │   └── JoinGroup.tsx        # Invite link handler
│   ├── store/
│   │   └── useStore.ts          # Zustand global state
│   └── utils/
│       ├── firestoreService.ts  # All Firestore read/write
│       ├── paymentLinks.ts      # UPI / WhatsApp link builders
│       └── splitCalculator.ts  # Integer math + debt minimization
├── .env.example             # Environment variable template
├── .github/workflows/
│   └── deploy.yml           # GitHub Actions CI/CD
├── firestore.rules          # Firestore security rules
├── firebase.json            # Firebase hosting config
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

## Key Design Decisions

### Money is always integers (paise)
Never store `450.50`. Always store `45050`. Avoids `0.1 + 0.2 = 0.30000000000000004`. Only convert to display strings at render time.

### Debt minimization algorithm
10 expenses in a 4-person group could theoretically require 30 payments to settle. The greedy net-balance algorithm collapses all debts into the minimum number of transfers — typically 2-3.

### UPI covers all Indian payment apps
One `upi://pay?pa=id@bank&am=450.50&cu=INR` link opens whichever UPI app the user has installed — PhonePe, Google Pay, Paytm, BHIM, or any other. No separate integrations needed.

### No backend server
Firebase Firestore + Security Rules replaces a traditional backend entirely. Real-time sync, auth, and access control — all handled by Firebase at zero cost on the free tier.

### Expense status uses net balance, not FIFO
An expense is marked "settled" only when the debtor has paid off their entire outstanding balance to that creditor across all expenses — not just the amount for one specific expense. This is conservative and honest: a debt isn't truly settled until everything owed is covered.

### Backward compatibility for categories
Older expenses in Firestore have no `category` field. All render paths use `expense.category ?? 'other'` so legacy documents display correctly without any database migration.

---

## Environment Variables

```bash
# .env — copy from .env.example and fill in your values
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

All variables must start with `VITE_` to be accessible in the browser via `import.meta.env`.

---

## License

MIT — free to use, modify, and deploy.
