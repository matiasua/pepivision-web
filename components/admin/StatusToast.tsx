'use client';

import { useEffect, useRef, useState } from 'react';

export type ToastState = { type: 'success' | 'error'; text: string } | null;

const AUTO_DISMISS_MS = 4500;

/**
 * Shared success/error feedback for admin mutations (save product, upload
 * photo, reorder gallery, etc). Local per-component state, not a global
 * queue — each mutating component owns its own toast instance and decides
 * what message to show after its own Server Action resolves.
 */
export function useStatusToast() {
  const [toast, setToast] = useState<ToastState>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function show(type: 'success' | 'error', text: string) {
    clearTimer();
    setToast({ type, text });
    timerRef.current = setTimeout(() => setToast(null), AUTO_DISMISS_MS);
  }

  function dismiss() {
    clearTimer();
    setToast(null);
  }

  useEffect(() => clearTimer, []);

  return {
    toast,
    showSuccess: (text: string) => show('success', text),
    showError: (text: string) => show('error', text),
    dismiss,
  };
}

export function StatusToast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-0 bottom-5 z-[200] mx-auto flex w-fit max-w-[92vw] items-center gap-3 rounded-input px-4.5 py-3 text-[13.5px] font-semibold shadow-brand ${
        toast.type === 'success' ? 'bg-success-bg text-success' : 'bg-error-bg text-error'
      }`}
    >
      <span>{toast.text}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Cerrar mensaje"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-sm font-bold opacity-70 hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}
