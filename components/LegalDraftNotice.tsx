/**
 * Required by specs/public-site/spec.md ("Páginas legales marcadas como
 * borrador"): every legal page must visibly flag its content as a draft
 * pending legal validation, until real legal review replaces it.
 */
export function LegalDraftNotice() {
  return (
    <div className="bg-brand-gradient-soft py-4">
      <div className="mx-auto max-w-3xl px-5">
        <div className="rounded-2xl border border-fucsia/30 bg-white px-5 py-3.5 text-sm font-semibold text-fucsia shadow-brand-sm">
          Borrador pendiente de validación legal — este contenido aún no ha sido revisado por un
          responsable legal del negocio.
        </div>
      </div>
    </div>
  );
}
