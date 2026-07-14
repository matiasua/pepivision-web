## Purpose

Bandeja administrativa unificada (`/admin/requests`) de solicitudes comerciales (cotizaciones y atención a domicilio).

## Requirements

### Requirement: Bandeja unificada de solicitudes comerciales
`/admin/requests` SHALL mostrar todas las solicitudes de cotización y de atención a domicilio (solicitudes comerciales) en una sola lista, ordenadas por fecha de creación descendente, indicando para cada una su tipo, estado, datos de contacto y detalle relevante según el tipo. Las solicitudes de derechos ARCO se gestionan en una sección separada dentro de la misma ruta, según `specs/data-rights-requests/spec.md`, y no forman parte de esta bandeja.

#### Scenario: Carga de la bandeja
- **WHEN** un administrador con permiso sobre solicitudes accede a `/admin/requests`
- **THEN** el sistema muestra todas las solicitudes vigentes (no eliminadas) con su tipo, estado y detalle

### Requirement: Filtro por tipo de solicitud
`/admin/requests` SHALL permitir filtrar la bandeja por "todas", "cotizaciones" o "atención a domicilio".

#### Scenario: Filtrar por cotizaciones
- **WHEN** un administrador selecciona el filtro "Cotizaciones"
- **THEN** el sistema muestra únicamente las solicitudes de tipo cotización

### Requirement: Cambio de estado de una solicitud
`/admin/requests` SHALL permitir alternar el estado de una solicitud entre "nueva" y "atendida".

#### Scenario: Marcar como atendida
- **WHEN** un administrador marca una solicitud "nueva" como atendida
- **THEN** el sistema actualiza su estado y dicho cambio queda reflejado inmediatamente en la bandeja

### Requirement: Contacto directo desde la bandeja
Cada solicitud en `/admin/requests` SHALL incluir un acceso directo para contactar al cliente por WhatsApp con un mensaje prellenado.

#### Scenario: Contactar por WhatsApp
- **WHEN** un administrador hace clic en "Contactar" sobre una solicitud
- **THEN** el sistema abre un enlace `wa.me` al número del cliente con un mensaje prellenado de seguimiento

### Requirement: Eliminación de una solicitud con confirmación
`/admin/requests` SHALL requerir una confirmación explícita antes de eliminar definitivamente una solicitud.

#### Scenario: Eliminación confirmada
- **WHEN** un administrador solicita eliminar una solicitud y confirma la acción
- **THEN** el sistema deja de mostrar esa solicitud en la bandeja

### Requirement: Estado vacío de la bandeja
`/admin/requests` SHALL mostrar un estado vacío distintivo cuando no existan solicitudes que cumplan el filtro activo.

#### Scenario: Sin solicitudes
- **WHEN** no existe ninguna solicitud vigente que cumpla el filtro seleccionado
- **THEN** el sistema muestra un mensaje indicando que no hay solicitudes por ahora

### Requirement: Acceso administrativo a la receta adjunta mediante URL firmada (actualización aprobada durante la implementación)
Cuando una solicitud de cotización tenga un archivo de receta adjunto, `/admin/requests` SHALL indicar su existencia (tipo, nombre y tamaño) y SHALL permitir verlo o descargarlo únicamente a un administrador autenticado, mediante una URL firmada de corta duración generada tras verificar sesión y autorización server-side — nunca exponiendo el bucket privado directamente ni una URL permanente.

#### Scenario: Administrador visualiza/descarga la receta adjunta
- **WHEN** un administrador autenticado solicita ver o descargar la receta adjunta de una solicitud
- **THEN** el sistema verifica su sesión, genera una URL firmada de corta duración contra el bucket privado, y la entrega solo a ese administrador

#### Scenario: Cada acceso queda auditado
- **WHEN** un administrador visualiza o descarga una receta adjunta
- **THEN** el sistema registra una entrada de auditoría identificando al administrador, la solicitud y el adjunto accedido

#### Scenario: Solicitud sin adjunto no ofrece la acción
- **WHEN** una solicitud de cotización no tiene ningún archivo de receta adjunto
- **THEN** la bandeja administrativa no muestra ninguna acción de ver/descargar adjunto para esa solicitud

### Requirement: Retención configurable de solicitudes
Cada solicitud SHALL tener una fecha de vencimiento de retención calculada al crearse, a partir del período de retención vigente en `business-settings` (12 meses por defecto), visible para el administrador en la bandeja.

#### Scenario: Cálculo de vencimiento al crear
- **WHEN** se crea una nueva solicitud
- **THEN** el sistema calcula y almacena su fecha de vencimiento de retención sumando el período configurado en ese momento a la fecha de creación

#### Scenario: Cambio de período no afecta solicitudes existentes
- **WHEN** un administrador cambia el período de retención configurado después de que ya existen solicitudes
- **THEN** las solicitudes ya creadas conservan su fecha de vencimiento calculada originalmente, y solo las solicitudes nuevas usan el período actualizado
