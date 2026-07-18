import { describe, expect, it } from 'vitest';
import {
  decideQuoteOptionsReconciliation,
  CANONICAL_QUOTE_OPTIONS_TARGETS,
} from '@/modules/catalog/quote-options-reconciliation';
import { LENTES_OPTICOS_QUOTE_OPTIONS } from '@/modules/catalog/quote-options';

const OTHER_CAPABILITIES = {
  requiresColor: true,
  allowsLensType: true,
  allowsTreatments: true,
  allowsPrescription: true,
  allowsPrescriptionAttachment: true,
  allowsLensTint: false,
  allowsFrameSelection: true,
};

describe('modules/catalog/quote-options-reconciliation — decideQuoteOptionsReconciliation (pura, sin DB)', () => {
  it('agrega la matriz canónica cuando quoteOptions está ausente', () => {
    const decision = decideQuoteOptionsReconciliation(OTHER_CAPABILITIES, LENTES_OPTICOS_QUOTE_OPTIONS);
    expect(decision.action).toBe('add');
    if (decision.action === 'add') {
      expect(decision.capabilities.quoteOptions).toEqual(LENTES_OPTICOS_QUOTE_OPTIONS);
    }
  });

  it('no modifica ninguna otra capability al agregar quoteOptions', () => {
    const decision = decideQuoteOptionsReconciliation(OTHER_CAPABILITIES, LENTES_OPTICOS_QUOTE_OPTIONS);
    expect(decision.action).toBe('add');
    if (decision.action === 'add') {
      for (const [key, value] of Object.entries(OTHER_CAPABILITIES)) {
        expect(decision.capabilities[key]).toBe(value);
      }
    }
  });

  it('preserva un quoteOptions ya existente y válido, sin sobrescribirlo', () => {
    const customButValid = {
      version: 1,
      lensTypes: ['monofocal'],
      treatments: ['antirreflejo'],
      additionalOptions: [],
    };
    const decision = decideQuoteOptionsReconciliation(
      { ...OTHER_CAPABILITIES, quoteOptions: customButValid },
      LENTES_OPTICOS_QUOTE_OPTIONS
    );
    expect(decision).toEqual({ action: 'preserve' });
  });

  it('reporta un conflicto cuando quoteOptions existe pero es inválido — nunca lo reemplaza silenciosamente', () => {
    const decision = decideQuoteOptionsReconciliation(
      { ...OTHER_CAPABILITIES, quoteOptions: { version: 1, lensTypes: ['no-existe'], treatments: [], additionalOptions: [] } },
      LENTES_OPTICOS_QUOTE_OPTIONS
    );
    expect(decision.action).toBe('conflict');
    if (decision.action === 'conflict') {
      expect(decision.issues.length).toBeGreaterThan(0);
    }
  });

  it('reporta un conflicto cuando quoteOptions es una versión no reconocida', () => {
    const decision = decideQuoteOptionsReconciliation(
      { ...OTHER_CAPABILITIES, quoteOptions: { version: 2 } },
      LENTES_OPTICOS_QUOTE_OPTIONS
    );
    expect(decision.action).toBe('conflict');
  });

  it('idempotencia: decidir sobre el resultado de un "add" ya aplicado resuelve "preserve"', () => {
    const first = decideQuoteOptionsReconciliation(OTHER_CAPABILITIES, LENTES_OPTICOS_QUOTE_OPTIONS);
    expect(first.action).toBe('add');
    if (first.action !== 'add') return;

    const second = decideQuoteOptionsReconciliation(first.capabilities, LENTES_OPTICOS_QUOTE_OPTIONS);
    expect(second).toEqual({ action: 'preserve' });
  });

  it('capabilities null/ausente se trata como objeto vacío — igual agrega la matriz canónica', () => {
    const decision = decideQuoteOptionsReconciliation(null, LENTES_OPTICOS_QUOTE_OPTIONS);
    expect(decision.action).toBe('add');
    if (decision.action === 'add') {
      expect(decision.capabilities).toEqual({ quoteOptions: LENTES_OPTICOS_QUOTE_OPTIONS });
    }
  });

  it('los dos objetivos canónicos son exactamente lentes-opticos y lentes-de-sol', () => {
    expect(CANONICAL_QUOTE_OPTIONS_TARGETS.map((t) => t.slug).sort()).toEqual(['lentes-de-sol', 'lentes-opticos']);
  });
});
