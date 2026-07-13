'use client';

import { useRouter } from 'next/navigation';
import { ConfirmDeleteButton } from './ConfirmDeleteButton';
import { deleteProductAction } from '@/app/admin/products/actions';

export function ProductRowActions({ productId }: { productId: string }) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => router.push(`/admin/products/${productId}/edit`)}
        className="rounded-lg bg-gray px-3 py-1.5 text-xs font-semibold text-navy"
      >
        Editar
      </button>
      <ConfirmDeleteButton
        action={async () => {
          await deleteProductAction(productId);
          router.refresh();
        }}
      />
    </div>
  );
}
