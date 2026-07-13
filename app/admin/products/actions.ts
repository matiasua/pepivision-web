'use server';

import { requireSession } from '@/modules/auth/service';
import { productFormSchema } from '@/modules/catalog/admin-schemas';
import { createProduct, deleteProduct, updateProduct } from '@/modules/catalog/admin-service';
import type { ProductFormValues } from '@/components/admin/ProductForm';

type ActionResult = { status: 'error'; message: string } | { status: 'success' };

function parseValues(values: ProductFormValues) {
  return productFormSchema.safeParse({
    ...values,
    badge: values.badge || undefined,
  });
}

export async function createProductAction(values: ProductFormValues): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = parseValues(values);
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Revisa los datos ingresados.' };
  }
  try {
    await createProduct(parsed.data, session);
    return { status: 'success' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'No se pudo crear el modelo.' };
  }
}

export async function updateProductAction(id: string, values: ProductFormValues): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = parseValues(values);
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Revisa los datos ingresados.' };
  }
  try {
    await updateProduct(id, parsed.data, session);
    return { status: 'success' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'No se pudo actualizar el modelo.' };
  }
}

export async function deleteProductAction(id: string): Promise<void> {
  const session = await requireSession();
  await deleteProduct(id, session);
}
