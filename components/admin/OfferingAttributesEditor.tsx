'use client';

import { useState } from 'react';
import {
  getOfferingAttributeContextAction,
  updateOfferingAttributeValuesAction,
} from '@/app/admin/products/actions';
import type { OfferingAttributeContext, OfferingAttributeValueView } from '@/modules/catalog/offering-attribute-service';

type Draft = Record<string, OfferingAttributeValueView>;

function draftsFromContext(context: OfferingAttributeContext): Draft {
  const byId = new Map(context.values.map((v) => [v.attributeDefinitionId, v]));
  const draft: Draft = {};
  for (const def of context.definitions) {
    draft[def.id] = byId.get(def.id) ?? {
      attributeDefinitionId: def.id,
      textValue: null,
      multiValues: null,
      numberValue: null,
      booleanValue: null,
    };
  }
  return draft;
}

/**
 * Editor de valores de atributo dinámico para una ProductOffering
 * concreta (cierre operativo de la Fase 12). Se despliega bajo demanda
 * (evita cargar CategoryAttributeDefinition para categorías que el
 * administrador no está editando) y envía siempre el conjunto completo
 * de valores vigentes — el servicio decide, por definición, si eso
 * implica guardar o retirar el valor (ver offering-attribute-service.ts).
 */
export function OfferingAttributesEditor({ offeringId, categoryName }: { offeringId: string; categoryName: string }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [context, setContext] = useState<OfferingAttributeContext | null>(null);
  const [draft, setDraftState] = useState<Draft>({});
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  async function handleExpand() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (context) return;
    setLoading(true);
    setError(null);
    const result = await getOfferingAttributeContextAction(offeringId);
    setLoading(false);
    if (result.status === 'error') {
      setError(result.message);
      return;
    }
    setContext(result.context);
    setDraftState(draftsFromContext(result.context));
  }

  function patch(attributeDefinitionId: string, patch: Partial<OfferingAttributeValueView>) {
    setSavedNotice(false);
    setDraftState((current) => ({
      ...current,
      [attributeDefinitionId]: { ...current[attributeDefinitionId], attributeDefinitionId, ...patch },
    }));
  }

  async function handleSave() {
    if (!context) return;
    setSaving(true);
    setError(null);
    const values = context.definitions.map((def) => {
      const value = draft[def.id];
      return {
        attributeDefinitionId: def.id,
        textValue: value.textValue,
        multiValues: value.multiValues,
        numberValue: value.numberValue,
        booleanValue: value.booleanValue,
      };
    });
    const result = await updateOfferingAttributeValuesAction({ offeringId, values });
    setSaving(false);
    if (result.status === 'error') {
      setError(result.message);
      return;
    }
    setContext(result.context);
    setDraftState(draftsFromContext(result.context));
    setSavedNotice(true);
  }

  return (
    <div className="mt-2.5 border-t border-line pt-2.5">
      <button
        type="button"
        onClick={handleExpand}
        aria-expanded={expanded}
        className="text-xs font-semibold text-fucsia hover:underline"
      >
        {expanded ? `Ocultar atributos de ${categoryName}` : `Atributos de ${categoryName}`}
      </button>

      {expanded ? (
        <div className="mt-2.5 space-y-3">
          {loading ? <p className="text-xs text-[#5b6b85]">Cargando atributos…</p> : null}
          {error ? <p className="text-xs text-error" role="alert">{error}</p> : null}

          {context && context.definitions.length === 0 ? (
            <p className="text-xs text-[#5b6b85]">Esta categoría no tiene atributos configurados todavía.</p>
          ) : null}

          {context
            ? context.definitions.map((def) => (
                <AttributeControl
                  key={def.id}
                  definition={def}
                  value={draft[def.id]}
                  onChange={(patchValue) => patch(def.id, patchValue)}
                />
              ))
            : null}

          {context && context.definitions.length > 0 ? (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="rounded-input bg-navy px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Guardando…' : 'Guardar atributos'}
              </button>
              {savedNotice ? <span className="text-xs text-success">Atributos guardados.</span> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AttributeControl({
  definition,
  value,
  onChange,
}: {
  definition: OfferingAttributeContext['definitions'][number];
  value: OfferingAttributeValueView;
  onChange: (patch: Partial<OfferingAttributeValueView>) => void;
}) {
  const label = `${definition.label}${definition.active ? '' : ' (definición desactivada)'}`;
  const controlId = `offering-attr-${definition.id}`;

  if (definition.type === 'SELECT') {
    return (
      <label htmlFor={controlId} className="block text-xs font-semibold text-navy">
        {label}
        <select
          id={controlId}
          value={value.textValue ?? ''}
          onChange={(e) => onChange({ textValue: e.target.value === '' ? null : e.target.value })}
          className="mt-1 block w-full rounded-input border border-line bg-white px-3 py-2 text-sm font-normal text-navy outline-none"
        >
          <option value="">Sin definir</option>
          {(definition.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (definition.type === 'MULTI_SELECT') {
    const selected = value.multiValues ?? [];
    return (
      <fieldset>
        <legend className="text-xs font-semibold text-navy">{label}</legend>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1.5">
          {(definition.options ?? []).map((opt) => {
            const checked = selected.includes(opt);
            return (
              <label key={opt} className="flex items-center gap-1.5 text-xs font-normal text-navy">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked ? [...selected, opt] : selected.filter((v) => v !== opt);
                    onChange({ multiValues: next.length > 0 ? next : null });
                  }}
                />
                {opt}
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  if (definition.type === 'BOOLEAN') {
    const current = value.booleanValue === true ? 'true' : value.booleanValue === false ? 'false' : '';
    return (
      <label htmlFor={controlId} className="block text-xs font-semibold text-navy">
        {label}
        <select
          id={controlId}
          value={current}
          onChange={(e) => onChange({ booleanValue: e.target.value === '' ? null : e.target.value === 'true' })}
          className="mt-1 block w-full rounded-input border border-line bg-white px-3 py-2 text-sm font-normal text-navy outline-none"
        >
          <option value="">No definido</option>
          <option value="true">Sí</option>
          <option value="false">No</option>
        </select>
      </label>
    );
  }

  if (definition.type === 'NUMBER' || definition.type === 'RANGE') {
    return (
      <label htmlFor={controlId} className="block text-xs font-semibold text-navy">
        {label}
        <input
          id={controlId}
          type="number"
          inputMode="decimal"
          value={value.numberValue ?? ''}
          onChange={(e) => onChange({ numberValue: e.target.value === '' ? null : Number(e.target.value) })}
          className="mt-1 block w-full rounded-input border border-line bg-white px-3 py-2 text-sm font-normal text-navy outline-none"
        />
      </label>
    );
  }

  // TEXT — informativo únicamente, nunca filtrable (ver
  // category-attribute-schemas.ts / dynamic-filters.ts).
  return (
    <label htmlFor={controlId} className="block text-xs font-semibold text-navy">
      {label}
      <input
        id={controlId}
        type="text"
        value={value.textValue ?? ''}
        onChange={(e) => onChange({ textValue: e.target.value === '' ? null : e.target.value })}
        className="mt-1 block w-full rounded-input border border-line bg-white px-3 py-2 text-sm font-normal text-navy outline-none"
      />
    </label>
  );
}
