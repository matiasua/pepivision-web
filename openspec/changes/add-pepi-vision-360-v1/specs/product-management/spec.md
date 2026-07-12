## ADDED Requirements

### Requirement: Listado administrativo de modelos
`/admin/products` SHALL mostrar el listado completo de modelos con foto principal, nombre, código, precio, estado de disponibilidad y acciones de editar/eliminar, junto con contadores de total de modelos, disponibles y bajo pedido.

#### Scenario: Carga del listado
- **WHEN** un administrador autenticado con permiso sobre productos accede a `/admin/products`
- **THEN** el sistema muestra la tabla de modelos junto con los tres contadores calculados sobre los datos vigentes

### Requirement: Alta de modelo
`/admin/products` SHALL permitir crear un nuevo modelo capturando nombre, código, precio, medidas, público objetivo, forma, material, disponibilidad, etiqueta opcional, colores y descripción, exigiendo como obligatorios nombre, código y precio.

#### Scenario: Alta válida
- **WHEN** un administrador completa nombre, código y precio, y guarda el formulario de nuevo modelo
- **THEN** el sistema crea el producto y lo muestra en el listado

#### Scenario: Alta incompleta
- **WHEN** un administrador intenta guardar un nuevo modelo sin nombre, sin código o sin precio
- **THEN** el sistema rechaza el guardado y muestra un mensaje indicando los campos obligatorios faltantes

#### Scenario: Código duplicado
- **WHEN** un administrador intenta guardar un modelo con un código que ya existe en otro producto
- **THEN** el sistema rechaza el guardado e informa que el código ya está en uso

### Requirement: Edición de modelo
`/admin/products` SHALL permitir editar cualquier campo de un modelo existente, incluyendo sus colores y disponibilidad.

#### Scenario: Edición exitosa
- **WHEN** un administrador modifica el precio o la disponibilidad de un modelo existente y guarda
- **THEN** el sistema actualiza el producto y refleja el cambio en el listado administrativo y en el catálogo público

### Requirement: Eliminación de modelo con confirmación
`/admin/products` SHALL requerir una confirmación explícita antes de eliminar definitivamente un modelo.

#### Scenario: Eliminación confirmada
- **WHEN** un administrador solicita eliminar un modelo y confirma la acción
- **THEN** el sistema elimina el producto y deja de mostrarlo en el catálogo público y en el listado administrativo

#### Scenario: Eliminación cancelada
- **WHEN** un administrador solicita eliminar un modelo pero cancela la confirmación
- **THEN** el sistema no elimina el producto

### Requirement: Gestión de colores del modelo
El formulario de modelo SHALL permitir seleccionar colores desde una paleta predefinida y agregar colores personalizados con nombre y valor hexadecimal propio.

#### Scenario: Agregar color personalizado
- **WHEN** un administrador ingresa un nombre y selecciona un valor de color no presente en la paleta predefinida, y lo agrega
- **THEN** el sistema incorpora ese color a la lista de colores disponibles del modelo

### Requirement: Auditoría de cambios de catálogo
Toda alta, edición o eliminación de un modelo SHALL quedar registrada en el registro de auditoría administrativa, identificando al administrador que realizó la acción.

#### Scenario: Registro de auditoría al eliminar
- **WHEN** un administrador elimina un modelo
- **THEN** el sistema crea una entrada de auditoría con el identificador del administrador, la acción realizada y el producto afectado
