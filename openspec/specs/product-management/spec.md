## Purpose

CRUD administrativo de modelos de armazones (`/admin/products`), incluyendo gestión de colores y galería de fotografías por color.

## Requirements

### Requirement: Listado administrativo de modelos
`/admin/products` SHALL mostrar el listado completo de modelos con foto principal, nombre, código, precio, estado de disponibilidad y acciones de editar/eliminar, junto con contadores de total de modelos, disponibles y bajo pedido.

#### Scenario: Carga del listado
- **WHEN** un administrador autenticado con permiso sobre productos accede a `/admin/products`
- **THEN** el sistema muestra la tabla de modelos junto con los tres contadores calculados sobre los datos vigentes

### Requirement: Alta de modelo
`/admin/products` SHALL permitir crear un nuevo modelo capturando nombre, código, marca, precio, medidas, público objetivo, forma, material, disponibilidad, etiqueta opcional, colores y descripción, exigiendo como obligatorios nombre, código, marca y precio.

#### Scenario: Alta válida
- **WHEN** un administrador completa nombre, código y precio, y guarda el formulario de nuevo modelo
- **THEN** el sistema crea el producto y lo muestra en el listado

#### Scenario: Alta incompleta
- **WHEN** un administrador intenta guardar un nuevo modelo sin nombre, sin código o sin precio
- **THEN** el sistema rechaza el guardado y muestra un mensaje indicando los campos obligatorios faltantes

#### Scenario: Código duplicado
- **WHEN** un administrador intenta guardar un modelo con un código que ya existe en otro producto
- **THEN** el sistema rechaza el guardado e informa que el código ya está en uso

### Requirement: Selección de marca (actualización aprobada durante la implementación)
El formulario de modelo SHALL exigir la selección de una marca activa desde una lista (nunca texto libre), validando en el servidor que la marca elegida exista y esté activa antes de guardar. Los productos creados antes de esta capacidad pueden permanecer sin marca asignada hasta que un administrador la complete.

#### Scenario: Marca inválida o inactiva
- **WHEN** un administrador intenta guardar un modelo con un identificador de marca que no existe o que corresponde a una marca desactivada
- **THEN** el sistema rechaza el guardado con un mensaje indicando que debe seleccionar una marca válida

#### Scenario: Producto existente sin marca
- **WHEN** un administrador abre para editar un producto creado antes de que existiera esta capacidad y que no tiene marca asignada
- **THEN** el sistema permite completar la marca sin bloquear el resto de la edición, y exige elegir una válida antes de guardar

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
El formulario de modelo SHALL permitir seleccionar colores desde una paleta predefinida y agregar colores personalizados con nombre y valor hexadecimal propio. Un color ya guardado SHALL conservar su identidad entre ediciones (no ser eliminado y recreado), y el sistema SHALL rechazar la eliminación de un color que todavía tenga fotografías asociadas en su galería.

#### Scenario: Agregar color personalizado
- **WHEN** un administrador ingresa un nombre y selecciona un valor de color no presente en la paleta predefinida, y lo agrega
- **THEN** el sistema incorpora ese color a la lista de colores disponibles del modelo

#### Scenario: Intento de quitar un color con fotografías asociadas
- **WHEN** un administrador guarda el formulario de edición habiendo quitado un color que todavía tiene fotografías asociadas en la galería del producto
- **THEN** el sistema rechaza el guardado con un mensaje indicando qué colores no pueden quitarse y por qué, sin perder ningún dato

### Requirement: Sincronización inmediata de colores en un modelo existente (actualización aprobada durante la implementación)
Para un modelo ya creado, agregar o quitar un color SHALL ser una mutación inmediata e independiente del guardado general del formulario — el color queda disponible para asignarle fotografías en la galería (o deja de estarlo) sin necesidad de guardar el formulario completo ni de volver a entrar a la página. Un color agregado SHALL recibir un identificador real persistido de inmediato, nunca uno temporal simulado en el cliente. Quitar un color con fotografías asociadas SHALL quedar bloqueado (nunca una eliminación silenciosa), ofreciendo reasignar esas fotografías a otro color del mismo producto como vía para completar la eliminación.

#### Scenario: Color agregado disponible de inmediato para la galería
- **WHEN** un administrador agrega un color nuevo a un modelo ya creado
- **THEN** el color aparece de inmediato tanto en el selector de colores como en las opciones de la galería de fotografías, sin que el administrador haya guardado el formulario completo

#### Scenario: Color eliminado desaparece de inmediato
- **WHEN** un administrador elimina un color de un modelo ya creado (sin fotografías asociadas)
- **THEN** el color deja de aparecer de inmediato en el selector de colores y en las opciones de la galería

#### Scenario: Reasignar fotografías para completar la eliminación de un color
- **WHEN** un administrador elige reasignar las fotografías de un color bloqueado (por tener fotografías asociadas) hacia otro color del mismo producto, y confirma
- **THEN** el sistema mueve esas fotografías al color de destino y elimina el color de origen, sin dejar fotografías huérfanas ni colores con fotografías inválidas

### Requirement: Galería de fotografías por color en el panel administrativo
El formulario de edición de modelo SHALL mostrar una sección de galería de fotografías (sin límite estructural de tres) donde cada fotografía requiere seleccionar previamente uno de los colores del producto, permite reordenar, definir portada, cambiar el color asociado, reemplazar y eliminar, y no permite subir una fotografía sin un color seleccionado ni asociarla a un color ajeno al producto.

#### Scenario: Producto sin colores todavía
- **WHEN** un administrador abre la sección de galería de un producto que todavía no tiene ningún color definido
- **THEN** el sistema impide subir fotografías y muestra un mensaje indicando que primero debe agregar al menos un color al producto

#### Scenario: Confirmación visible de las operaciones de galería
- **WHEN** un administrador sube, reemplaza, elimina, reordena, cambia el color o cambia la portada de una fotografía
- **THEN** el sistema muestra una confirmación de éxito clara y accesible (anunciada mediante `aria-live`) que desaparece automáticamente o puede cerrarse manualmente, sin necesidad de recargar la página

### Requirement: Auditoría de cambios de catálogo
Toda alta, edición o eliminación de un modelo SHALL quedar registrada en el registro de auditoría administrativa, identificando al administrador que realizó la acción. Toda subida, reemplazo, eliminación, reordenamiento, cambio de color y cambio de portada de una fotografía SHALL quedar registrada de la misma forma, sin incluir contenido binario ni datos sensibles en el registro.

#### Scenario: Registro de auditoría al eliminar
- **WHEN** un administrador elimina un modelo
- **THEN** el sistema crea una entrada de auditoría con el identificador del administrador, la acción realizada y el producto afectado

#### Scenario: Registro de auditoría en operaciones de galería
- **WHEN** un administrador sube, reemplaza, elimina, reordena, cambia el color o cambia la portada de una fotografía
- **THEN** el sistema crea una entrada de auditoría identificando la acción específica realizada, sin registrar el contenido del archivo ni credenciales
