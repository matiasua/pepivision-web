import { ValidationError } from '@/lib/errors';
import type { CurrentSession } from '@/modules/auth/service';
import { recordAudit } from '@/modules/auth/service';
import { createComunaRow, findComunaByName, listComunas, setComunaActiveRow } from './repository';
import type { CreateComunaInput } from './schemas';

export function getComunas() {
  return listComunas();
}

export async function createComuna(input: CreateComunaInput, actor: CurrentSession) {
  const existing = await findComunaByName(input.name);
  if (existing) {
    throw new ValidationError('Esa comuna ya está registrada.');
  }

  const comuna = await createComunaRow({ name: input.name, region: input.region ?? null });

  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'comuna.created',
    targetType: 'EnabledComuna',
    targetId: comuna.id,
    metadata: { name: comuna.name },
  });

  return comuna;
}

export async function setComunaActive(comunaId: string, active: boolean, actor: CurrentSession) {
  const comuna = await setComunaActiveRow(comunaId, active);

  await recordAudit({
    actorId: actor.adminUser.id,
    action: active ? 'comuna.activated' : 'comuna.deactivated',
    targetType: 'EnabledComuna',
    targetId: comunaId,
    metadata: { name: comuna.name },
  });

  return comuna;
}
