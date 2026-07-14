## Purpose

Formulario público de consulta de atención a domicilio y el flujo de creación y notificación de esas solicitudes.

## Requirements

### Requirement: Formulario de consulta de atención a domicilio
El sitio SHALL ofrecer un formulario de consulta de atención a domicilio que capture nombre, comuna, teléfono, correo electrónico opcional y tipo de atención requerida, exigiendo nombre, comuna y teléfono como obligatorios y el consentimiento de tratamiento de datos antes de aceptar el envío. El campo de correo se incorpora respecto del mockup original para poder enviar la confirmación por correo al cliente cuando la proporcione.

#### Scenario: Envío incompleto
- **WHEN** un visitante intenta enviar el formulario sin completar nombre, comuna o teléfono
- **THEN** el sistema rechaza el envío y muestra un mensaje indicando los campos obligatorios faltantes

### Requirement: Validación de comuna habilitada
El formulario SHALL validar la comuna ingresada contra la lista de comunas habilitadas administrada en `home-visit-coverage`, e informar al visitante cuando la comuna indicada no está actualmente habilitada, sin impedir que igualmente registre su interés.

#### Scenario: Comuna habilitada
- **WHEN** un visitante ingresa una comuna que está activa en la lista de comunas habilitadas
- **THEN** el sistema acepta el envío sin advertencias adicionales de cobertura

#### Scenario: Comuna no habilitada
- **WHEN** un visitante ingresa una comuna que no está en la lista de comunas habilitadas o que está inactiva
- **THEN** el sistema muestra una advertencia indicando que la cobertura para esa comuna debe confirmarse caso a caso, pero permite continuar con el envío

### Requirement: Envío de la consulta de domicilio
Al completar el formulario con datos válidos, el sistema SHALL crear una solicitud de tipo atención a domicilio en la base de datos y mostrar una pantalla de confirmación.

#### Scenario: Envío exitoso
- **WHEN** un visitante completa el formulario con datos válidos y consentimiento aceptado, y lo envía
- **THEN** el sistema crea la solicitud, la deja visible en la bandeja administrativa de solicitudes, y muestra una pantalla de confirmación con un CTA para continuar por WhatsApp con un mensaje prellenado

### Requirement: Notificaciones por correo de nueva consulta de domicilio
Al crearse una solicitud de atención a domicilio, el sistema SHALL intentar enviar una notificación al negocio y, si el visitante indicó un correo de contacto, una confirmación al cliente, cada una con una versión HTML y una versión de texto plano equivalente (actualización aprobada durante la implementación), registrando el resultado de cada intento.

#### Scenario: Notificación al negocio
- **WHEN** se crea una solicitud de atención a domicilio
- **THEN** el sistema intenta enviar una notificación a la dirección de correo del negocio configurada en `business-settings` y registra el resultado del intento

#### Scenario: Confirmación al cliente cuando dejó correo
- **WHEN** se crea una solicitud de atención a domicilio con un correo de cliente válido
- **THEN** el sistema intenta enviar un correo de confirmación a esa dirección y registra el resultado del intento
