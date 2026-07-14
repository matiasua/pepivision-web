## Purpose

Validación, procesamiento, almacenamiento externo y entrega optimizada de las fotografías de producto, fuera del contenedor de la aplicación.

## Requirements

### Requirement: Validación de archivos subidos
El sistema SHALL validar, en el servidor, que cada imagen de producto subida sea de un tipo MIME permitido (formatos de imagen estándar) y no exceda un tamaño máximo configurado, rechazando cualquier archivo que no cumpla ambas condiciones antes de procesarlo.

#### Scenario: Archivo válido
- **WHEN** un administrador sube una imagen de un tipo permitido y dentro del tamaño máximo permitido
- **THEN** el sistema acepta el archivo y continúa con el procesamiento

#### Scenario: Tipo de archivo no permitido
- **WHEN** un administrador intenta subir un archivo que no es una imagen de un tipo permitido
- **THEN** el sistema rechaza la subida y muestra un mensaje de error, sin almacenar el archivo

#### Scenario: Archivo demasiado grande
- **WHEN** un administrador intenta subir una imagen que excede el tamaño máximo permitido
- **THEN** el sistema rechaza la subida y muestra un mensaje de error indicando el límite permitido

### Requirement: Procesamiento server-side de imágenes
El sistema SHALL redimensionar/optimizar cada imagen de producto en el servidor antes de almacenarla, sin depender de ningún procesamiento realizado en el navegador del administrador.

#### Scenario: Redimensionado antes de almacenar
- **WHEN** se sube una imagen válida de un producto
- **THEN** el sistema la procesa en el servidor a una resolución y calidad estandarizadas antes de subirla al almacenamiento externo

### Requirement: Almacenamiento fuera del contenedor de la aplicación mediante una abstracción configurable
El sistema SHALL almacenar toda imagen de producto en un servicio de almacenamiento de objetos externo compatible con S3, accedido mediante una abstracción configurable por variables de entorno (`OBJECT_STORAGE_ENDPOINT`, `OBJECT_STORAGE_REGION`, `OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_ACCESS_KEY`, `OBJECT_STORAGE_SECRET_KEY`, `OBJECT_STORAGE_FORCE_PATH_STYLE`), y nunca en el sistema de archivos del contenedor de la aplicación ni codificada dentro de la base de datos. En el entorno de desarrollo local, ese almacenamiento es el servicio `minio` del Docker Compose; el proveedor productivo se decide y configura por separado, sin requerir cambios de código.

#### Scenario: Imagen persistida en almacenamiento externo
- **WHEN** una imagen de producto termina de procesarse exitosamente
- **THEN** el sistema la sube al bucket de almacenamiento de objetos configurado (`OBJECT_STORAGE_BUCKET`) a través del endpoint configurado (`OBJECT_STORAGE_ENDPOINT`), y guarda únicamente la referencia (clave/URL) en la base de datos

#### Scenario: Bucket local disponible en desarrollo
- **WHEN** el entorno de desarrollo local se levanta con `docker compose up --build`
- **THEN** el bucket configurado en `OBJECT_STORAGE_BUCKET` existe automáticamente en la instancia local de MinIO, sin pasos manuales adicionales

### Requirement: Reemplazo de una fotografía existente
El sistema SHALL permitir reemplazar el archivo de una fotografía ya existente en la galería de un producto, conservando su color, orden y estado de portada, y dejando de servir el archivo anterior tras el reemplazo.

#### Scenario: Reemplazo exitoso
- **WHEN** un administrador sube un nuevo archivo para reemplazar una fotografía ya existente en la galería
- **THEN** el sistema almacena el archivo nuevo, actualiza la referencia de esa misma fotografía para apuntar a él (sin cambiar su color, `sortOrder` ni si es portada), y esa fotografía deja de mostrar el archivo anterior

### Requirement: Galería de fotografías de largo variable asociadas a un color
El sistema SHALL permitir una cantidad variable de fotografías por producto (no limitada a un conjunto fijo de posiciones), donde cada fotografía está asociada a uno de los colores definidos para ese producto. El sistema SHALL rechazar la asociación de una fotografía a un color que no pertenezca al producto de esa fotografía, tanto a nivel de aplicación como mediante una restricción de la base de datos.

#### Scenario: Varias fotografías del mismo color
- **WHEN** un administrador sube más de una fotografía asociada al mismo color de un producto
- **THEN** el sistema acepta todas las fotografías y las conserva asociadas a ese color

#### Scenario: Fotografías de distintos colores
- **WHEN** un producto tiene fotografías asociadas a más de un color
- **THEN** el sistema conserva cada fotografía asociada a su color correspondiente y expone esa asociación tanto en el panel administrativo como en el catálogo público

#### Scenario: Intento de asociar un color de otro producto
- **WHEN** se intenta asociar una fotografía a un `productColorId` que pertenece a un producto distinto
- **THEN** el sistema rechaza la operación con un mensaje de error, sin modificar la fotografía

#### Scenario: Producto sin colores todavía
- **WHEN** un administrador intenta subir una fotografía para un producto que no tiene ningún color definido
- **THEN** el sistema rechaza la subida indicando que primero debe agregarse al menos un color al producto

#### Scenario: Límite operativo de fotografías
- **WHEN** un producto ya alcanzó el máximo operativo de fotografías configurado (no inferior a 12)
- **THEN** el sistema rechaza nuevas subidas para ese producto con un mensaje indicando el límite alcanzado

### Requirement: Portada y orden de la galería
El sistema SHALL permitir definir un orden explícito para las fotografías de un producto y designar como máximo una de ellas como portada. La portada SHALL ser la fotografía utilizada como imagen principal en las tarjetas del catálogo y en la ficha del producto.

#### Scenario: Primera fotografía se vuelve portada automáticamente
- **WHEN** se sube la primera fotografía de un producto que todavía no tiene ninguna
- **THEN** el sistema la designa automáticamente como portada

#### Scenario: Cambio manual de portada
- **WHEN** un administrador designa una fotografía distinta como portada
- **THEN** el sistema dejar de mostrar la anterior como portada y refleja el cambio en el catálogo público

#### Scenario: Eliminar la portada con otras fotografías restantes
- **WHEN** se elimina la fotografía marcada como portada y quedan otras fotografías del producto
- **THEN** el sistema designa automáticamente como nueva portada a la primera fotografía restante según su orden

#### Scenario: Reordenamiento
- **WHEN** un administrador cambia el orden de las fotografías de un producto
- **THEN** el sistema persiste el nuevo orden y lo refleja tanto en el panel administrativo como en la galería pública

### Requirement: Entrega optimizada de imágenes públicas
El sitio público SHALL servir las imágenes de producto a través de un mecanismo de optimización de imágenes (dimensionamiento y formato adecuados por dispositivo), apuntando al almacenamiento externo como origen, en lugar de imágenes embebidas en el propio documento.

#### Scenario: Carga de una ficha de producto
- **WHEN** un visitante carga la ficha de un producto con imágenes asignadas
- **THEN** el sistema sirve esas imágenes desde el almacenamiento externo a través del mecanismo de optimización de imágenes de la aplicación
