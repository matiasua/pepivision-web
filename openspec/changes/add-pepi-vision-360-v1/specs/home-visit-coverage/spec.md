## ADDED Requirements

### Requirement: Listado administrativo de comunas habilitadas
`/admin/home-visits` SHALL mostrar la lista completa de comunas registradas, indicando para cada una si está actualmente activa para atención a domicilio.

#### Scenario: Carga del listado
- **WHEN** un administrador con permiso correspondiente accede a `/admin/home-visits`
- **THEN** el sistema muestra todas las comunas registradas junto con su estado activo/inactivo

### Requirement: Alta de comuna habilitada
`/admin/home-visits` SHALL permitir agregar una nueva comuna a la lista, quedando activa por defecto, e impedir nombres duplicados.

#### Scenario: Alta exitosa
- **WHEN** un administrador agrega una comuna con un nombre que no existe aún en la lista
- **THEN** el sistema la crea como activa y la muestra en el listado

#### Scenario: Nombre duplicado
- **WHEN** un administrador intenta agregar una comuna con un nombre ya existente en la lista
- **THEN** el sistema rechaza el alta e informa que la comuna ya está registrada

### Requirement: Activar/desactivar comuna
`/admin/home-visits` SHALL permitir activar o desactivar una comuna sin eliminarla del registro histórico.

#### Scenario: Desactivar comuna
- **WHEN** un administrador desactiva una comuna previamente activa
- **THEN** el sistema dejar de considerarla habilitada para la validación del formulario público de atención a domicilio, sin eliminar su registro

### Requirement: El formulario público respeta la lista vigente
El formulario público de atención a domicilio (`home-visit-requests`) SHALL consultar la lista de comunas activas vigente al momento de validar cada envío, reflejando cualquier cambio administrativo sin requerir un despliegue de la aplicación.

#### Scenario: Cambio reflejado sin despliegue
- **WHEN** un administrador activa una comuna que antes no existía en la lista
- **THEN** el formulario público la reconoce como habilitada inmediatamente, sin necesidad de ninguna acción de despliegue
