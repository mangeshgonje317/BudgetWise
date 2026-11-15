import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { CATEGORIES } from '../types/finance';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: string, limit: number) => void;
  onError: (msg: string) => void;
}

export function BudgetModal({
  isOpen,
  onClose,
  onSave,
  onError,
}: BudgetModalProps) {
  const [category, setCategory] = useState(CATEGORIES.expense[0].name);
  const [limit, setLimit] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCategory(CATEGORIES.expense[0].name);
      setLimit('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsedLimit = parseFloat(limit);
    if (!category || !parsedLimit || parsedLimit <= 0) {
      onError('Please enter a valid monthly budget amount.');
      return;
    }
    onSave(category, parsedLimit);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-modal-title"
    >
      <div className="w-full rounded-t-3xl border border-slate-200 bg-white shadow-xl pb-safe sm:max-w-md sm:rounded-xl sm:pb-0">
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-300 sm:hidden" />

        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 sm:px-6 sm:py-4">
          <h2
            id="budget-modal-title"
            className="font-display text-lg font-bold text-slate-900"
          >
            Set Budget
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
            <label
              htmlFor="budget-category"
              className="mb-1.5 block text-xs font-semibold text-slate-600"
            >
              Category
            </label>
            <select
              id="budget-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 sm:rounded-lg sm:text-sm"
            >
              {CATEGORIES.expense.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="budget-limit"
              className="mb-1.5 block text-xs font-semibold text-slate-600"
            >
              Monthly Limit (₹)
            </label>
            <input
              id="budget-limit"
              type="number"
              inputMode="decimal"
              step="1"
              min="1"
              required
              autoFocus
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="e.g., 5000"
              className="min-h-[44px] w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono-num text-base text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 sm:rounded-lg sm:text-sm"
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
              Save Budget
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
