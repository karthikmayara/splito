<div align="center">

# 💸 Splito

### Split expenses with roommates. Pay instantly via UPI.

**Free forever · No app download · Works on any device**

[Live App](https://splito-app-98600.web.app) · [Report a Bug](https://github.com/karthikmayara/splito/issues) · [Request a Feature](https://github.com/karthikmayara/splito/issues)

</div>

---

## What is Splito?

Splito is a **Progressive Web App** for splitting shared expenses with roommates, flat-mates, and travel groups. Add an expense, split it however you want, and pay your share in one tap via UPI — no account needed for the person receiving money, no app download required for anyone.

Built specifically for **India-first usage** with UPI at its core, but works globally with USD, EUR, and GBP support too.

---

## How Splito is different

Most expense splitter apps were built for the US market. Splitwise requires a paid subscription for basic features. Tricount has no payment links. None of them support UPI natively.

Splito is different in four ways:

**1. One-tap UPI payments**
When you owe someone money, tap Pay. Your phone opens PhonePe, Google Pay, or Paytm with the amount and recipient already filled in. No copy-pasting UPI IDs, no manual entry. One `upi://pay` deep link works across every UPI app — the OS asks which one to use.

**2. Decimal-precise splits down to the paisa**
Most apps round splits to the nearest rupee. Splito splits to the paisa using integer arithmetic (no floating point errors). ₹100 split 3 ways = ₹33.34, ₹33.33, ₹33.33 — the extra paisa is assigned transparently using the largest-remainder method.

**3. Debt minimization algorithm**
10 expenses don't create 10 separate payments. Splito's algorithm collapses all outstanding debts into the minimum number of transfers needed to fully settle a group. A group of 5 people with 20 expenses might only need 4 payments total.

**4. No app download required**
Splito is a PWA — it runs in the browser and can be installed directly to the home screen from Chrome or Safari. Invite roommates via WhatsApp or SMS with a single link. They open the link, sign in with Google, and they're in the group immediately.

---

## Features

### Expense management
- Equal, percentage, or exact amount splits
- 8 expense categories with auto-detection from title
- Edit and delete expenses with recalculation
- Notes and date tracking per expense

### Groups & balances
- Multiple groups (flat expenses, trip expenses, etc.)
- Real-time balance updates across all members
- 3-tab view: Expenses · Settled · Balances
- Color-coded expense status — red (unpaid), amber (partial), green (settled)
- Group spending summary with per-person and category breakdown

### Payments
- UPI deep links — PhonePe, Google Pay, Paytm, BHIM
- Cash payment recording
- Settlement tracking with delete + revert
- Automatic balance recalculation on settlement

### Sharing & invites
- Invite via WhatsApp or SMS
- Join via link — no app download needed
- Works on any device with a browser

### Technical
- Works offline — Firestore IndexedDB caching
- Installable PWA — add to home screen
- Real-time sync across all group members
- Google + Email/Password authentication
- Firebase free tier — handles hundreds of users at zero cost

---

## Roadmap

These features are planned for upcoming releases:

| Feature | Status |
|---|---|
| Receipt photo upload | Planned |
| Export to PDF / CSV | Planned |
| Group archiving | Planned |
| Spending charts (monthly, category) | Planned |
| Recurring expenses (monthly rent, WiFi) | Planned |
| Multi-currency per expense | Planned |
| Push notifications | Planned |

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Database | Firebase Firestore |
| Auth | Firebase Auth (Google + Email/Password) |
| Hosting | Firebase Hosting |

---

## Key technical decisions

**Money stored as integers**
All amounts are stored in paise (smallest currency unit). ₹450.50 is stored as `45050`. This eliminates floating point errors entirely — `0.1 + 0.2` in JavaScript gives `0.30000000000000004`, which is unacceptable for financial data.

**No backend server**
Firebase Firestore Security Rules replace a traditional auth middleware layer. Rules run on Google's servers and cannot be bypassed from the browser. The entire app runs on Firebase's free tier.

**Offline first**
Firestore's `persistentLocalCache` with `persistentMultipleTabManager` caches all reads to IndexedDB. Users can view their groups and expenses without internet. Writes are queued and synced automatically on reconnect.

**UPI protocol**
UPI is a protocol, not an app. `upi://pay?pa=handle@bank&am=450.50&cu=INR` opens any UPI-compatible app on the device. One link covers PhonePe, GPay, Paytm, BHIM, and every other UPI client — no app-specific integrations needed.

---

## License

MIT — free to use, modify, and deploy.
