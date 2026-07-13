import { prisma } from '@/lib/prisma';

export function listComunas() {
  return prisma.enabledComuna.findMany({ orderBy: { name: 'asc' } });
}

export function findComunaByName(name: string) {
  return prisma.enabledComuna.findFirst({
    where: { name: { equals: name.trim(), mode: 'insensitive' } },
  });
}

export function createComunaRow(data: { name: string; region: string | null }) {
  return prisma.enabledComuna.create({ data: { ...data, active: true } });
}

export function setComunaActiveRow(id: string, active: boolean) {
  return prisma.enabledComuna.update({ where: { id }, data: { active } });
}
