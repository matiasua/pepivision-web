import { describe, expect, it } from 'vitest';
import { TREATMENTS } from '@/modules/requests/treatments-content';
import { ADDITIONAL_OPTIONS } from '@/modules/requests/additional-options';

describe('modules/requests/treatments-content — TREATMENTS', () => {
  it('defines exactly five treatments (Hidrofóbico y oleofóbico retired — decisión comercial, iteración correctiva de interfaz)', () => {
    expect(TREATMENTS).toHaveLength(5);
  });

  it('has stable, unique ids', () => {
    const ids = TREATMENTS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('maintains a stable order (Antirreflejo, Filtro azul-violeta, Fotocromático, UV, Resistencia)', () => {
    expect(TREATMENTS.map((t) => t.label)).toEqual([
      'Antirreflejo',
      'Filtro de luz azul-violeta',
      'Fotocromático',
      'Protección UV',
      'Mayor resistencia a rayaduras',
    ]);
  });

  it('never offers "Hidrofóbico y oleofóbico" — retired from the public catalog', () => {
    const ids: string[] = TREATMENTS.map((t) => t.id);
    expect(ids).not.toContain('hidrofobico-oleofobico');
    expect(TREATMENTS.map((t) => t.label)).not.toContain('Hidrofóbico y oleofóbico');
  });

  it('never claims absolute scratch resistance ("antirrayas", "imposible de rayar", "protección total")', () => {
    const allCopy = TREATMENTS.map((t) => `${t.label} ${t.description}`).join(' ').toLowerCase();
    expect(allCopy).not.toMatch(/antirrayas/);
    expect(allCopy).not.toMatch(/imposible de rayar/);
    expect(allCopy).not.toMatch(/protección total/);
    expect(allCopy).not.toMatch(/nunca se raya/);
  });

  it('the scratch-resistance treatment uses the approved qualified label', () => {
    const scratch = TREATMENTS.find((t) => t.id === 'resistencia-rayaduras');
    expect(scratch?.label).toBe('Mayor resistencia a rayaduras');
  });

  it('does not claim to eliminate all reflections (antirreflejo) or promise exact transition times (fotocromático)', () => {
    const antirreflejo = TREATMENTS.find((t) => t.id === 'antirreflejo');
    expect(antirreflejo?.description.toLowerCase()).not.toMatch(/elimina (todos|completamente)/);

    const fotocromatico = TREATMENTS.find((t) => t.id === 'fotocromatico');
    expect(fotocromatico?.description).not.toMatch(/\d+\s*(segundos|minutos)/);
  });
});

describe('modules/requests/additional-options — ADDITIONAL_OPTIONS', () => {
  it('is modeled as a separate array from TREATMENTS (never mixed in the domain)', () => {
    const treatmentIds = new Set<string>(TREATMENTS.map((t) => t.id));
    const optionIds = ADDITIONAL_OPTIONS.map((o) => o.id);
    for (const id of optionIds) {
      expect(treatmentIds.has(id)).toBe(false);
    }
  });

  it('has stable, unique ids', () => {
    const ids = ADDITIONAL_OPTIONS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('defines exactly the five approved additional options', () => {
    expect(ADDITIONAL_OPTIONS.map((o) => o.label)).toEqual([
      'Cristales de alto índice',
      'Cristales polarizados',
      'Cristales degradados',
      'Cristales espejados',
      'Cristales solares graduados',
    ]);
  });

  it('never promises alto índice is always thinner regardless of prescription/frame', () => {
    const altoIndice = ADDITIONAL_OPTIONS.find((o) => o.id === 'alto-indice');
    expect(altoIndice?.description).toMatch(/determinadas graduaciones/i);
    expect(altoIndice?.description.toLowerCase()).not.toMatch(/siempre más delgad/);
  });

  it('solares graduados mentions its three variants are compatibility-dependent', () => {
    const solarGraduado = ADDITIONAL_OPTIONS.find((o) => o.id === 'solar-graduado');
    expect(solarGraduado?.description).toMatch(/según compatibilidad/i);
  });
});
