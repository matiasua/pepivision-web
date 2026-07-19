import { describe, expect, it } from 'vitest';
import {
  dataRightsBusinessNotification,
  homeVisitBusinessNotification,
  homeVisitCustomerConfirmation,
  quoteBusinessNotification,
  quoteCustomerConfirmation,
} from '@/modules/notifications/templates';
import { ADMIN_ARCO_URL, ADMIN_HOME_VISITS_URL, ADMIN_REQUESTS_URL, LOGO_URL } from '@/modules/notifications/email/config';

const CONTACT = {
  phoneDisplay: '+56 9 1111 1111',
  email: 'contacto@pepivision360.cl',
  instagramHandle: 'pepivision360',
  hoursText: 'Lunes a sábado de 10:00 a 18:00 hrs',
  locationText: 'Quilicura, Región Metropolitana',
};

const CREATED_AT = new Date('2026-07-14T12:00:00Z');

function assertWellFormedMessage(email: { subject: string; preheader: string; html: string; text: string }) {
  expect(email.subject.length).toBeGreaterThan(0);
  expect(email.preheader.length).toBeGreaterThan(0);
  expect(email.html.toLowerCase()).toContain('<!doctype html>');
  expect(email.html.toLowerCase()).toContain('<html');
  expect(email.html).toContain(LOGO_URL);
  expect(email.html.length).toBeLessThan(100 * 1024); // section 9 — HTML preferentemente bajo 100 KB.
  expect(email.text.length).toBeGreaterThan(0);
}

