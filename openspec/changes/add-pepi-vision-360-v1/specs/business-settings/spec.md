## ADDED Requirements

### Requirement: Configuración de datos de negocio
`/admin/settings` SHALL permitir editar el número de WhatsApp, el teléfono visible, el correo de contacto, el usuario de Instagram, el horario de atención y la ubicación mostrados en el sitio público.

#### Scenario: Guardar cambios
- **WHEN** un administrador con permiso sobre configuración edita uno o más de estos campos y guarda
- **THEN** el sistema persiste los nuevos valores y confirma visualmente que se guardaron

#### Scenario: Cambios reflejados en el sitio público
- **WHEN** se guardan cambios en los datos de contacto
- **THEN** las páginas públicas que muestran esos datos (contacto, footer, enlaces de WhatsApp) reflejan los valores actualizados en su siguiente carga

### Requirement: Configuración del período de retención de solicitudes
`/admin/settings` SHALL permitir configurar el período de retención de solicitudes comerciales (cotizaciones y atención a domicilio) en meses, con un valor por defecto de 12 meses.

#### Scenario: Cambiar el período de retención
- **WHEN** un administrador con permiso sobre configuración actualiza el período de retención a un nuevo valor en meses
- **THEN** el sistema persiste el nuevo valor y lo aplica a toda solicitud creada a partir de ese momento

### Requirement: Configuración del período de retención de solicitudes de derechos ARCO
`/admin/settings` SHALL permitir configurar, de forma independiente del período de retención de solicitudes comerciales, el período de retención de solicitudes de derechos ARCO en meses, con un valor por defecto de 12 meses.

#### Scenario: Cambiar el período de retención de derechos ARCO
- **WHEN** un administrador con permiso sobre configuración actualiza el período de retención de solicitudes de derechos ARCO a un nuevo valor en meses
- **THEN** el sistema persiste el nuevo valor de forma independiente del período de retención de solicitudes comerciales, y lo aplica a toda solicitud de derechos ARCO creada a partir de ese momento

### Requirement: Acceso restringido a la configuración
`/admin/settings` SHALL ser accesible únicamente para usuarios administradores con el rol correspondiente (`SUPERADMIN`), rechazando el acceso a usuarios con rol `ADMIN`.

#### Scenario: Acceso denegado a rol insuficiente
- **WHEN** un usuario administrador con rol `ADMIN` intenta acceder a `/admin/settings`
- **THEN** el sistema rechaza el acceso y no muestra el contenido de la página
