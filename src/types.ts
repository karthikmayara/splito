// ─────────────────────────────────────────────────────────────
// types.ts — Single source of truth for all data shapes
// Every Firestore document maps 1:1 to a type here
// ─────────────────────────────────────────────────────────────

// ── User ──────────────────────────────────────────────────────
// Stored at: firestore/users/{userId}
export interface User {
  id: string
  name: string
  email: string
  avatar?: string       // Google profile photo URL
  upiId?: string        // e.g. "rahul@ybl" — for PhonePe/GPay/Paytm
  venmoHandle?: string  // e.g. "@rahul" — for US users
  createdAt: number     // unix timestamp ms
}

// ── Group ─────────────────────────────────────────────────────
// Stored at: firestore/groups/{groupId}
export interface Group {
  id: string
  name: string
  description?: string
  currency: 'INR' | 'USD' | 'EUR' | 'GBP'
  createdBy: string     // userId of creator
  members: string[]     // array of userIds
  inviteCode: string    // random 8-char code e.g. "abc12xyz" — used in invite links
  createdAt: number
  updatedAt: number
  isArchived?: boolean  // whether the group is archived (hidden from main active list)
}

// ── Expense ───────────────────────────────────────────────────
// Stored at: firestore/expenses/{expenseId}
export interface Expense {
  id: string
  groupId: string
  title: string
  totalCents: number    // ALWAYS store money as integers (cents/paise) — never floats
  paidBy: string        // userId of who paid
  splits: Split[]       // how to divide it
  splitType: SplitType
  date: number          // unix timestamp ms
  notes?: string
  receiptUrl?: string   // Firebase Storage URL
  category?: ExpenseCategory // null on old legacy expenses
  createdBy: string
  createdAt: number
}

// ── Split ─────────────────────────────────────────────────────
// One entry per member in the expense
export interface Split {
  userId: string
  amountCents: number   // how much this person owes (integer cents)
  percentage?: number   // used when splitType is 'percentage'
  isPaid?: boolean      // has this person settled their share?
}

// ── Settlement ────────────────────────────────────────────────
// Stored at: firestore/settlements/{settlementId}
// Created when someone marks a debt as paid
export interface Settlement {
  id: string
  groupId: string
  fromUserId: string    // who paid
  toUserId: string      // who received
  amountCents: number
  method: PaymentMethod
  note?: string
  createdAt: number
}

// ── Debt ──────────────────────────────────────────────────────
// Computed (not stored) — result of running the debt algorithm
// "fromUserId owes toUserId amountCents"
export interface Debt {
  fromUserId: string
  toUserId: string
  amountCents: number
}

// ── Enums / Unions ────────────────────────────────────────────
export type SplitType =
  | 'equal'       // divide total equally among all members
  | 'percentage'  // each person pays their specified %
  | 'exact'       // each person pays a specific amount you type in

export type PaymentMethod =
  | 'upi'         // covers PhonePe, GPay, Paytm — all use same UPI protocol
  | 'venmo'
  | 'cash'
  | 'other'

export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP'

export type ExpenseCategory = 
  | 'Food' 
  | 'Groceries' 
  | 'Rent' 
  | 'Utilities' 
  | 'Transport' 
  | 'Entertainment' 
  | 'Medical' 
  | 'Other'

// ── UI State helpers ──────────────────────────────────────────
// Used in forms and loading states — not stored in Firestore

export interface NewExpenseForm {
  title: string
  totalCents: number
  paidBy: string
  splitType: SplitType
  splits: Omit<Split, 'isPaid'>[]
  notes: string
  date: number
  category?: ExpenseCategory
}

// Per-group balance summary shown on dashboard
// "You are owed ₹500 in this group" or "You owe ₹200 in this group"
export interface GroupBalance {
  groupId: string
  groupName: string
  netCents: number      // positive = you are owed, negative = you owe
  currency: Currency
}
