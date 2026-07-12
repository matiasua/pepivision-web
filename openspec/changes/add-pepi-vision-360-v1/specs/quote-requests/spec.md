## ADDED Requirements

### Requirement: Cotizador de 5 pasos
El sitio SHALL ofrecer un cotizador de lentes en 5 pasos secuenciales (armazón, tipo de cristal, tratamientos adicionales, indicación de receta óptica, datos de contacto), mostrando el progreso y permitiendo retroceder a un paso anterior sin perder los datos ya ingresados.

#### Scenario: Avance entre pasos
- **WHEN** un visitante completa un paso del cotizador y elige continuar
- **THEN** el sistema avanza al siguiente paso conservando las selecciones de los pasos anteriores

#### Scenario: Retroceso conserva datos
- **WHEN** un visitante retrocede a un paso anterior del cotizador
- **THEN** el sistema muestra las selecciones que ya había hecho en ese paso, sin perderlas

### Requirement: Selección de armazón en el cotizador
El paso 1 del cotizador SHALL permitir elegir un modelo existente del catálogo real o indicar que se necesita asesoría para elegir uno.

#### Scenario: Selección desde catálogo
- **WHEN** un visitante elige "Elegir del catálogo" en el paso 1
- **THEN** el sistema muestra un selector con los modelos disponibles obtenidos del catálogo real

### Requirement: Indicación de receta óptica sin adjuntar archivo
El paso correspondiente a la receta óptica SHALL preguntar únicamente si el cliente posee una receta vigente (sí/no/no estoy seguro), sin ofrecer ni requerir la subida de ningún archivo o imagen de la receta.

#### Scenario: Cliente indica que posee receta
- **WHEN** un visitante indica que posee una receta óptica vigente
- **THEN** el sistema registra esa indicación en la solicitud, sin solicitar ni aceptar la subida de ningún archivo

### Requirement: Datos de contacto y consentimiento
El último paso del cotizador SHALL exigir nombre y teléfono como obligatorios, validar el formato del correo si se proporciona, y exigir la aceptación explícita del tratamiento de datos personales antes de permitir el envío.

#### Scenario: Envío sin consentimiento
- **WHEN** un visitante intenta enviar el cotizador sin marcar la casilla de consentimiento
- **THEN** el sistema rechaza el envío y muestra un mensaje indicando que debe aceptar el tratamiento de datos

#### Scenario: Correo con formato inválido
- **WHEN** un visitante ingresa un correo con formato inválido en el último paso
- **THEN** el sistema rechaza el envío y muestra un mensaje de error específico sobre el formato del correo

### Requirement: Envío de la solicitud de cotización
Al completar el cotizador con datos válidos, el sistema SHALL crear una solicitud de tipo cotización en la base de datos con el detalle de armazón, cristal, tratamientos e indicación de receta seleccionados, y mostrar una pantalla de confirmación.

#### Scenario: Envío exitoso
- **WHEN** un visitante completa los 5 pasos con datos válidos y confirma el envío
- **THEN** el sistema crea la solicitud, la deja visible en la bandeja administrativa de solicitudes, y muestra una pantalla de confirmación con un CTA para continuar por WhatsApp con un mensaje prellenado

### Requirement: Notificaciones por correo de nueva cotización
Al crearse una solicitud de cotización, el sistema SHALL intentar enviar un correo de confirmación al cliente (si dejó su correo) y un correo de notificación al negocio, registrando el resultado de cada intento.

#### Scenario: Cliente dejó correo
- **WHEN** se crea una solicitud de cotización con un correo de cliente válido
- **THEN** el sistema intenta enviar un correo de confirmación a esa dirección y registra el resultado del intento

#### Scenario: Cliente no dejó correo
- **WHEN** se crea una solicitud de cotización sin correo de cliente
- **THEN** el sistema no intenta enviar correo de confirmación al cliente, pero sí envía la notificación al negocio

#### Scenario: Falla de envío no bloquea la solicitud
- **WHEN** el envío del correo de notificación al negocio falla
- **THEN** la solicitud permanece creada y visible en la bandeja administrativa, y el sistema registra el fallo del envío
