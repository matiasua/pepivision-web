// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { QuoteWizard } from '@/components/quote/QuoteWizard';
import type { QuoteCategoryOption, QuoteOfferingContext } from '@/modules/requests/quote-wizard-service';

vi.mock('@/app/cotizador/actions', () => ({
  submitQuoteAction: vi.fn(),
  getQuoteOfferingsForCategoryAction: vi.fn(async () => ({ status: 'ok', offerings: [] })),
  getQuoteOfferingContextAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const OPTICAL_CATEGORY: QuoteCategoryOption = {
  id: 'cat-opticos',
  slug: 'lentes-opticos',
  name: 'Lentes ópticos',
  capabilities: {
    requiresColor: true,
    allowsLensType: true,
    allowsTreatments: true,
    allowsPrescription: true,
    allowsPrescriptionAttachment: true,
    allowsLensTint: false,
    allowsFrameSelection: true,
  },
  quoteOptions: {
    version: 1,
    lensTypes: ['monofocal', 'bifocal', 'progresivo'],
    treatments: ['antirreflejo', 'filtro-azul-violeta', 'fotocromatico', 'proteccion-uv', 'resistencia-rayaduras'],
    additionalOptions: ['alto-indice'],
  },
};

const SUN_CATEGORY: QuoteCategoryOption = {
  id: 'cat-sol',
  slug: 'lentes-de-sol',
  name: 'Lentes de sol',
  capabilities: {
    requiresColor: true,
    allowsLensType: true,
    allowsTreatments: true,
    allowsPrescription: true,
    allowsPrescriptionAttachment: true,
    allowsLensTint: true,
    allowsFrameSelection: true,
  },
  quoteOptions: {
    version: 1,
    lensTypes: ['sin-graduacion', 'solar-monofocal', 'solar-progresivo'],
    treatments: ['uv400', 'resistencia-rayaduras'],
    additionalOptions: ['polarizado', 'degradado', 'espejado', 'solar-graduado'],
  },
};

const OPTICAL_OFFERING_CONTEXT: QuoteOfferingContext = {
  offeringId: 'off-1',
  category: OPTICAL_CATEGORY,
  product: {
    id: 'prod-1',
    name: 'Modelo Aurora',
    code: 'AUR-001',
    colors: [{ id: 'color-1', name: 'Negro', hex: '#111111' }],
  },
  brand: { id: 'brand-1', name: 'Pepi', slug: 'pepi' },
  effectiveOptions: OPTICAL_CATEGORY.quoteOptions,
  priceFromClp: 49990,
};

function selectRadio(name: string) {
  fireEvent.click(screen.getByRole('radio', { name }));
}

function clickContinue() {
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
}

function progressbar() {
  return screen.getByRole('progressbar');
}

function goToOpticalTreatmentsStep() {
  selectRadio('Lentes ópticos');
  clickContinue();
  selectRadio('Necesito asesoría');
  clickContinue();
  selectRadio('Monofocal');
  clickContinue();
}

describe('components/quote/QuoteWizard', () => {
  it('shows the category step first with both categories as radio options', () => {
    render(<QuoteWizard categories={[OPTICAL_CATEGORY, SUN_CATEGORY]} initialOffering={null} />);
    expect(screen.getAllByText(/¿Qué necesitas cotizar\?/).length).toBeGreaterThan(0);
    expect(screen.getByRole('radio', { name: 'Lentes ópticos' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Lentes de sol' })).toBeTruthy();
  });

  it('selecting a category advances to the offering step (catalog vs. advice)', () => {
    render(<QuoteWizard categories={[OPTICAL_CATEGORY]} initialOffering={null} />);
    selectRadio('Lentes ópticos');
    clickContinue();
    expect(screen.getByText(/¿Ya tienes un modelo elegido\?/)).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Elegir del catálogo' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Necesito asesoría' })).toBeTruthy();
  });

  it('flujo óptico: la asesoría lleva al paso de cristal con exactamente Monofocal/Bifocal/Progresivo, nunca Multifocal', () => {
    render(<QuoteWizard categories={[OPTICAL_CATEGORY]} initialOffering={null} />);
    selectRadio('Lentes ópticos');
    clickContinue();
    selectRadio('Necesito asesoría');
    clickContinue();

    expect(screen.getByRole('radio', { name: 'Monofocal' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Bifocal' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Progresivo' })).toBeTruthy();
    expect(screen.queryByText('Multifocal')).toBeNull();
    expect(screen.queryByRole('radio', { name: 'Sin graduación' })).toBeNull();
  });

  it('flujo solar: el paso de cristal muestra Sin graduación/Solar monofocal/Solar progresivo, nunca Bifocal', () => {
    render(<QuoteWizard categories={[SUN_CATEGORY]} initialOffering={null} />);
    selectRadio('Lentes de sol');
    clickContinue();
    selectRadio('Necesito asesoría');
    clickContinue();

    expect(screen.getByRole('radio', { name: 'Sin graduación' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Solar monofocal' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Solar progresivo' })).toBeTruthy();
    expect(screen.queryByRole('radio', { name: 'Bifocal' })).toBeNull();
  });

  it('el paso de tratamientos ópticos nunca muestra Polarizado (exclusivo de lentes de sol) ni Hidrofóbico', () => {
    render(<QuoteWizard categories={[OPTICAL_CATEGORY]} initialOffering={null} />);
    goToOpticalTreatmentsStep();

    expect(screen.getByText(/^\d+ · Tratamientos$/)).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Antirreflejo' })).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: 'Polarizado' })).toBeNull();
    expect(screen.queryByText(/hidrof[oó]bico/i)).toBeNull();
  });

  it('el paso "opciones adicionales" existe para lentes ópticos y muestra Alto índice como opción, no como tratamiento', () => {
    render(<QuoteWizard categories={[OPTICAL_CATEGORY]} initialOffering={null} />);
    goToOpticalTreatmentsStep();
    clickContinue(); // tratamientos -> opciones adicionales

    expect(screen.getByText(/^\d+ · Opciones adicionales$/)).toBeTruthy();
    const altoIndice = screen.getByRole('checkbox', { name: 'Cristales de alto índice' });
    expect(altoIndice).toBeTruthy();
    const card = altoIndice.closest('label') as HTMLElement;
    expect(card.textContent).toContain('Opción adicional');
  });

  it('"Sin graduación" omite el paso de receta por completo (avanza directo a datos de contacto)', () => {
    render(<QuoteWizard categories={[SUN_CATEGORY]} initialOffering={null} />);
    selectRadio('Lentes de sol');
    clickContinue();
    selectRadio('Necesito asesoría');
    clickContinue();
    selectRadio('Sin graduación');
    clickContinue(); // lens -> tratamientos
    clickContinue(); // tratamientos -> opciones adicionales
    clickContinue(); // opciones adicionales -> datos (receta omitida)

    expect(screen.getByText(/Tus datos de contacto/)).toBeTruthy();
    expect(screen.queryByText(/¿Cuentas con una receta óptica vigente\?/)).toBeNull();
  });

  it('"Monofocal" sí requiere el paso de receta antes de los datos de contacto', () => {
    render(<QuoteWizard categories={[OPTICAL_CATEGORY]} initialOffering={null} />);
    goToOpticalTreatmentsStep();
    clickContinue(); // tratamientos
    clickContinue(); // opciones adicionales

    expect(screen.getByText(/¿Cuentas con una receta óptica vigente\?/)).toBeTruthy();
  });

  it('responder "No" a la receta omite el paso de adjunto por completo (regresión)', () => {
    render(<QuoteWizard categories={[OPTICAL_CATEGORY]} initialOffering={null} />);
    goToOpticalTreatmentsStep();
    clickContinue(); // tratamientos
    clickContinue(); // opciones adicionales -> receta
    selectRadio('No');
    clickContinue(); // receta -> debe ir directo a datos, nunca al adjunto

    expect(screen.getByText(/Tus datos de contacto/)).toBeTruthy();
    expect(screen.queryByText(/Adjunta tu receta óptica/)).toBeNull();
  });

  it('responder "Sí" a la receta sí muestra el paso de adjunto antes de datos de contacto', () => {
    render(<QuoteWizard categories={[OPTICAL_CATEGORY]} initialOffering={null} />);
    goToOpticalTreatmentsStep();
    clickContinue(); // tratamientos
    clickContinue(); // opciones adicionales -> receta
    selectRadio('Sí');
    clickContinue(); // receta -> adjunto

    expect(screen.getByText(/Adjunta tu receta óptica/)).toBeTruthy();
  });

  it('"Continuar" permanece deshabilitado hasta seleccionar una categoría', () => {
    render(<QuoteWizard categories={[OPTICAL_CATEGORY]} initialOffering={null} />);
    const continueButton = screen.getByRole('button', { name: 'Continuar' }) as HTMLButtonElement;
    expect(continueButton.disabled).toBeTruthy();
  });

  it('seleccionar una categoría habilita "Continuar" sin avanzar de paso automáticamente (corrección de consistencia)', () => {
    render(<QuoteWizard categories={[OPTICAL_CATEGORY]} initialOffering={null} />);
    selectRadio('Lentes ópticos');

    const continueButton = screen.getByRole('button', { name: 'Continuar' }) as HTMLButtonElement;
    expect(continueButton.disabled).toBeFalsy();
    // Sigue en el paso de categoría — la selección por sí sola no cambia de paso.
    expect(screen.getAllByText(/¿Qué necesitas cotizar\?/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/¿Ya tienes un modelo elegido\?/)).toBeNull();

    clickContinue();
    expect(screen.getByText(/¿Ya tienes un modelo elegido\?/)).toBeTruthy();
  });

  it('el resumen usa labels legibles, nunca IDs técnicos', () => {
    render(<QuoteWizard categories={[OPTICAL_CATEGORY]} initialOffering={null} />);
    selectRadio('Lentes ópticos');
    clickContinue();
    selectRadio('Necesito asesoría');
    clickContinue();
    selectRadio('Progresivo');
    clickContinue();
    clickContinue(); // tratamientos
    clickContinue(); // opciones adicionales
    selectRadio('Sí');
    clickContinue(); // adjunto (opcional)
    clickContinue(); // -> datos
    clickContinue(); // -> resumen

    expect(screen.getByText(/Resumen de tu solicitud/)).toBeTruthy();
    expect(screen.getByText('Progresivo')).toBeTruthy();
    expect(screen.queryByText('progresivo')).toBeNull();
  });

  describe('indicador de progreso (stepper completo + indicador compacto de mobile)', () => {
    it('el indicador de progreso refleja el paso y el total reales de computeActiveSteps() — flujo óptico de 8 pasos', () => {
      render(<QuoteWizard categories={[OPTICAL_CATEGORY]} initialOffering={null} />);

      // Sin categoría seleccionada, computeActiveSteps() devuelve únicamente ['category'].
      expect(progressbar().getAttribute('aria-valuemin')).toBe('1');
      expect(progressbar().getAttribute('aria-valuemax')).toBe('1');
      expect(progressbar().getAttribute('aria-valuenow')).toBe('1');
      expect(progressbar().getAttribute('aria-valuetext')).toBe('Paso 1 de 1: Categoría');

      selectRadio('Lentes ópticos');
      // categoría, modelo, cristal, tratamientos, opciones, receta, datos, resumen
      expect(progressbar().getAttribute('aria-valuemax')).toBe('8');
      expect(progressbar().getAttribute('aria-valuenow')).toBe('1'); // seleccionar no avanza de paso

      clickContinue();
      expect(progressbar().getAttribute('aria-valuenow')).toBe('2');
      expect(progressbar().getAttribute('aria-valuetext')).toBe('Paso 2 de 8: Modelo');
    });

    it('cambiar de modalidad actualiza el total de pasos — Sin graduación omite receta y adjunto', () => {
      render(<QuoteWizard categories={[SUN_CATEGORY]} initialOffering={null} />);
      selectRadio('Lentes de sol');
      clickContinue();
      selectRadio('Necesito asesoría');
      clickContinue();

      selectRadio('Solar progresivo');
      // + receta (el paso de adjunto solo se agrega tras responder "Sí")
      expect(progressbar().getAttribute('aria-valuemax')).toBe('8');

      selectRadio('Sin graduación');
      expect(progressbar().getAttribute('aria-valuemax')).toBe('7'); // sin receta ni adjunto
    });

    it('el nombre del paso actual del indicador compacto coincide exactamente con el paso activo, nunca truncado', () => {
      render(<QuoteWizard categories={[OPTICAL_CATEGORY]} initialOffering={null} />);
      goToOpticalTreatmentsStep();
      clickContinue(); // tratamientos -> opciones adicionales
      expect(progressbar().getAttribute('aria-valuetext')).toBe('Paso 5 de 8: Opciones');
    });

    it('el stepper completo (desktop/tablet) muestra el nombre completo de cada paso activo, sin abreviar', () => {
      render(<QuoteWizard categories={[OPTICAL_CATEGORY]} initialOffering={null} />);
      goToOpticalTreatmentsStep();

      for (const label of ['Categoría', 'Modelo', 'Cristal', 'Tratamientos', 'Opciones', 'Receta', 'Datos', 'Resumen']) {
        expect(screen.getAllByText(label).length).toBeGreaterThan(0);
      }
    });
  });

  describe('entrada con oferta ya resuelta (ficha de producto)', () => {
    it('con una oferta precargada, arranca directamente en el paso "Modelo" (no en "Categoría")', () => {
      render(<QuoteWizard categories={[OPTICAL_CATEGORY]} initialOffering={OPTICAL_OFFERING_CONTEXT} />);
      expect(screen.getByText(/¿Ya tienes un modelo elegido\?/)).toBeTruthy();
      expect(progressbar().getAttribute('aria-valuenow')).toBe('2');
    });
  });
});
