'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminRole } from '@prisma/client';
import { createUserAction, resetPasswordAction, toggleUserActiveAction } from '@/app/admin/users/actions';

export interface AdminUserView {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  active: boolean;
}

const ROLE_LABELS: Record<AdminRole, string> = { SUPERADMIN: 'Superadministrador', ADMIN: 'Administrador' };

function NewUserForm({ onCreated }: { onCreated: () => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AdminRole>('ADMIN');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError('');
    startTransition(async () => {
      const result = await createUserAction({ email, name, password, role });
      if (result.status === 'error') {
        setError(result.message);
        return;
      }
      setEmail('');
      setName('');
      setPassword('');
      setRole('ADMIN');
      onCreated();
    });
  }

  return (
    <div className="rounded-card border border-line bg-white p-5.5 shadow-brand-sm">
      <h2 className="text-base font-semibold text-navy">Crear usuario administrador</h2>
      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          className="rounded-input border border-line bg-white px-3.5 py-2.5 outline-none"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@pepivision360.cl"
          className="rounded-input border border-line bg-white px-3.5 py-2.5 outline-none"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña inicial (mín. 10 caracteres)"
          className="rounded-input border border-line bg-white px-3.5 py-2.5 outline-none"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as AdminRole)}
          className="rounded-input border border-line bg-white px-3.5 py-2.5 text-ink"
        >
          <option value="ADMIN">Administrador</option>
          <option value="SUPERADMIN">Superadministrador</option>
        </select>
      </div>
      {error ? <div className="mt-3 rounded-input bg-error-bg px-3.5 py-2.5 text-[13px] font-semibold text-error">{error}</div> : null}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="mt-3.5 rounded-input bg-navy px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isPending ? 'Creando…' : 'Crear usuario'}
      </button>
    </div>
  );
}

function ResetPasswordControl({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-gray px-3 py-1.5 text-xs font-semibold text-navy">
        Restablecer contraseña
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Nueva contraseña"
        className="w-40 rounded-lg border border-line px-2.5 py-1.5 text-xs outline-none"
      />
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError('');
            const result = await resetPasswordAction({ userId, password });
            if (result.status === 'error') {
              setError(result.message);
              return;
            }
            setDone(true);
            setPassword('');
          })
        }
        className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
      >
        Guardar
      </button>
      <button type="button" onClick={() => setOpen(false)} className="rounded-lg bg-gray px-3 py-1.5 text-xs font-semibold text-grafito">
        Cerrar
      </button>
      {error ? <span className="text-xs font-semibold text-error">{error}</span> : null}
      {done ? <span className="text-xs font-semibold text-success">Actualizada</span> : null}
    </span>
  );
}

export function UserManager({ users, currentUserId }: { users: AdminUserView[]; currentUserId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toggleError, setToggleError] = useState('');

  function handleToggle(userId: string, active: boolean) {
    setToggleError('');
    startTransition(async () => {
      const result = await toggleUserActiveAction(userId, active);
      if (result.status === 'error') {
        setToggleError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <NewUserForm onCreated={() => router.refresh()} />

      {toggleError ? (
        <div className="mt-4 rounded-input bg-error-bg px-3.5 py-2.5 text-[13px] font-semibold text-error">{toggleError}</div>
      ) : null}

      <div className="mt-5 overflow-hidden overflow-x-auto rounded-card border border-line bg-white shadow-brand-sm">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="bg-gray text-left text-[11.5px] font-bold uppercase tracking-wide text-[#7a869f]">
              <th className="px-4.5 py-3.5">Usuario</th>
              <th className="px-4.5 py-3.5">Rol</th>
              <th className="px-4.5 py-3.5">Estado</th>
              <th className="px-4.5 py-3.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-line align-middle">
                <td className="px-4.5 py-3.5">
                  <div className="font-semibold text-navy">{user.name}</div>
                  <div className="text-xs text-[#93a0bd]">{user.email}</div>
                </td>
                <td className="px-4.5 py-3.5 text-sm text-grafito">{ROLE_LABELS[user.role]}</td>
                <td className="px-4.5 py-3.5">
                  <span className={`text-xs font-semibold ${user.active ? 'text-success' : 'text-[#93a0bd]'}`}>
                    {user.active ? 'Activo' : 'Desactivado'}
                  </span>
                </td>
                <td className="px-4.5 py-3.5">
                  <div className="flex items-center justify-end gap-2">
                    <ResetPasswordControl userId={user.id} />
                    <button
                      type="button"
                      disabled={isPending || user.id === currentUserId}
                      onClick={() => handleToggle(user.id, !user.active)}
                      title={user.id === currentUserId ? 'No puedes desactivar tu propia cuenta desde aquí' : undefined}
                      className="rounded-lg bg-gray px-3 py-1.5 text-xs font-semibold text-navy disabled:opacity-40"
                    >
                      {user.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
