## ADDED Requirements

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

### Requirement: Reemplazo de una imagen existente
El sistema SHALL permitir reemplazar una imagen ya asignada a una posición (principal, frontal, lateral) de un producto, dejando de servir la imagen anterior tras el reemplazo.

#### Scenario: Reemplazo exitoso
- **WHEN** un administrador sube una nueva imagen para una posición que ya tenía una imagen asignada
- **THEN** el sistema almacena la nueva imagen, actualiza la referencia del producto para apuntar a ella, y dicha posición deja de mostrar la imagen anterior

### Requirement: Entrega optimizada de imágenes públicas
El sitio público SHALL servir las imágenes de producto a través de un mecanismo de optimización de imágenes (dimensionamiento y formato adecuados por dispositivo), apuntando al almacenamiento externo como origen, en lugar de imágenes embebidas en el propio documento.

#### Scenario: Carga de una ficha de producto
- **WHEN** un visitante carga la ficha de un producto con imágenes asignadas
- **THEN** el sistema sirve esas imágenes desde el almacenamiento externo a través del mecanismo de optimización de imágenes de la aplicación
