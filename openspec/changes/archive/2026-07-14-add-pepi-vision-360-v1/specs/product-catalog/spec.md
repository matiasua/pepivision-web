## ADDED Requirements

### Requirement: Listado de catálogo
El sitio SHALL mostrar un listado de todos los productos marcados como visibles en el catálogo, obtenido desde la base de datos, con su imagen principal, marca (cuando tenga una asignada), nombre, código, forma, material, colores, precio y disponibilidad.

#### Scenario: Carga del catálogo
- **WHEN** un visitante accede a la página de catálogo
- **THEN** el sistema muestra todos los productos disponibles para el público, cada uno con su información básica y un enlace a su ficha de detalle

#### Scenario: Producto sin marca asignada
- **WHEN** un producto no tiene ninguna marca asignada
- **THEN** el sistema muestra su tarjeta de catálogo sin la etiqueta de marca, sin error ni marcador roto

### Requirement: Búsqueda y filtros de catálogo
El sitio SHALL permitir filtrar el listado de catálogo por texto de búsqueda (nombre o código), género/público objetivo, forma, material, color, marca, rango de precio y disponibilidad, combinando todos los filtros activos simultáneamente.

#### Scenario: Filtro combinado
- **WHEN** un visitante aplica un filtro de género y un filtro de rango de precio a la vez
- **THEN** el sistema muestra solo los productos que cumplen ambas condiciones

#### Scenario: Búsqueda por texto
- **WHEN** un visitante ingresa un término de búsqueda que coincide con el nombre o código de uno o más productos
- **THEN** el sistema muestra únicamente los productos cuyo nombre o código contiene ese término

### Requirement: Filtro por marca (actualización aprobada durante la implementación)
El catálogo SHALL permitir filtrar por marca mediante un identificador de URL basado en el `slug` de la marca (nunca su nombre de exhibición), mostrando únicamente marcas activas que tengan al menos un producto visible, y combinando este filtro con el resto de los filtros existentes.

#### Scenario: Filtrar por una marca
- **WHEN** un visitante selecciona una marca desde el listado de filtros de marca
- **THEN** el sistema muestra únicamente los productos visibles de esa marca, preservando cualquier otro filtro ya activo

#### Scenario: Slug de marca inexistente
- **WHEN** la URL del catálogo incluye un `slug` de marca que no corresponde a ninguna marca activa
- **THEN** el sistema trata la consulta como válida y muestra el estado vacío del catálogo, sin error de servidor

#### Scenario: Solo se listan marcas con productos visibles
- **WHEN** una marca activa no tiene ningún producto visible en el catálogo
- **THEN** el sistema no la incluye en las opciones de filtro por marca

### Requirement: Estado vacío del catálogo
El sitio SHALL mostrar un estado vacío distintivo cuando ningún producto cumple los filtros/búsqueda activos, junto con una opción para limpiar los filtros.

#### Scenario: Sin resultados
- **WHEN** la combinación de filtros y búsqueda activa no coincide con ningún producto
- **THEN** el sistema muestra un mensaje de "sin resultados" y un control para limpiar todos los filtros

### Requirement: Ficha de producto
El sitio SHALL mostrar una ficha de detalle por producto con su galería completa de fotografías (de largo variable, ordenadas, cada una asociada a un color del producto), marca (cuando tenga una asignada), nombre, código, precio referencial, descripción, colores disponibles, especificaciones (material, medidas, forma, disponibilidad) y accesos para cotizar el modelo o consultarlo por WhatsApp.

#### Scenario: Carga de ficha de producto
- **WHEN** un visitante selecciona un producto desde el catálogo, los destacados de inicio, o productos relacionados
- **THEN** el sistema muestra la ficha completa de ese producto con sus datos actuales de la base de datos

#### Scenario: Producto sin ninguna fotografía cargada
- **WHEN** un producto no tiene ninguna fotografía en su galería
- **THEN** el sistema muestra un estado de marcador de posición en lugar de una imagen rota

#### Scenario: Miniaturas indican el color de cada fotografía
- **WHEN** la ficha de un producto muestra las miniaturas de su galería
- **THEN** cada miniatura indica visualmente a qué color del producto corresponde, y seleccionarla actualiza la imagen principal mostrada

#### Scenario: Filtrado/agrupación de la galería por color
- **WHEN** un visitante selecciona uno de los colores disponibles del producto
- **THEN** el sistema muestra primero las fotografías asociadas a ese color, sin ocultar el resto de la galería

#### Scenario: Color sin fotografía propia
- **WHEN** un color disponible del producto no tiene ninguna fotografía asociada
- **THEN** el sistema sigue mostrando ese color como disponible, usando la fotografía de portada del producto como imagen de referencia

#### Scenario: Visor de fotografías en pantalla completa
- **WHEN** un visitante abre cualquier fotografía de la galería para verla en grande
- **THEN** el sistema la muestra en un visor dentro de la misma página (no en una pestaña nueva ni navegando directamente a la URL del almacenamiento), con nombre del producto, color de la fotografía, contador de posición, navegación anterior/siguiente, cierre con Escape o botón de cerrar, y foco devuelto al elemento que abrió el visor al cerrarlo

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
