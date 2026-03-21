import type { Expense, Group, User, Debt, Settlement } from '@/types'
import { formatAmount } from '@/utils/splitCalculator'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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
  link.click()
  document.body.removeChild(link)
}

export function exportGroupToPDF(
  group: Group,
  expenses: Expense[],
  usersCache: Record<string, User>,
  debts: Debt[],
  settlements: Settlement[]
) {
  const doc = new jsPDF()

  // 1. Group Title
  doc.setFontSize(22)
  doc.setTextColor(15, 23, 42) // Slate-900
  doc.text(`Statement: ${group.name}`, 14, 22)

  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Generated on ${new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })}`, 14, 30)

  let currentY = 40

  // 2. Summary / Balances Table
  if (debts.length > 0) {
    doc.setFontSize(14)
    doc.setTextColor(30, 41, 59) // Slate-800
    doc.text('Outstanding Balances', 14, currentY)
    
    const debtRows = debts.map(debt => {
      const fromName = usersCache[debt.fromUserId]?.name || 'Someone'
      const toName = usersCache[debt.toUserId]?.name || 'Someone'
      const amount = formatAmount(debt.amountCents, group.currency)
      return [fromName, 'owes', toName, amount]
    })

    autoTable(doc, {
      startY: currentY + 6,
      head: [['From', '', 'To', 'Amount']],
      body: debtRows,
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94], textColor: [0, 0, 0], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 4 },
      margin: { left: 14 }
    })
    
    currentY = (doc as any).lastAutoTable.finalY + 15
  }

  // 3. Expenses Table
  doc.setFontSize(14)
  doc.setTextColor(30, 41, 59)
  doc.text('Expense Ledger', 14, currentY)

  const expenseRows = expenses.map(expense => {
    const date = new Date(expense.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
    const title = expense.title
    const category = expense.category || 'Other'
    const payer = usersCache[expense.paidBy]?.name || 'Unknown'
    const totalAmount = formatAmount(expense.totalCents, group.currency)
    
    return [date, title, category, payer, totalAmount]
  })

  autoTable(doc, {
    startY: currentY + 6,
    head: [['Date', 'Description', 'Category', 'Paid By', 'Amount']],
    body: expenseRows,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
    styles: { fontSize: 10, cellPadding: 4 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14 }
  })
  
  // 4. Settlement History Table
  if (settlements.length > 0) {
    currentY = (doc as any).lastAutoTable.finalY + 15
    doc.setFontSize(14)
    doc.setTextColor(30, 41, 59)
    doc.text('Settlements', 14, currentY)

    const settlementRows = settlements.map(settlement => {
      const date = new Date(settlement.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
      const payer = usersCache[settlement.fromUserId]?.name || 'Unknown'
      const receiver = usersCache[settlement.toUserId]?.name || 'Unknown'
      const amount = formatAmount(settlement.amountCents, group.currency)
      const method = settlement.method.toUpperCase()
      
      return [date, payer, 'paid', receiver, amount, method]
    })

    autoTable(doc, {
      startY: currentY + 6,
      head: [['Date', 'From', '', 'To', 'Amount', 'Method']],
      body: settlementRows,
      theme: 'plain',
      headStyles: { textColor: [100, 116, 139] },
      styles: { fontSize: 10, cellPadding: 4 },
      margin: { left: 14 }
    })
  }

  // Footer
  const finalY = (doc as any).lastAutoTable.finalY + 15
  doc.setFontSize(9)
  doc.setTextColor(150)
  doc.text('Generated instantly by Splito', 14, finalY)

  // 5. Save
  doc.save(`${group.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_statement.pdf`)
}
