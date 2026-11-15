export type TransactionType = 'income' | 'expense';

export type PaymentMethod = 'cash' | 'card' | 'upi' | 'bank' | 'other';

export type ViewName = 'dashboard' | 'transactions' | 'budgets' | 'reports';

export type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

export interface CategoryMeta {
  name: string;
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  description: string;
  category: string;
  payment: PaymentMethod;
  notes?: string;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
}

export interface ScannedTransaction {
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  payment: PaymentMethod;
  notes: string;
  source: string;
  selected: boolean;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export const CATEGORIES: Record<TransactionType, CategoryMeta[]> = {
  expense: [
    { name: 'Food & Dining', icon: '🍔', color: '#ef4444' },
    { name: 'Transportation', icon: '🚗', color: '#f59e0b' },
    { name: 'Shopping', icon: '🛍️', color: '#8b5cf6' },
    { name: 'Entertainment', icon: '🎮', color: '#ec4899' },
    { name: 'Bills & Utilities', icon: '💡', color: '#3b82f6' },
    { name: 'Health', icon: '🏥', color: '#10b981' },
    { name: 'Education', icon: '📚', color: '#6366f1' },
    { name: 'Rent', icon: '🏠', color: '#0ea5e9' },
    { name: 'Insurance', icon: '🛡️', color: '#14b8a6' },
    { name: 'Personal Care', icon: '💆', color: '#f472b6' },
    { name: 'Gifts & Donations', icon: '🎁', color: '#a855f7' },
    { name: 'Other Expense', icon: '📦', color: '#64748b' },
  ],
  income: [
    { name: 'Salary', icon: '💼', color: '#10b981' },
    { name: 'Freelance', icon: '💻', color: '#3b82f6' },
    { name: 'Business', icon: '🏢', color: '#6366f1' },
    { name: 'Investment', icon: '📈', color: '#f59e0b' },
    { name: 'Rental Income', icon: '🏘️', color: '#0ea5e9' },
    { name: 'Refund', icon: '💸', color: '#8b5cf6' },
    { name: 'Other Income', icon: '💰', color: '#64748b' },
  ],
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
  bank: 'Bank Transfer',
  other: 'Other',
};

export const PAYMENT_ICONS: Record<PaymentMethod, string> = {
  cash: '💵',
  card: '💳',
  upi: '📱',
  bank: '🏦',
  other: '📦',
};

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function formatCurrency(amount: number): string {
  return (
    '₹' +
    Math.abs(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export function getCategoryInfo(
  categoryName: string,
  type?: TransactionType
): CategoryMeta {
  const cats = type
    ? CATEGORIES[type]
    : [...CATEGORIES.expense, ...CATEGORIES.income];
  return (
    cats.find((c) => c.name === categoryName) || {
      name: categoryName,
      icon: '📦',
      color: '#64748b',
    }
  );
}

export function getMonthTransactions(
  transactions: Transaction[],
  month: number,
  year: number
): Transaction[] {
  return transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
}