describe('modules/notifications/templates — quoteCustomerConfirmation', () => {
  const base = {
    requestId: 'req_abcdef123456',
    name: 'Ana',
    categoryName: 'Lentes ópticos',
    frameBrandName: null as string | null,
    frameProductName: null as string | null,
    frameProductCode: null as string | null,
    frameProductColorName: null as string | null,
    priceFromSnapshot: null as number | null,
    glassType: 'Monofocal',
    treatmentLabels: [] as string[],
    prescriptionAnswer: 'No',
    hasPrescriptionAttachment: false,
    comuna: null as string | null,
    message: null as string | null,
    whatsappHref: 'https://wa.me/56900000000?text=hola',
    createdAt: CREATED_AT,
    contact: CONTACT,
  };

  it('is a well-formed HTML+text message with an absolute logo URL', () => {
    assertWellFormedMessage(quoteCustomerConfirmation(base));
  });

  it('greets the customer by name and includes the WhatsApp CTA as an absolute URL', () => {
    const email = quoteCustomerConfirmation(base);
    expect(email.html).toContain('Ana');
    expect(email.text).toContain('Ana');
    expect(email.html).toContain(base.whatsappHref);
    expect(email.text).toContain(base.whatsappHref);
  });

  it('includes brand, model, code and color when present', () => {
    const email = quoteCustomerConfirmation({
      ...base,
      frameBrandName: 'Vespa',
      frameProductName: 'Aurora',
      frameProductCode: 'PV-101',
      frameProductColorName: 'Negro',
    });
    for (const field of ['Vespa', 'Aurora', 'PV-101', 'Negro']) {
      expect(email.html).toContain(field);
      expect(email.text).toContain(field);
    }
  });

  it('omits brand/model/code/color rows entirely when frameChoice was "advice" (all null)', () => {
    const email = quoteCustomerConfirmation(base);
    expect(email.html).not.toContain('>Marca<');
    expect(email.html).not.toContain('>Modelo<');
  });

  it('states only the fixed confirmation sentence when a prescription was attached — no file name, size or path', () => {
    const email = quoteCustomerConfirmation({ ...base, prescriptionAnswer: 'Sí', hasPrescriptionAttachment: true });
    expect(email.html).toContain('Tu receta fue adjuntada correctamente.');
    expect(email.text).toContain('Tu receta fue adjuntada correctamente.');
  });

  it('does not mention any attachment confirmation when none was uploaded', () => {
    const email = quoteCustomerConfirmation({ ...base, prescriptionAnswer: 'Sí', hasPrescriptionAttachment: false });
    expect(email.html).not.toContain('Tu receta fue adjuntada correctamente.');
  });

  it('never leaks storageKey, private bucket paths or signed-URL query params', () => {
    const email = quoteCustomerConfirmation({ ...base, prescriptionAnswer: 'Sí', hasPrescriptionAttachment: true });
    for (const forbidden of ['prescriptions/', 'X-Amz-Signature', 'storageKey', '.pdf', 'minio']) {
      expect(email.html).not.toContain(forbidden);
      expect(email.text).not.toContain(forbidden);
    }
  });

  it('includes comuna and message when present', () => {
    const email = quoteCustomerConfirmation({ ...base, comuna: 'Ñuñoa', message: 'Prefiero contacto por la tarde.' });
    expect(email.html).toContain('Ñuñoa');
    expect(email.html).toContain('Prefiero contacto por la tarde.');
    expect(email.text).toContain('Ñuñoa');
  });

  it('escapes a <script> injection attempt in the message', () => {
    const email = quoteCustomerConfirmation({ ...base, message: '<script>alert(1)</script>' });
    expect(email.html).not.toContain('<script>alert(1)</script>');
    expect(email.html).toContain('&lt;script&gt;');
    // The text version is plain text (never parsed as HTML), so it keeps the literal characters.
    expect(email.text).toContain('<script>alert(1)</script>');
  });

  it('escapes special characters in the customer name', () => {
    const email = quoteCustomerConfirmation({ ...base, name: 'Ana <b>&</b> José' });
    expect(email.html).not.toContain('<b>&</b>');
    expect(email.html).toContain('&lt;b&gt;');
  });

  it('omits the "Receta óptica" row/label entirely when prescriptionAnswer is null (Sin graduación — not applicable, not "—")', () => {
    const email = quoteCustomerConfirmation({ ...base, prescriptionAnswer: null, glassType: 'Sin graduación' });
    expect(email.html).not.toContain('Receta óptica');
    expect(email.html).not.toContain('>—<');
    expect(email.text).not.toContain('Receta óptica');
    expect(email.text).not.toMatch(/Receta óptica: —/);
  });

  it('shows the "Receta óptica" row with the real answer for a graduated modality (Solar progresivo/Monofocal)', () => {
    const email = quoteCustomerConfirmation({ ...base, prescriptionAnswer: 'Sí', glassType: 'Solar progresivo' });
    expect(email.html).toContain('Receta óptica');
    expect(email.html).toContain('>Sí<');
    expect(email.text).toContain('Receta óptica: Sí');
  });

  it('shows "Precio referencial: Desde $X" (formatClp) in both HTML and text when priceFromSnapshot has a value', () => {
    const email = quoteCustomerConfirmation({ ...base, priceFromSnapshot: 19990 });
    expect(email.html).toContain('Precio referencial');
    expect(email.html).toContain('Desde $19.990');
    expect(email.text).toContain('Precio referencial: Desde $19.990');
  });

  it('omits the "Precio referencial" row entirely when priceFromSnapshot is null — never "$0", "Por cotizar" or "—"', () => {
    const email = quoteCustomerConfirmation({ ...base, priceFromSnapshot: null });
    expect(email.html).not.toContain('Precio referencial');
    expect(email.text).not.toContain('Precio referencial');
    expect(email.html).not.toContain('$0');
    expect(email.html).not.toContain('Por cotizar');
  });
});

