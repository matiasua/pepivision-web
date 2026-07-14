'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/app/admin/actions';

export function LoginCard() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit() {
    setError('');
    startTransition(async () => {
      const result = await loginAction({ identifier, password });
      if (result.status === 'error') {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-[420px] py-10">
      <div className="mb-5.5 text-center">
        <h1 className="text-2xl font-bold">Panel de administración</h1>
        <p className="mt-2 text-sm text-grafito">Acceso exclusivo para el equipo de Pepi Visión 360.</p>
      </div>

      <div className="rounded-card border border-line bg-white p-6.5 shadow-brand">
        <label className="text-[13px] font-semibold text-navy">Correo o nombre de usuario</label>
        <input
          type="text"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && handleSubmit()}
          placeholder="tu@correo.cl o tu-usuario"
          autoComplete="username"
          className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
        />
        <label className="mt-3.5 block text-[13px] font-semibold text-navy">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && handleSubmit()}
          placeholder="••••••••"
          autoComplete="current-password"
          className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
        />

        {error ? (
          <div className="mt-3.5 rounded-input bg-error-bg px-3.5 py-3 text-[13px] font-semibold text-error">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="mt-4.5 w-full rounded-input bg-brand-gradient py-3.5 font-semibold text-white shadow-brand-sm disabled:opacity-60"
        >
          {isPending ? 'Ingresando…' : 'Ingresar'}
        </button>
      </div>
    </div>
  );
}
