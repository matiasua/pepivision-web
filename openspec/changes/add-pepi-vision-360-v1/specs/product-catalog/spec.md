## ADDED Requirements

### Requirement: Listado de catálogo
El sitio SHALL mostrar un listado de todos los productos marcados como visibles en el catálogo, obtenido desde la base de datos, con su imagen principal, nombre, código, forma, material, colores, precio y disponibilidad.

#### Scenario: Carga del catálogo
- **WHEN** un visitante accede a la página de catálogo
- **THEN** el sistema muestra todos los productos disponibles para el público, cada uno con su información básica y un enlace a su ficha de detalle

### Requirement: Búsqueda y filtros de catálogo
El sitio SHALL permitir filtrar el listado de catálogo por texto de búsqueda (nombre o código), género/público objetivo, forma, material, color, rango de precio y disponibilidad, combinando todos los filtros activos simultáneamente.

#### Scenario: Filtro combinado
- **WHEN** un visitante aplica un filtro de género y un filtro de rango de precio a la vez
- **THEN** el sistema muestra solo los productos que cumplen ambas condiciones

#### Scenario: Búsqueda por texto
- **WHEN** un visitante ingresa un término de búsqueda que coincide con el nombre o código de uno o más productos
- **THEN** el sistema muestra únicamente los productos cuyo nombre o código contiene ese término

### Requirement: Estado vacío del catálogo
El sitio SHALL mostrar un estado vacío distintivo cuando ningún producto cumple los filtros/búsqueda activos, junto con una opción para limpiar los filtros.

#### Scenario: Sin resultados
- **WHEN** la combinación de filtros y búsqueda activa no coincide con ningún producto
- **THEN** el sistema muestra un mensaje de "sin resultados" y un control para limpiar todos los filtros

### Requirement: Ficha de producto
El sitio SHALL mostrar una ficha de detalle por producto con su galería de imágenes (principal, frontal, lateral), nombre, código, precio referencial, descripción, colores disponibles, especificaciones (material, medidas, forma, disponibilidad) y accesos para cotizar el modelo o consultarlo por WhatsApp.

#### Scenario: Carga de ficha de producto
- **WHEN** un visitante selecciona un producto desde el catálogo, los destacados de inicio, o productos relacionados
- **THEN** el sistema muestra la ficha completa de ese producto con sus datos actuales de la base de datos

#### Scenario: Producto sin imagen cargada
- **WHEN** un producto no tiene una imagen asignada para alguna de sus posiciones (principal/frontal/lateral)
- **THEN** el sistema muestra un estado de marcador de posición para esa posición en lugar de una imagen rota

### Requirement: Productos relacionados
La ficha de producto SHALL mostrar hasta 3 productos relacionados (mismo género o misma forma que el producto actual, excluyéndolo a él mismo).

#### Scenario: Relacionados disponibles
- **WHEN** existen otros productos que comparten género o forma con el producto mostrado
- **THEN** el sistema muestra hasta 3 de ellos como "Productos relacionados", cada uno enlazando a su propia ficha

### Requirement: Indicador de disponibilidad
El catálogo y la ficha de producto SHALL indicar de forma visible si un producto está "Disponible" o "Bajo pedido", reflejando el valor administrado en `product-management`.

#### Scenario: Producto bajo pedido
- **WHEN** un producto está marcado como no disponible en la base de datos
- **THEN** el sistema muestra la etiqueta "Bajo pedido" en su tarjeta de catálogo y en su ficha de detalle
