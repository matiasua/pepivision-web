import { describe, expect, it } from 'vitest';
import {
  dataRightsBusinessNotification,
  homeVisitBusinessNotification,
  quoteBusinessNotification,
  quoteCustomerConfirmation,
} from '@/modules/notifications/templates';

describe('modules/notifications/templates', () => {
  it('quote customer confirmation greets the customer by name', () => {
    const email = quoteCustomerConfirmation('Ana');
    expect(email.text).toContain('Ana');
    expect(email.subject.length).toBeGreaterThan(0);
  });

  it('quote business notification includes contact details and request id', () => {
    const email = quoteBusinessNotification({
      requestId: 'req_1',
      name: 'Ana',
      phone: '+56911111111',
      email: 'ana@example.cl',
      comuna: 'Ñuñoa',
      message: 'Hola',
    });
    expect(email.text).toContain('req_1');
    expect(email.text).toContain('Ana');
    expect(email.text).toContain('+56911111111');
  });

  it('quote business notification handles missing optional fields', () => {
    const email = quoteBusinessNotification({
      requestId: 'req_2',
      name: 'Ana',
      phone: '+56911111111',
      email: null,
      comuna: null,
      message: null,
    });
    expect(email.text).toContain('no proporcionado');
    expect(email.text).toContain('no proporcionada');
    expect(email.text).toContain('sin mensaje');
  });

  it('home visit business notification includes comuna', () => {
    const email = homeVisitBusinessNotification({
      requestId: 'req_3',
      name: 'Pedro',
      phone: '+56922222222',
      email: null,
      comuna: 'Quilicura',
      attentionType: 'Ambas',
    });
    expect(email.text).toContain('Quilicura');
    expect(email.text).toContain('Ambas');
  });

  it('data rights business notification includes right type and description', () => {
    const email = dataRightsBusinessNotification({
      requestId: 'dr_1',
      rightTypeLabel: 'Acceso',
      name: 'María',
      email: 'maria@example.cl',
      phone: null,
      description: 'Quiero saber qué datos tienen sobre mí.',
    });
    expect(email.text).toContain('Acceso');
    expect(email.text).toContain('Quiero saber');
  });
});
