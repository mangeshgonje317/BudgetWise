import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import {
  CATEGORIES,
  generateId,
  type PaymentMethod,
  type Transaction,
  type TransactionType,
} from '../types/finance';

interface TransactionModalProps {
  isOpen: boolean;
  editingTransaction: Transaction | null;
  onClose: () => void;
  onSave: (tx: Transaction, isEdit: boolean) => void;
  onError: (msg: string) => void;
}

export function TransactionModal({
  isOpen,
  editingTransaction,
  onClose,
  onSave,
  onError,
}: TransactionModalProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES.expense[0].name);
  const [payment, setPayment] = useState<PaymentMethod>('upi');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(String(editingTransaction.amount));
      setDate(editingTransaction.date);
      setDescription(editingTransaction.description);
      setCategory(editingTransaction.category);
      setPayment(editingTransaction.payment);
      setNotes(editingTransaction.notes ?? '');
    } else {
      setType('expense');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setCategory(CATEGORIES.expense[0].name);
      setPayment('upi');
      setNotes('');
    }
  }, [isOpen, editingTransaction]);

  if (!isOpen) return null;

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    const available = CATEGORIES[nextType];
    if (!available.some((c) => c.name === category)) {
      setCategory(available[0].name);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0 || !date || !description.trim() || !category) {
      onError('Please fill in all required fields.');
      return;
    }

    const tx: Transaction = {
      id: editingTransaction ? editingTransaction.id : generateId(),
      type,
      amount: parsedAmount,
      date,
      description: description.trim(),
      category,
      payment,
      notes: notes.trim(),
    };

    onSave(tx, Boolean(editingTransaction));
  };

  const categories = CATEGORIES[type];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="transaction-modal-title"
    >
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-slate-200 bg-white shadow-xl pb-safe sm:max-w-lg sm:rounded-xl sm:pb-0">
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-300 sm:hidden" />

        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 sm:px-6 sm:py-4">
          <h2
            id="transaction-modal-title"
            className="font-display text-lg font-bold text-slate-900"
          >
            {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:min-h-[36px] sm:min-w-[36px]"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Type
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`min-h-[44px] rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors sm:rounded-lg ${
                  type === 'expense'
                    ? 'border-rose-500 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                💸 Expense
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`min-h-[44px] rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors sm:rounded-lg ${
                  type === 'income'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                💰 Income
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="tx-amount"
                className="mb-1.5 block text-xs font-semibold text-slate-600"
              >
                Amount (₹)
              </label>
              <input
                id="tx-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="min-h-[44px] w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono-num text-base text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 sm:rounded-lg sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="tx-date"
                className="mb-1.5 block text-xs font-semibold text-slate-600"
              >
                Date
              </label>
              <input
                id="tx-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono-num text-base text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 sm:rounded-lg sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="tx-description"
              className="mb-1.5 block text-xs font-semibold text-slate-600"
            >
              Description
            </label>
            <input
              id="tx-description"
              type="text"
              required
              maxLength={100}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Grocery shopping"
              className="min-h-[44px] w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-base text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 sm:rounded-lg sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="tx-category"
                className="mb-1.5 block text-xs font-semibold text-slate-600"
              >
                Category
              </label>
              <select
                id="tx-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 sm:rounded-lg sm:text-sm"
              >
                {categories.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="tx-payment"
                className="mb-1.5 block text-xs font-semibold text-slate-600"
              >
                Payment Method
              </label>
              <select
                id="tx-payment"
                value={payment}
                onChange={(e) => setPayment(e.target.value as PaymentMethod)}
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 sm:rounded-lg sm:text-sm"
              >
                <option value="cash">💵 Cash</option>
                <option value="card">💳 Card</option>
                <option value="upi">📱 UPI</option>
                <option value="bank">🏦 Bank Transfer</option>
                <option value="other">📦 Other</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="tx-notes"
              className="mb-1.5 block text-xs font-semibold text-slate-600"
            >
              Notes (optional)
            </label>
            <textarea
              id="tx-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes or reference ID..."
              className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-2.5 text-base text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 sm:rounded-lg sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-2 sm:flex sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 sm:rounded-lg"
            >
              Save Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
