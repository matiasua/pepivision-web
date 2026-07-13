'use client';

import { useState, useTransition } from 'react';

/** The mockup's inline "¿Eliminar? Sí/No" pattern, wired to a real (already id-bound) server action. */
export function ConfirmDeleteButton({ action, label = 'Eliminar' }: { action: () => Promise<void>; label?: string }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="text-xs font-semibold text-error">¿Eliminar?</span>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(async () => {
            await action();
            setConfirming(false);
          })}
          className="rounded-lg bg-error px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          Sí
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-lg bg-gray px-3 py-1.5 text-xs font-semibold text-grafito"
        >
          No
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="rounded-lg border-[1.5px] border-[#f3c6d3] bg-white px-3 py-1.5 text-xs font-semibold text-error"
    >
      {label}
    </button>
  );
}
