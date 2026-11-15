import { X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="w-full rounded-t-3xl border border-slate-200 bg-white shadow-xl pb-safe sm:max-w-sm sm:rounded-xl sm:pb-0">
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-300 sm:hidden" />

        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 sm:px-6 sm:py-4">
          <h2
            id="confirm-modal-title"
            className="font-display text-lg font-bold text-slate-900"
          >
            Confirm Delete
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

        <div className="p-5 sm:p-6">
          <p className="text-sm leading-relaxed text-slate-600">
            Are you sure you want to delete this transaction? This action cannot
            be undone.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:flex sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="min-h-[44px] rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 sm:rounded-lg"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
