## Purpose

Autenticación y control de acceso por rol para el panel de administración (`/admin`) de Pepi Visión 360, incluyendo gestión de usuarios administradores y registro de auditoría.

## Requirements

### Requirement: Inicio de sesión con credenciales reales
`/admin` SHALL exigir un identificador (correo o nombre de usuario) y contraseña válidos, verificados contra un usuario administrador almacenado en la base de datos con contraseña hasheada, para conceder acceso al panel.

#### Scenario: Credenciales correctas
- **WHEN** un usuario ingresa el correo y la contraseña correctos de un usuario administrador activo
- **THEN** el sistema crea una sesión válida y concede acceso al panel de administración

#### Scenario: Credenciales incorrectas
- **WHEN** un usuario ingresa un identificador o contraseña incorrectos
- **THEN** el sistema rechaza el inicio de sesión y muestra un mensaje de error genérico, sin indicar cuál de los dos datos fue incorrecto ni si el identificador correspondía a un correo o a un nombre de usuario

#### Scenario: Usuario desactivado
- **WHEN** un usuario administrador desactivado intenta iniciar sesión con sus credenciales correctas
- **THEN** el sistema rechaza el inicio de sesión

### Requirement: Inicio de sesión con nombre de usuario (actualización aprobada durante la implementación)
El sistema SHALL permitir iniciar sesión usando el `username` de la cuenta como alternativa al correo electrónico, resolviendo cuál de los dos identificadores corresponde mediante una única búsqueda que no distinga entre ambos casos hacia el usuario.

#### Scenario: Inicio de sesión con username
- **WHEN** un usuario ingresa su `username` y su contraseña correctos
- **THEN** el sistema crea una sesión válida, igual que si hubiera ingresado su correo

#### Scenario: Mismo mensaje de error para ambos identificadores
- **WHEN** un usuario ingresa un `username` inexistente y cualquier contraseña
- **THEN** el sistema muestra exactamente el mismo mensaje de error genérico que ante un correo inexistente, sin revelar si el identificador correspondía a un correo o a un `username`, ni si la cuenta existe

### Requirement: Límite de intentos de inicio de sesión
El sistema SHALL limitar el número de intentos de inicio de sesión fallidos permitidos por dirección IP/usuario en una ventana de tiempo, bloqueando intentos adicionales una vez superado el límite.

#### Scenario: Bloqueo tras intentos repetidos
- **WHEN** se registran más intentos fallidos de inicio de sesión que el límite permitido dentro de la ventana de tiempo configurada
- **THEN** el sistema rechaza intentos adicionales de inicio de sesión durante el resto de la ventana, independientemente de que las credenciales sean correctas

### Requirement: Sesión persistida e invalidable
El sistema SHALL mantener la sesión de un administrador autenticado mediante un registro persistido en base de datos (no un token autocontenido), permitiendo invalidarla explícitamente mediante cierre de sesión.

#### Scenario: Cierre de sesión
- **WHEN** un administrador autenticado cierra sesión
- **THEN** el sistema invalida su sesión persistida y cualquier intento posterior de usar esa misma sesión es rechazado

#### Scenario: Expiración de sesión
- **WHEN** una sesión supera su tiempo máximo de vigencia sin actividad
- **THEN** el sistema la trata como inválida y exige un nuevo inicio de sesión

### Requirement: Control de acceso por rol
El sistema SHALL reconocer al menos dos roles administradores (`SUPERADMIN` y `ADMIN`), restringiendo `/admin/users` y `/admin/settings` exclusivamente a `SUPERADMIN`, y validando el rol en el servidor en cada acción administrativa, no solo en la interfaz.

#### Scenario: Rol operativo sin acceso a usuarios
- **WHEN** un usuario con rol `ADMIN` intenta acceder a `/admin/users`
- **THEN** el sistema rechaza el acceso

#### Scenario: Validación server-side de rol
- **WHEN** un usuario con rol `ADMIN` intenta invocar directamente una acción reservada a `SUPERADMIN` sin pasar por la interfaz correspondiente
- **THEN** el sistema rechaza la acción en el servidor, independientemente de lo que la interfaz del cliente permita

### Requirement: Gestión de usuarios administradores
`/admin/users` SHALL permitir a un usuario `SUPERADMIN` crear nuevos usuarios administradores (correo, nombre, contraseña inicial, rol) y desactivar usuarios existentes, sin permitir eliminar al único `SUPERADMIN` activo restante.

#### Scenario: Crear un nuevo administrador
- **WHEN** un `SUPERADMIN` crea un nuevo usuario administrador con rol `ADMIN`
- **THEN** el sistema crea el usuario con una contraseña hasheada y ese usuario puede iniciar sesión con las credenciales asignadas

#### Scenario: Impedir quedar sin superadministradores
- **WHEN** un `SUPERADMIN` intenta desactivar al único usuario `SUPERADMIN` activo restante
- **THEN** el sistema rechaza la operación

### Requirement: Registro de auditoría de acciones administrativas
El sistema SHALL registrar en un log de auditoría de solo-inserción cada acción administrativa sensible (inicio y cierre de sesión, alta/edición/eliminación de productos, cambios de estado o eliminación de solicitudes comerciales, cambios de estado de solicitudes de derechos ARCO, cambios de configuración de negocio, cambios en comunas habilitadas, alta/edición/desactivación de usuarios), incluyendo el usuario que la realizó, la acción y la entidad afectada.

#### Scenario: Registro de una acción sensible
- **WHEN** un administrador realiza cualquiera de las acciones sensibles listadas
- **THEN** el sistema crea una entrada de auditoría con el identificador del administrador, la acción, la entidad afectada y la marca de tiempo

#### Scenario: El registro de auditoría no es editable desde la interfaz
- **WHEN** cualquier usuario administrador navega el registro de auditoría
- **THEN** el sistema no ofrece ninguna acción para editar o eliminar entradas existentes
