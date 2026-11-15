import { useMemo, useState } from 'react';
import { Pencil, Search, Trash2 } from 'lucide-react';
import {
  CATEGORIES,
  formatCurrency,
  formatDate,
  formatDateShort,
  getCategoryInfo,
  getMonthTransactions,
  PAYMENT_LABELS,
  type SortOption,
  type Transaction,
} from '../types/finance';

interface TransactionsViewProps {
  transactions: Transaction[];
  currentMonth: number;
  currentYear: number;
  onEdit: (tx: Transaction) => void;
  onRequestDelete: (id: string) => void;
}

const ITEMS_PER_PAGE = 15;

export function TransactionsView({
  transactions,
  currentMonth,
  currentYear,
  onEdit,
  onRequestDelete,
}: TransactionsViewProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [page, setPage] = useState(1);

  const allCategories = useMemo(
    () => [...CATEGORIES.expense, ...CATEGORIES.income],
    []
  );

  const filtered = useMemo(() => {
    let list = getMonthTransactions(transactions, currentMonth, currentYear);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.notes ?? '').toLowerCase().includes(q)
      );
    }

    if (typeFilter !== 'all') {
      list = list.filter((t) => t.type === typeFilter);
    }

    if (categoryFilter !== 'all') {
      list = list.filter((t) => t.category === categoryFilter);
    }

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'amount-desc':
          return b.amount - a.amount;
        case 'amount-asc':
          return a.amount - b.amount;
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });
  }, [transactions, currentMonth, currentYear, search, typeFilter, categoryFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Filters */}
      <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search description, category, or notes..."
            className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 sm:rounded-lg sm:text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as 'all' | 'income' | 'expense');
              setPage(1);
            }}
            aria-label="Filter by type"
            className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-700 focus:border-indigo-500 focus:outline-none sm:rounded-lg sm:text-sm"
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            aria-label="Sort transactions"
            className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-700 focus:border-indigo-500 focus:outline-none sm:rounded-lg sm:text-sm"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="amount-desc">Highest Amount</option>
            <option value="amount-asc">Lowest Amount</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by category"
            className="col-span-2 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-700 focus:border-indigo-500 focus:outline-none sm:col-span-1 sm:rounded-lg sm:text-sm"
          >
            <option value="all">All Categories</option>
            {allCategories.map((c) => (
              <option key={c.name} value={c.name}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile Touch Card List */}
      <div className="rounded-2xl border border-slate-200 bg-white md:hidden">
        {paginated.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-medium text-slate-600">
              No transactions found for this month.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Try clearing your search or switching months.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {paginated.map((tx) => {
              const cat = getCategoryInfo(tx.category, tx.type);
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 px-3.5 py-3"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                    style={{ backgroundColor: `${cat.color}18` }}
                    aria-hidden="true"
                  >
                    {cat.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-slate-900">
                        {tx.description}
                      </span>
                      <span
                        className={`font-mono-num text-sm font-bold whitespace-nowrap ${
                          tx.type === 'income'
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                      <span className="font-mono-num">
                        {formatDateShort(tx.date)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{tx.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{PAYMENT_LABELS[tx.payment] || tx.payment}</span>
                    </div>
                    {tx.notes && (
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {tx.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => onEdit(tx)}
                      className="flex min-h-[44px] min-w-[40px] items-center justify-center rounded-lg text-slate-500 active:bg-slate-100"
                      aria-label={`Edit ${tx.description}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequestDelete(tx.id)}
                      className="flex min-h-[44px] min-w-[40px] items-center justify-center rounded-lg text-slate-500 active:bg-rose-50 active:text-rose-600"
                      aria-label={`Delete ${tx.description}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <span className="font-mono-num">
            {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
          </span>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPage(num)}
                  className={`min-h-[36px] min-w-[36px] rounded-lg px-2.5 font-mono-num text-xs font-medium transition-colors ${
                    num === safePage
                      ? 'bg-indigo-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Data Table */}
      <div className="hidden rounded-xl border border-slate-200 bg-white md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center">
                    <p className="text-sm font-medium text-slate-600">
                      No transactions found for this month.
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Try clearing your search or switching months.
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((tx) => {
                  const cat = getCategoryInfo(tx.category, tx.type);
                  return (
                    <tr
                      key={tx.id}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono-num text-xs text-slate-600">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base" aria-hidden="true">
                            {cat.icon}
                          </span>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900">
                              {tx.description}
                            </div>
                            <div className="text-xs text-slate-400">
                              {PAYMENT_LABELS[tx.payment] || tx.payment}
                              {tx.notes ? ` · ${tx.notes}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-700">
                        {tx.category}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`text-xs font-semibold capitalize ${
                            tx.type === 'income'
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right font-mono-num font-semibold ${
                          tx.type === 'income'
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <div className="inline-flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEdit(tx)}
                            className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600"
                            title="Edit transaction"
                            aria-label={`Edit ${tx.description}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRequestDelete(tx.id)}
                            className="rounded-md p-2 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                            title="Delete transaction"
                            aria-label={`Delete ${tx.description}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <span className="font-mono-num">
            {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPage(num)}
                  className={`rounded-md px-2.5 py-1 font-mono-num text-xs font-medium transition-colors ${
                    num === safePage
                      ? 'bg-indigo-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
