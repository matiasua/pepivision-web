import { describe, expect, it } from 'vitest';
import {
  LENS_TYPES,
  LENS_TYPE_LABELS,
  LENS_TYPE_LABELS_PLURAL,
  LENS_TYPE_DESCRIPTIONS,
  LENS_TYPE_DETAILS,
  LENS_COMPARISON_TABLE,
  LENS_COMPARISON_SUMMARY,
} from '@/modules/requests/lens-types';

// Fase 7 (redesign-extensible-catalog-v2, design.md → "Contenido de
// cristales, tratamientos y opciones adicionales"): catálogo definitivo de
// tipos de cristal — "Progresivo" reemplaza "Multifocal" como nombre
// público nuevo.
describe('modules/requests/lens-types — LENS_TYPES', () => {
  it('contains exactly three lens types, in order Monofocal, Bifocal, Progresivo', () => {
    expect(LENS_TYPES).toEqual(['monofocal', 'bifocal', 'progresivo']);
  });

  it('the public name for the third type is Progresivo, never Multifocal', () => {
    expect(LENS_TYPE_LABELS.progresivo).toBe('Progresivo');
    expect(LENS_TYPE_LABELS_PLURAL.progresivo).toBe('Progresivos');
    expect(Object.values(LENS_TYPE_LABELS)).not.toContain('Multifocal');
    expect(Object.values(LENS_TYPE_LABELS_PLURAL)).not.toContain('Multifocales');
  });

  it('every lens type has a non-empty description', () => {
    for (const type of LENS_TYPES) {
      expect(LENS_TYPE_DESCRIPTIONS[type].length).toBeGreaterThan(10);
    }
  });

  it('monofocal explicitly allows cerca/lectura, and disclaims that it is not lejos-only', () => {
    const details = LENS_TYPE_DETAILS.monofocal.join(' ');
    expect(details).toMatch(/cerca|lectura/i);
    expect(details).toMatch(/no sirven únicamente para lejos|no solo para lejos/i);
  });

  it('bifocal does not claim continuous intermediate vision', () => {
    const details = LENS_TYPE_DETAILS.bifocal.join(' ');
    expect(details).toMatch(/no ofrecen una transición intermedia continua/i);
  });

  it('progresivo mentions lejos, distancia intermedia, and cerca', () => {
    const details = LENS_TYPE_DETAILS.progresivo.join(' ');
    expect(details).toMatch(/lejos/i);
    expect(details).toMatch(/intermedia/i);
    expect(details).toMatch(/cerca/i);
  });

  it('ids are stable and do not depend on the visible label', () => {
    // Si el label cambiara de "Progresivo" a otra palabra, el id no debería cambiar.
    expect(LENS_TYPES).toContain('progresivo');
    expect(LENS_TYPES.every((id) => id === id.toLowerCase())).toBe(true);
  });
});

describe('modules/requests/lens-types — LENS_COMPARISON_TABLE', () => {
  it('matches the exact definitive table (5 rows, exact values)', () => {
    expect(LENS_COMPARISON_TABLE).toEqual([
      { feature: 'Una sola distancia de visión', values: { monofocal: true, bifocal: false, progresivo: false } },
      { feature: 'Lejos y cerca en un mismo cristal', values: { monofocal: false, bifocal: true, progresivo: true } },
      { feature: 'Visión intermedia continua', values: { monofocal: false, bifocal: false, progresivo: true } },
      { feature: 'Línea divisoria visible', values: { monofocal: false, bifocal: true, progresivo: false } },
      { feature: 'Transición gradual entre distancias', values: { monofocal: false, bifocal: false, progresivo: true } },
    ]);
  });

  it('every row declares a boolean for exactly the three lens types', () => {
    for (const row of LENS_COMPARISON_TABLE) {
      expect(Object.keys(row.values).sort()).toEqual(['bifocal', 'monofocal', 'progresivo']);
    }
  });

  it('has a non-empty explanatory summary distinguishing the three types', () => {
    expect(LENS_COMPARISON_SUMMARY.length).toBeGreaterThan(20);
    expect(LENS_COMPARISON_SUMMARY).toMatch(/monofocal/i);
    expect(LENS_COMPARISON_SUMMARY).toMatch(/bifocal/i);
    expect(LENS_COMPARISON_SUMMARY).toMatch(/progresivo/i);
  });
});