describe('modules/notifications/templates — quoteBusinessNotification', () => {
  const base = {
    requestId: 'req_business_1',
    name: 'Ana',
    phone: '+56911111111',
    email: 'ana@example.cl',
    comuna: 'Ñuñoa',
    message: 'Hola',
    categoryName: 'Lentes ópticos',
    frameBrandName: 'Vespa',
    frameProductName: 'Aurora',
    frameProductCode: 'PV-101',
    frameProductColorName: 'Negro',
    priceFromSnapshot: null as number | null,
    glassType: 'Monofocal',
    treatmentLabels: ['Antirreflejo'],
    prescriptionAnswer: 'Sí',
    hasPrescriptionAttachment: false,
    createdAt: CREATED_AT,
    contact: CONTACT,
  };

  it('is a well-formed HTML+text message with an absolute admin CTA', () => {
    const email = quoteBusinessNotification(base);
    assertWellFormedMessage(email);
    expect(email.html).toContain(ADMIN_REQUESTS_URL);
    expect(email.text).toContain(ADMIN_REQUESTS_URL);
  });

  it('includes contact details, request id, brand, model, code and color', () => {
    const email = quoteBusinessNotification(base);
    expect(email.text).toContain('req_business_1'.slice(-8).toUpperCase());
    expect(email.text).toContain('Ana');
    expect(email.text).toContain('+56911111111');
    expect(email.text).toContain('Vespa');
    expect(email.text).toContain('Aurora');
    expect(email.text).toContain('PV-101');
    expect(email.text).toContain('Negro');
  });

  it('handles missing optional fields with explicit fallback text', () => {
    const email = quoteBusinessNotification({
      ...base,
      email: null,
      comuna: null,
      message: null,
      frameBrandName: null,
      frameProductName: null,
      frameProductCode: null,
      frameProductColorName: null,
    });
    expect(email.text).toContain('no proporcionado');
    expect(email.text).toContain('no proporcionada');
    expect(email.text).toContain('sin mensaje');
    expect(email.text).toContain('sin modelo seleccionado');
    expect(email.text).toContain('sin color seleccionado');
    expect(email.text).toContain('sin marca');
  });

  it('shows the secure-attachment notice, without file details, only when a prescription was actually attached', () => {
    const withAttachment = quoteBusinessNotification({ ...base, hasPrescriptionAttachment: true });
    expect(withAttachment.html).toContain('receta adjunta disponible de forma segura en el panel de administración');
    expect(withAttachment.text).toContain('receta adjunta disponible de forma segura en el panel de administración');
    for (const forbidden of ['prescriptions/', 'X-Amz-Signature', 'storageKey', '.pdf', 'minio']) {
      expect(withAttachment.html).not.toContain(forbidden);
    }

    const withoutAttachment = quoteBusinessNotification({ ...base, hasPrescriptionAttachment: false });
    expect(withoutAttachment.html).not.toContain('receta adjunta disponible de forma segura en el panel de administración');
  });

  it('escapes a <script> injection attempt in the customer message', () => {
    const email = quoteBusinessNotification({ ...base, message: '<script>alert(1)</script>' });
    expect(email.html).not.toContain('<script>alert(1)</script>');
  });

  it('omits the "Receta óptica" row/label entirely when prescriptionAnswer is null (Sin graduación — not applicable, not "—")', () => {
    const email = quoteBusinessNotification({ ...base, prescriptionAnswer: null, glassType: 'Sin graduación' });
    expect(email.html).not.toContain('Receta óptica');
    expect(email.text).not.toContain('Receta óptica');
    expect(email.text).not.toMatch(/Receta óptica: —/);
  });

  it('shows the "Receta óptica" row with the real answer for lentes ópticos (Monofocal) when applicable', () => {
    const email = quoteBusinessNotification({ ...base, prescriptionAnswer: 'Sí', glassType: 'Monofocal' });
    expect(email.html).toContain('Receta óptica');
    expect(email.text).toContain('Receta óptica: Sí');
  });

  it('shows "Precio referencial: Desde $X" (formatClp) in both HTML and text when priceFromSnapshot has a value', () => {
    const email = quoteBusinessNotification({ ...base, priceFromSnapshot: 45000 });
    expect(email.html).toContain('Precio referencial');
    expect(email.html).toContain('Desde $45.000');
    expect(email.text).toContain('Precio referencial: Desde $45.000');
  });

  it('omits the "Precio referencial" row entirely when priceFromSnapshot is null — never "$0", "Por cotizar" or "—"', () => {
    const email = quoteBusinessNotification({ ...base, priceFromSnapshot: null });
    expect(email.html).not.toContain('Precio referencial');
    expect(email.text).not.toContain('Precio referencial');
    expect(email.html).not.toContain('$0');
    expect(email.html).not.toContain('Por cotizar');
  });
});

