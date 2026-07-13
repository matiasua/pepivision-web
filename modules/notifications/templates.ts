interface EmailContent {
  subject: string;
  text: string;
}

export function quoteCustomerConfirmation(name: string): EmailContent {
  return {
    subject: 'Recibimos tu cotización — Pepi Visión 360',
    text: `Hola ${name},\n\nRecibimos tu solicitud de cotización. Te contactaremos pronto con un presupuesto referencial. El valor final dependerá de tu receta, el armazón y los tratamientos seleccionados.\n\nGracias por escribirnos.\nPepi Visión 360`,
  };
}

export function quoteBusinessNotification(details: {
  requestId: string;
  name: string;
  phone: string;
  email: string | null;
  comuna: string | null;
  message: string | null;
}): EmailContent {
  return {
    subject: `Nueva cotización — ${details.name}`,
    text: [
      `Nueva solicitud de cotización (id ${details.requestId}).`,
      `Nombre: ${details.name}`,
      `Teléfono: ${details.phone}`,
      `Correo: ${details.email ?? '(no proporcionado)'}`,
      `Comuna: ${details.comuna ?? '(no proporcionada)'}`,
      `Mensaje: ${details.message ?? '(sin mensaje)'}`,
    ].join('\n'),
  };
}

export function homeVisitCustomerConfirmation(name: string): EmailContent {
  return {
    subject: 'Recibimos tu consulta de atención a domicilio — Pepi Visión 360',
    text: `Hola ${name},\n\nRevisaremos la cobertura para tu comuna y te contactaremos a la brevedad. Gracias por escribirnos.\n\nPepi Visión 360`,
  };
}

export function homeVisitBusinessNotification(details: {
  requestId: string;
  name: string;
  phone: string;
  email: string | null;
  comuna: string;
  attentionType: string | null;
}): EmailContent {
  return {
    subject: `Nueva consulta de atención a domicilio — ${details.name}`,
    text: [
      `Nueva consulta de atención a domicilio (id ${details.requestId}).`,
      `Nombre: ${details.name}`,
      `Comuna: ${details.comuna}`,
      `Teléfono: ${details.phone}`,
      `Correo: ${details.email ?? '(no proporcionado)'}`,
      `Tipo de atención: ${details.attentionType ?? '(no especificado)'}`,
    ].join('\n'),
  };
}

export function dataRightsBusinessNotification(details: {
  requestId: string;
  rightTypeLabel: string;
  name: string;
  email: string;
  phone: string | null;
  description: string;
}): EmailContent {
  return {
    subject: `Nueva solicitud de derechos ARCO — ${details.rightTypeLabel}`,
    text: [
      `Nueva solicitud de derechos ARCO (id ${details.requestId}).`,
      `Derecho: ${details.rightTypeLabel}`,
      `Nombre: ${details.name}`,
      `Correo: ${details.email}`,
      `Teléfono: ${details.phone ?? '(no proporcionado)'}`,
      `Descripción: ${details.description}`,
    ].join('\n'),
  };
}
