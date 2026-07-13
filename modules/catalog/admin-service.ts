import { ValidationError } from '@/lib/errors';
import { slugify } from '@/lib/slug';
import type { CurrentSession } from '@/modules/auth/service';
import { recordAudit } from '@/modules/auth/service';
import {
  createProductRow,
  deleteProductRow,
  findProductByCode,
  findProductById,
  findProductBySlugAny,
  getProductKpis,
  listProductsForAdmin,
  updateProductRow,
} from './admin-repository';
import type { ProductFormInput } from './admin-schemas';

export function listProducts(search?: string) {
  return listProductsForAdmin(search);
}

export function getKpis() {
  return getProductKpis();
}

export function getProduct(id: string) {
  return findProductById(id);
}

async function uniqueSlugFor(name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let suffix = 2;
  while (await findProductBySlugAny(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export async function createProduct(input: ProductFormInput, actor: CurrentSession) {
  const existingCode = await findProductByCode(input.code);
  if (existingCode) {
    throw new ValidationError('Ya existe un modelo con ese código.');
  }

  const slug = await uniqueSlugFor(input.name);
  const product = await createProductRow({
    name: input.name,
    code: input.code,
    slug,
    priceFromClp: input.priceFromClp,
    sizes: input.sizes ?? null,
    gender: input.gender,
    shape: input.shape,
    material: input.material,
    available: input.available,
    visible: input.visible,
    badge: input.badge ?? null,
    description: input.description ?? null,
    colors: input.colors,
    actorId: actor.adminUser.id,
  });

  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'product.created',
    targetType: 'Product',
    targetId: product.id,
    metadata: { code: product.code, name: product.name },
  });

  return product;
}

export async function updateProduct(id: string, input: ProductFormInput, actor: CurrentSession) {
  const existing = await findProductById(id);
  if (!existing) {
    throw new ValidationError('El modelo que intentas editar ya no existe.');
  }
  if (existing.code !== input.code) {
    const codeOwner = await findProductByCode(input.code);
    if (codeOwner && codeOwner.id !== id) {
      throw new ValidationError('Ya existe otro modelo con ese código.');
    }
  }

  const product = await updateProductRow(id, {
    name: input.name,
    code: input.code,
    priceFromClp: input.priceFromClp,
    sizes: input.sizes ?? null,
    gender: input.gender,
    shape: input.shape,
    material: input.material,
    available: input.available,
    visible: input.visible,
    badge: input.badge ?? null,
    description: input.description ?? null,
    colors: input.colors,
    actorId: actor.adminUser.id,
  });

  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'product.updated',
    targetType: 'Product',
    targetId: id,
    metadata: { code: product.code, name: product.name },
  });

  return product;
}

export async function deleteProduct(id: string, actor: CurrentSession) {
  const existing = await findProductById(id);
  if (!existing) {
    throw new ValidationError('El modelo que intentas eliminar ya no existe.');
  }

  await deleteProductRow(id);

  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'product.deleted',
    targetType: 'Product',
    targetId: id,
    metadata: { code: existing.code, name: existing.name },
  });
}
