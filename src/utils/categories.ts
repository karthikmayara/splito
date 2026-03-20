import type { ExpenseCategory } from '@/types'

export const CATEGORIES: ExpenseCategory[] = [
  'Food', 'Groceries', 'Rent', 'Utilities', 'Transport', 'Entertainment', 'Medical', 'Other'
]

export const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  Food: '🍽️',
  Groceries: '🛒',
  Rent: '🏠',
  Utilities: '⚡',
  Transport: '🚗',
  Entertainment: '🎬',
  Medical: '💊',
  Other: '💰'
}

export function guessCategory(title: string): ExpenseCategory {
  const t = title.toLowerCase()
  // Run explicit regexes from the legacy logic
  if (/grocery|vegetable|milk|sabzi|kirana|supermarket/.test(t)) return 'Groceries'
  if (/food|dinner|lunch|breakfast|restaurant|swiggy|zomato|biryani|pizza|cafe/.test(t)) return 'Food'
  if (/electric|bill|wifi|internet|broadband|recharge/.test(t)) return 'Utilities'
  if (/rent|flat|house|pg|hostel|maintenance/.test(t)) return 'Rent'
  if (/uber|ola|petrol|fuel|auto|cab|transport|metro|bus|flight|train/.test(t)) return 'Transport'
  if (/movie|netflix|prime|hotstar|entertainment|game|trip|travel/.test(t)) return 'Entertainment'
  if (/medicine|doctor|medical|pharmacy|hospital/.test(t)) return 'Medical'
  return 'Other'
}
