import type { Expense, Group, User } from '@/types'

export function exportGroupToCSV(group: Group, expenses: Expense[], usersCache: Record<string, User>) {
  // Detailed CSV Export
  // Columns: Date, Title, Category, Paid By, Total Amount, Notes, [Member 1 Share], [Member 2 Share]...
  
  // 1. Build headers
  const memberHeaders = group.members.map(memberId => {
    const user = usersCache[memberId]
    return `"${user?.name || 'Unknown'}'s Share"`
  })
  
  const headers = [
    'Date',
    'Title',
    'Category',
    'Paid By',
    'Total Amount',
    'Notes',
    ...memberHeaders
  ]

  // 2. Build rows
  const rows = expenses.map(expense => {
    const date = new Date(expense.date).toLocaleDateString('en-IN')
    const title = `"${expense.title.replace(/"/g, '""')}"`
    const category = expense.category || 'Other'
    
    const payer = usersCache[expense.paidBy]
    const paidBy = `"${payer?.name || 'Unknown'}"`
    
    const totalAmount = (expense.totalCents / 100).toFixed(2)
    const notes = `"${(expense.notes || '').replace(/"/g, '""')}"`
    
    // Calculate how much each member owes for this expense
    const memberShares = group.members.map(memberId => {
      const split = expense.splits.find(s => s.userId === memberId)
      return split ? (split.amountCents / 100).toFixed(2) : '0.00'
    })
    
    return [
      date,
      title,
      category,
      paidBy,
      totalAmount,
      notes,
      ...memberShares
    ].join(',')
  })

  // 3. Combine headers and rows
  const csvContent = [headers.join(','), ...rows].join('\n')
  
  // 4. Trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${group.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_expenses.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
