# 💸 Splito — Roommate Expense Splitter

Split expenses fairly. Pay instantly via UPI (PhonePe, Google Pay, Paytm).

## Quick Start

### 1. Prerequisites
- Node.js 20+ — https://nodejs.org
- Git — https://git-scm.com
- A Firebase account — https://console.firebase.google.com (free)

### 2. Firebase Setup
1. Go to https://console.firebase.google.com → Create project → name it "splito"
2. Click **Authentication** → Get Started → Enable **Google** sign-in
3. Click **Firestore Database** → Create database → Start in **test mode**
4. Click **Project Settings** (gear icon) → **Add app** → Web (`</>`)
5. Copy the `firebaseConfig` values

### 3. Install & Run
```bash
git clone <your-repo>
cd splito
npm install

# Create your .env file
cp .env.example .env
# Open .env and fill in your Firebase config values

npm run dev
# → App runs at http://localhost:5173
```

### 4. Deploy Firestore Security Rules
```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # select your project
firebase deploy --only firestore:rules
```

### 5. Deploy to Firebase Hosting (free)
```bash
npm run build
firebase init hosting     # set public dir to "dist", SPA = yes
firebase deploy --only hosting
# → Live at https://your-project.web.app
```

---

## Project Structure
```
src/
├── types.ts                 # All TypeScript types
├── firebase.ts              # Firebase init
├── main.tsx / App.tsx       # Entry + routing
├── hooks/
│   └── useAuth.ts           # Auth listener + sign in/out
├── store/
│   └── useStore.ts          # Global state (Zustand)
├── utils/
│   ├── splitCalculator.ts   # Integer math, debt minimization
│   ├── paymentLinks.ts      # UPI / WhatsApp link builders
│   └── firestoreService.ts  # All Firestore read/write
└── pages/
    ├── Login.tsx            # Google sign-in
    ├── Dashboard.tsx        # Groups + net balance
    ├── GroupDetail.tsx      # Expenses + settle up
    ├── AddExpense.tsx       # Add expense form
    └── JoinGroup.tsx        # Invite link handler
```

## Key Design Decisions

**Money is always integers (cents/paise)**
Never `450.50`. Always `45050`. Avoids `0.1 + 0.2 = 0.30000000000000004`.

**Debt minimization**
10 expenses don't create 10 payments. The algorithm collapses them into the minimum number of transfers needed.

**UPI covers all Indian apps**
One `upi://pay?...` link works for PhonePe, Google Pay, Paytm, and BHIM. The OS asks which app to use.

**No backend server**
Firebase Firestore + Security Rules = your backend. Free tier handles ~hundreds of users easily.

## Environment Variables
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```