describe('modules/notifications/templates — homeVisitCustomerConfirmation', () => {
  const base = {
    requestId: 'req_hv_1',
    name: 'Pedro',
    comuna: 'Quilicura',
    attentionType: 'Ambas',
    comunaCovered: true,
    createdAt: CREATED_AT,
    contact: CONTACT,
  };

  it('is a well-formed HTML+text message', () => {
    assertWellFormedMessage(homeVisitCustomerConfirmation(base));
  });

  it('shows a distinct, positive state for a covered comuna', () => {
    const email = homeVisitCustomerConfirmation({ ...base, comunaCovered: true });
    expect(email.html).toContain('Comuna con cobertura');
  });

  it('shows a distinct, non-error state for a comuna pending confirmation — never a definitive rejection', () => {
    const email = homeVisitCustomerConfirmation({ ...base, comunaCovered: false });
    expect(email.html).toContain('Cobertura por confirmar');
    expect(email.html.toLowerCase()).not.toContain('rechazad');
    expect(email.html.toLowerCase()).not.toContain('no podemos atenderte');
    expect(email.text).toContain('no significa que no podamos atenderte');
  });

  it('includes comuna and attention type', () => {
    const email = homeVisitCustomerConfirmation(base);
    expect(email.text).toContain('Quilicura');
    expect(email.text).toContain('Ambas');
  });
});

describe('modules/notifications/templates — homeVisitBusinessNotification', () => {
  const base = {
    requestId: 'req_hv_business_1',
    name: 'Pedro',
    phone: '+56922222222',
    email: null as string | null,
    comuna: 'Quilicura',
    comunaCovered: false,
    attentionType: 'Ambas',
    createdAt: CREATED_AT,
    contact: CONTACT,
  };

  it('is a well-formed HTML+text message with an absolute admin CTA', () => {
    const email = homeVisitBusinessNotification(base);
    assertWellFormedMessage(email);
    expect(email.html).toContain(ADMIN_HOME_VISITS_URL);
  });

  it('includes comuna, coverage state, attention type and contact details', () => {
    const email = homeVisitBusinessNotification(base);
    expect(email.text).toContain('Quilicura');
    expect(email.text).toContain('Cobertura por confirmar');
    expect(email.text).toContain('Ambas');
    expect(email.text).toContain('+56922222222');
  });
});

describe('modules/notifications/templates — dataRightsBusinessNotification', () => {
  const base = {
    requestId: 'req_arco_1',
    rightTypeLabel: 'Acceso',
    name: 'María',
    email: 'maria@example.cl',
    phone: null as string | null,
    description: 'Quiero saber qué datos tienen sobre mí.',
    createdAt: CREATED_AT,
    contact: CONTACT,
  };

  it('is a well-formed HTML+text message with an absolute admin CTA and a confidentiality notice', () => {
    const email = dataRightsBusinessNotification(base);
    assertWellFormedMessage(email);
    expect(email.html).toContain(ADMIN_ARCO_URL);
    expect(email.html.toLowerCase()).toContain('confidencial');
  });

  it('includes right type, name, email, description and receipt date', () => {
    const email = dataRightsBusinessNotification(base);
    expect(email.text).toContain('Acceso');
    expect(email.text).toContain('María');
    expect(email.text).toContain('maria@example.cl');
    expect(email.text).toContain('Quiero saber');
  });

  it('escapes a <script> injection attempt in the description', () => {
    const email = dataRightsBusinessNotification({ ...base, description: '<script>alert(1)</script>' });
    expect(email.html).not.toContain('<script>alert(1)</script>');
  });
});
