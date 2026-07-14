## ADDED Requirements

### Requirement: Persistencia real de solicitudes de derechos ARCO
Al enviarse el formulario público de derechos ARCO (`public-site`) con datos válidos, el sistema SHALL crear un registro `DataRightsRequest` en PostgreSQL con el tipo de derecho, nombre, correo, teléfono (si se proporcionó), descripción, marca de tiempo de consentimiento, y estado inicial `RECEIVED`.

#### Scenario: Creación al enviar el formulario
- **WHEN** un visitante envía el formulario de derechos ARCO con los campos obligatorios completos y el consentimiento aceptado
- **THEN** el sistema crea un `DataRightsRequest` con estado `RECEIVED` y lo deja visible en el panel administrativo

### Requirement: Minimización de datos y sin documentos adjuntos
El formulario y el modelo de datos de `data-rights-requests` SHALL capturar únicamente los campos estrictamente necesarios para gestionar la solicitud (tipo de derecho, nombre, correo, teléfono opcional, descripción), sin ofrecer ni aceptar la subida de ningún archivo o documento adjunto.

#### Scenario: No se ofrece adjuntar archivos
- **WHEN** un visitante completa el formulario de derechos ARCO
- **THEN** el sistema no presenta ningún control para adjuntar archivos ni acepta documentos de ningún tipo como parte del envío

### Requirement: Notificación al negocio de nueva solicitud
Al crearse un `DataRightsRequest`, el sistema SHALL intentar enviar una notificación por correo a la dirección de negocio configurada en `business-settings`, con el detalle de la solicitud, con una versión HTML y una versión de texto plano equivalente (actualización aprobada durante la implementación), y registrar el resultado del intento.

#### Scenario: Notificación enviada
- **WHEN** se crea una nueva solicitud de derechos ARCO
- **THEN** el sistema intenta enviar una notificación por correo al negocio con el tipo de derecho, los datos de contacto y la descripción, y registra el resultado del envío

#### Scenario: Falla de envío no bloquea la solicitud
- **WHEN** el envío de la notificación por correo al negocio falla
- **THEN** la solicitud permanece creada y visible en el panel administrativo, y el sistema registra el fallo del envío

### Requirement: Visibilidad y gestión en el panel administrativo
`/admin/requests` SHALL incluir una sección o pestaña dedicada a solicitudes de derechos ARCO, separada de las solicitudes comerciales (cotizaciones y atención a domicilio), mostrando para cada una su tipo de derecho, datos de contacto, descripción, estado y fecha de creación.

#### Scenario: Carga de la sección de derechos ARCO
- **WHEN** un administrador con permiso sobre solicitudes accede a la sección "Derechos ARCO" de `/admin/requests`
- **THEN** el sistema muestra todas las solicitudes de derechos ARCO vigentes (no eliminadas), independientemente de las solicitudes comerciales

### Requirement: Flujo de estados de una solicitud de derechos ARCO
Cada `DataRightsRequest` SHALL transitar por los estados `RECEIVED`, `IN_REVIEW`, `RESOLVED` y `REJECTED`, permitiendo a un administrador cambiar el estado y, al resolver o rechazar, registrar una nota de resolución.

#### Scenario: Mover a en revisión
- **WHEN** un administrador cambia una solicitud en estado `RECEIVED` a `IN_REVIEW`
- **THEN** el sistema actualiza su estado y lo refleja inmediatamente en el panel

#### Scenario: Resolver con nota
- **WHEN** un administrador marca una solicitud como `RESOLVED` e ingresa una nota de resolución
- **THEN** el sistema persiste el nuevo estado, la nota de resolución, el administrador que la resolvió y la fecha de resolución

#### Scenario: Rechazar una solicitud
- **WHEN** un administrador marca una solicitud como `REJECTED`
- **THEN** el sistema persiste el nuevo estado y permite, igual que en `RESOLVED`, registrar una nota explicando el motivo

### Requirement: Auditoría de cambios de estado
Todo cambio de estado de un `DataRightsRequest` SHALL registrarse en el log de auditoría administrativa (`admin-auth`), identificando al administrador que realizó el cambio, el estado anterior y el nuevo estado.

#### Scenario: Registro de auditoría al resolver
- **WHEN** un administrador cambia el estado de una solicitud de derechos ARCO
- **THEN** el sistema crea una entrada de auditoría con el identificador del administrador, la acción realizada y la solicitud afectada

### Requirement: Retención configurable de solicitudes de derechos ARCO
Cada `DataRightsRequest` SHALL tener una fecha de vencimiento de retención calculada al crearse, a partir del período de retención de derechos ARCO vigente en `business-settings` (12 meses por defecto), de forma independiente del período de retención de las solicitudes comerciales.

#### Scenario: Cálculo de vencimiento al crear
- **WHEN** se crea una nueva solicitud de derechos ARCO
- **THEN** el sistema calcula y almacena su fecha de vencimiento de retención sumando el período de retención de derechos ARCO vigente en ese momento a la fecha de creación

#### Scenario: Cambio de período no afecta solicitudes existentes
- **WHEN** un administrador cambia el período de retención de derechos ARCO después de que ya existen solicitudes
- **THEN** las solicitudes ya creadas conservan su fecha de vencimiento calculada originalmente, y solo las solicitudes nuevas usan el período actualizado
