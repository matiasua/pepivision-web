'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'pv360_cookie_ack';
const CHANGE_EVENT = 'pv360-cookie-ack-changed';

/**
 * Client-side-only UI preference (has the visitor dismissed the cookie
 * notice?), not business data — the one deliberate exception to "no
 * localStorage as production persistence" (see CLAUDE.md / design.md).
 * Uses useSyncExternalStore (not setState-in-effect) to read/subscribe to
 * this external, browser-only value safely across server/client renders.
 */
function getSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) === '1';
}

function getServerSnapshot() {
  return true; // assume accepted during SSR to avoid a flash before hydration
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

function acceptCookies() {
  window.localStorage.setItem(STORAGE_KEY, '1');
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function CookieBanner() {
  const accepted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (accepted) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-footer px-5 py-4 text-[#e6ecfb] shadow-[0_-6px_24px_-8px_rgba(0,0,0,0.4)]">
      <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-center gap-4.5">
        <p className="m-0 min-w-[260px] flex-1 text-[13.5px] leading-relaxed">
          Usamos cookies y datos mínimos para mejorar tu experiencia y gestionar tus solicitudes. Al
          continuar aceptas nuestra{' '}
          <Link href="/privacidad" className="font-semibold text-rosado">
            Política de Privacidad
          </Link>
          , conforme a la Ley N° 19.628 y N° 21.719.
        </p>
        <button
          type="button"
          onClick={acceptCookies}
          className="whitespace-nowrap rounded-pill bg-brand-gradient px-6 py-2.5 font-semibold text-white"
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}
