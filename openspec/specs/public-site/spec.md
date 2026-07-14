## Purpose

Navegación global, elementos comunes (cookies, WhatsApp flotante) y páginas de contenido del sitio público (inicio, tipos de cristales, nosotros, FAQ, contacto, legales).

## Requirements

### Requirement: Navegación global
El sitio SHALL mostrar una navegación global consistente en todas las páginas públicas: encabezado con logo, menú de navegación (inicio, catálogo, cotizador, tipos de cristales, atención a domicilio, nosotros, preguntas frecuentes, contacto), un CTA de WhatsApp, y un pie de página con navegación, datos de contacto y enlaces legales (privacidad, derechos ARCO, términos, acceso a administración).

#### Scenario: Navegación en escritorio
- **WHEN** un visitante carga cualquier página pública en un ancho de escritorio
- **THEN** el sistema muestra el menú de navegación horizontal en el encabezado y el CTA de WhatsApp visible

#### Scenario: Navegación en móvil
- **WHEN** un visitante carga cualquier página pública en un ancho de pantalla móvil (por debajo del breakpoint definido)
- **THEN** el sistema oculta el menú horizontal y muestra un botón de menú que despliega la navegación en un panel

### Requirement: Aviso de cookies
El sitio SHALL mostrar un aviso de cookies a los visitantes que no lo hayan aceptado previamente, con un enlace a la Política de Privacidad.

#### Scenario: Primera visita
- **WHEN** un visitante carga el sitio sin haber aceptado el aviso de cookies previamente
- **THEN** el sistema muestra el banner de cookies con un botón "Aceptar" y un enlace a la Política de Privacidad

#### Scenario: Aviso ya aceptado
- **WHEN** un visitante que ya aceptó el aviso de cookies vuelve a cargar el sitio
- **THEN** el sistema no vuelve a mostrar el banner

### Requirement: Botón flotante de WhatsApp
El sitio SHALL mostrar un botón flotante que abre una conversación de WhatsApp con un mensaje prellenado, visible en todas las páginas públicas excepto dentro del panel de administración.

#### Scenario: Botón visible en páginas públicas
- **WHEN** un visitante navega cualquier página pública
- **THEN** el sistema muestra el botón flotante de WhatsApp con un enlace `wa.me` con mensaje prellenado

#### Scenario: Botón oculto en administración
- **WHEN** un usuario navega dentro de `/admin`
- **THEN** el sistema no muestra el botón flotante de WhatsApp

### Requirement: Página de inicio
El sitio SHALL mostrar una página de inicio con la propuesta de valor, beneficios destacados, una muestra de modelos del catálogo y una invitación a iniciar el cotizador.

#### Scenario: Carga de inicio
- **WHEN** un visitante accede a la página de inicio
- **THEN** el sistema muestra la propuesta de valor, los beneficios, una selección de modelos destacados obtenidos del catálogo real, y accesos directos al catálogo completo y al cotizador

### Requirement: Página de tipos de cristales
El sitio SHALL mostrar contenido educativo sobre los tipos de cristales disponibles (monofocal, bifocal, multifocal), los tratamientos adicionales ofrecidos y una tabla comparativa, con una invitación a iniciar el cotizador.

#### Scenario: Carga de tipos de cristales
- **WHEN** un visitante accede a la página de tipos de cristales
- **THEN** el sistema muestra los tres tipos de cristal, la lista de tratamientos adicionales y la tabla comparativa, junto con un CTA hacia el cotizador

### Requirement: Página nosotros
El sitio SHALL mostrar contenido institucional sobre Pepi Visión 360 y sus valores de marca.

#### Scenario: Carga de nosotros
- **WHEN** un visitante accede a la página "Nosotros"
- **THEN** el sistema muestra la descripción institucional y los valores de marca definidos

### Requirement: Página de preguntas frecuentes
El sitio SHALL mostrar una lista de preguntas frecuentes en formato acordeón, donde cada pregunta puede expandirse o contraerse de forma independiente.

#### Scenario: Expandir una pregunta
- **WHEN** un visitante hace clic sobre una pregunta cerrada
- **THEN** el sistema expande la respuesta correspondiente y contrae cualquier otra pregunta previamente abierta

### Requirement: Página de contacto
El sitio SHALL mostrar los canales de contacto vigentes (WhatsApp, Instagram, correo, teléfono, horario, ubicación) obtenidos de la configuración de negocio administrada en `business-settings`.

#### Scenario: Datos de contacto reflejan la configuración vigente
- **WHEN** un administrador actualiza los datos de contacto en `/admin/settings`
- **THEN** la página pública de contacto muestra los valores actualizados en la siguiente carga

### Requirement: Páginas legales marcadas como borrador
El sitio SHALL mostrar las páginas de Política de Privacidad, Derechos ARCO y Términos y Condiciones, e incluir en cada una un aviso visible indicando que el contenido es un borrador pendiente de validación legal, hasta que dicho contenido sea reemplazado por una versión validada.

#### Scenario: Aviso de borrador visible
- **WHEN** un visitante accede a cualquiera de las tres páginas legales mientras el contenido siga marcado como borrador
- **THEN** el sistema muestra, de forma visible en la propia página, un aviso indicando que el contenido está pendiente de validación legal

### Requirement: Formulario de solicitud de derechos ARCO
El sitio SHALL ofrecer un formulario público para enviar una solicitud de ejercicio de derechos ARCO (acceso, rectificación, cancelación, oposición, portabilidad, bloqueo), capturando nombre, correo, teléfono opcional, el derecho a ejercer y una descripción, validando los campos obligatorios y el consentimiento antes de aceptar el envío. Un envío válido crea una solicitud real gestionada por la capacidad `data-rights-requests` (persistencia, notificación y seguimiento de estado), no solo una confirmación visual.

#### Scenario: Envío válido
- **WHEN** un visitante completa nombre, correo, el derecho a ejercer, una descripción, y acepta el consentimiento, y envía el formulario
- **THEN** el sistema crea la solicitud (ver `specs/data-rights-requests/spec.md`) y confirma la recepción en pantalla

#### Scenario: Envío incompleto
- **WHEN** un visitante intenta enviar el formulario sin completar un campo obligatorio o sin aceptar el consentimiento
- **THEN** el sistema rechaza el envío y muestra un mensaje de error indicando qué falta completar
