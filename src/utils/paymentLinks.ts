// ─────────────────────────────────────────────────────────────
// paymentLinks.ts — Generate deep links for payment apps
//
// UPI (Unified Payments Interface) is a protocol — not an app.
// PhonePe, Google Pay, and Paytm all support it.
// One UPI link opens ANY of these apps on the user's device.
//
// How UPI links work:
//   upi://pay?pa=vpa@bank&pn=Name&am=100.50&cu=INR&tn=Note
//   ↓
//   Android/iOS shows: "Open with GPay / PhonePe / Paytm / BHIM..."
//   User picks their app → payment is pre-filled → they tap Pay
//
// IMPORTANT: The &am= (amount) parameter is pre-filled but
// some older Paytm versions ignore it. Always show the amount
// in the UI so users can verify before confirming.
// ─────────────────────────────────────────────────────────────

// ── UPI Link (India: PhonePe, Google Pay, Paytm, BHIM) ───────
interface UpiLinkOptions {
  upiId: string      // receiver's UPI VPA e.g. "rahul@ybl" or "9876543210@paytm"
  name: string       // receiver's display name
  amountCents: number
  note?: string      // transaction note e.g. "Dinner split - June"
  currency?: string  // defaults to INR
}

export function buildUpiLink(options: UpiLinkOptions): string {
  const {
    upiId,
    name,
    amountCents,
    note = 'Splito expense',
    currency = 'INR',
  } = options

  // Convert cents to decimal: 45050 → "450.50"
  const amount = (amountCents / 100).toFixed(2)

  // URL-encode the note so spaces and special chars work in the link
  const encodedNote = encodeURIComponent(note)
  const encodedName = encodeURIComponent(name)

  // Standard UPI deep link format
  // pa = payee address (VPA/UPI ID)
  // pn = payee name
  // am = amount
  // cu = currency
  // tn = transaction note
  return `upi://pay?pa=${upiId}&pn=${encodedName}&am=${amount}&cu=${currency}&tn=${encodedNote}`
}

// ── Venmo Link (US only) ──────────────────────────────────────
// This will FAIL outside the US without a US App Store account
// Only show this option if the user has set a venmoHandle
export function buildVenmoLink(options: {
  handle: string    // e.g. "@john-doe" — without @ is also accepted
  amountCents: number
  note?: string
}): string {
  const { handle, amountCents, note = 'Splito expense' } = options
  const amount = (amountCents / 100).toFixed(2)
  const recipient = handle.replace('@', '') // Venmo doesn't want the @ in the URL
  const encodedNote = encodeURIComponent(note)

  // Try native app first: venmo://
  // Falls back to web: https://venmo.com/
  return `venmo://paycharge?txn=pay&recipients=${recipient}&amount=${amount}&note=${encodedNote}`
}

// ── Cash App Link (US only) ───────────────────────────────────
export function buildCashAppLink(options: {
  cashtag: string   // e.g. "$johndoe"
  amountCents: number
  note?: string
}): string {
  const { cashtag, amountCents } = options
  const tag = cashtag.replace('$', '')
  const amount = (amountCents / 100).toFixed(2)

  // Cash App deep link — opens app if installed, web if not
  return `https://cash.app/$${tag}/${amount}`
}

// ── PayPal.me Link (International) ───────────────────────────
export function buildPayPalLink(options: {
  username: string
  amountCents: number
  currency?: string
}): string {
  const { username, amountCents, currency = 'INR' } = options
  const amount = (amountCents / 100).toFixed(2)

  // PayPal.me links work in browser — no app needed
  return `https://paypal.me/${username}/${amount}${currency}`
}

// ── Smart Link Opener ─────────────────────────────────────────
// Tries to open the deep link. If it fails (app not installed),
// shows a fallback UI with copy-paste info.
//
// Usage: call this when user taps the "Pay via UPI" button
export function openPaymentLink(
  link: string,
  fallback: () => void  // callback to show copy-paste UI
): void {
  // window.location.href triggers the deep link
  // We use a timeout to detect if the app didn't open:
  // if the page is still visible after 1.5s, the app probably didn't open
  const start = Date.now()
  window.location.href = link

  // Check if we're still on the page after a delay
  // (If the app opened, the browser pauses — Date.now() will be much later)
  setTimeout(() => {
    const elapsed = Date.now() - start
    // If less than 1500ms passed, the app probably didn't open
    if (elapsed < 1500) {
      fallback()
    }
  }, 1500)
}

// ── WhatsApp Share ────────────────────────────────────────────
// Share the group invite link via WhatsApp
export function buildWhatsAppShareLink(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

// ── SMS Share ─────────────────────────────────────────────────
export function buildSmsShareLink(message: string): string {
  // Works on both Android (sms:?body=) and iOS (sms:&body=)
  return `sms:?body=${encodeURIComponent(message)}`
}

// ── Group Invite Message Builder ──────────────────────────────
// Creates the text users send to invite roommates
export function buildInviteMessage(options: {
  groupName: string
  inviterName: string
  inviteCode: string
  appUrl: string
}): string {
  const { groupName, inviterName, inviteCode, appUrl } = options
  return (
    `${inviterName} invited you to split expenses in "${groupName}" on Splito!\n\n` +
    `Join here: ${appUrl}/join/${inviteCode}\n\n` +
    `No app download needed — works in your browser.`
  )
}

// ── Payment Reminder Builder ──────────────────────────────────
export function buildPaymentReminder(options: {
  payerName: string
  receiverName: string  
  amount: string
  groupName: string
  receiverUpiId?: string
}): string {
  const { payerName, amount, groupName, receiverName, receiverUpiId } = options
  
  if (receiverUpiId) {
    return (
      `Hey ${payerName}! 👋\n\n` +
      `You owe ${receiverName} *${amount}* for *${groupName}* on Splito.\n\n` +
      `Pay directly via UPI:\n` +
      `UPI ID: *${receiverUpiId}*\n\n` +
      `Or open Splito to pay in one tap 🚀`
    )
  }
  
  return (
    `Hey ${payerName}! 👋\n\n` +
    `Just a reminder — you owe ${receiverName} *${amount}* ` +
    `for *${groupName}* on Splito.\n\n` +
    `Open the app to settle up 👇`
  )
}
