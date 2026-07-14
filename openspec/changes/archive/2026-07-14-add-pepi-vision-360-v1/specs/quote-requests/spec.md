## ADDED Requirements

### Requirement: Cotizador de 5 pasos
El sitio SHALL ofrecer un cotizador de lentes en 5 pasos secuenciales (armazón, tipo de cristal, tratamientos adicionales, indicación de receta óptica, datos de contacto), mostrando el progreso y permitiendo retroceder a un paso anterior sin perder los datos ya ingresados.

#### Scenario: Avance entre pasos
- **WHEN** un visitante completa un paso del cotizador y elige continuar
- **THEN** el sistema avanza al siguiente paso conservando las selecciones de los pasos anteriores

#### Scenario: Retroceso conserva datos
- **WHEN** un visitante retrocede a un paso anterior del cotizador
- **THEN** el sistema muestra las selecciones que ya había hecho en ese paso, sin perderlas

### Requirement: Selección de armazón en el cotizador
El paso 1 del cotizador SHALL permitir elegir un modelo existente del catálogo real o indicar que se necesita asesoría para elegir uno.

#### Scenario: Selección desde catálogo
- **WHEN** un visitante elige "Elegir del catálogo" en el paso 1
- **THEN** el sistema muestra un selector con los modelos disponibles obtenidos del catálogo real

### Requirement: Selección obligatoria de color al elegir un modelo del catálogo
Cuando el visitante elige un modelo del catálogo en el paso 1, el sistema SHALL exigir la selección de uno de los colores disponibles de ese modelo antes de permitir avanzar, y SHALL verificar en el servidor —contra los datos reales del producto en PostgreSQL, nunca confiando en el valor recibido del navegador— que el color elegido efectivamente pertenece al modelo seleccionado.

#### Scenario: Intento de avanzar sin color
- **WHEN** un visitante eligió un modelo del catálogo pero no ha seleccionado un color
- **THEN** el sistema impide avanzar y muestra un mensaje indicando que debe seleccionar un color

#### Scenario: Cambio de modelo limpia el color elegido
- **WHEN** un visitante cambia el modelo seleccionado después de haber elegido un color
- **THEN** el sistema limpia la selección de color anterior y exige una nueva selección entre los colores del nuevo modelo

#### Scenario: Color manipulado no pertenece al modelo
- **WHEN** el servidor recibe una solicitud de cotización donde el color indicado no pertenece al modelo indicado
- **THEN** el sistema rechaza la solicitud con un mensaje de error, sin crearla

#### Scenario: Asesoría no requiere color
- **WHEN** un visitante elige "Necesito asesoría" en el paso 1 (sin modelo del catálogo)
- **THEN** el sistema no exige la selección de ningún color para avanzar

### Requirement: Indicación de receta óptica con adjunto opcional (actualización aprobada durante la implementación)
El paso correspondiente a la receta óptica SHALL preguntar si el cliente posee una receta vigente (sí/no/no estoy seguro) y, cuando responde que sí, SHALL ofrecer — sin exigir — adjuntar el archivo de la receta (PDF, JPG, PNG o WebP, hasta 10 MB). El sistema nunca SHALL exigir el adjunto para poder enviar la solicitud.

#### Scenario: Cliente indica que posee receta sin adjuntar archivo
- **WHEN** un visitante indica que posee una receta óptica vigente y no adjunta ningún archivo
- **THEN** el sistema registra esa indicación en la solicitud y permite enviarla normalmente, sin exigir el adjunto

#### Scenario: Cliente adjunta un archivo válido
- **WHEN** un visitante indica que posee receta y adjunta un archivo PDF, JPG, PNG o WebP dentro del límite de tamaño
- **THEN** el sistema acepta el archivo, muestra su nombre y tamaño, y lo incluye en el envío de la solicitud

#### Scenario: Archivo de tipo no permitido
- **WHEN** un visitante intenta adjuntar un archivo cuyo tipo declarado o contenido real no corresponde a PDF, JPG, PNG ni WebP
- **THEN** el sistema rechaza el archivo con un mensaje de error claro, sin bloquear el resto del formulario

#### Scenario: Archivo que excede el tamaño máximo
- **WHEN** un visitante intenta adjuntar un archivo que supera el límite de tamaño configurado
- **THEN** el sistema rechaza el archivo indicando el límite permitido

#### Scenario: Cambiar la respuesta limpia el archivo seleccionado
- **WHEN** un visitante había adjuntado un archivo y cambia su respuesta de "Sí" a "No" o "No estoy seguro"
- **THEN** el sistema descarta el archivo seleccionado sin subirlo, y no lo incluye en el envío

### Requirement: Almacenamiento privado del adjunto de receta (actualización aprobada durante la implementación)
Todo archivo de receta adjunto SHALL almacenarse en un bucket privado separado del de fotografías de producto, sin acceso anónimo y sin URL pública permanente. El sistema SHALL rechazar la subida si el contenido real del archivo no corresponde al tipo declarado, independientemente de la extensión o el `Content-Type` enviado por el navegador.

#### Scenario: El archivo nunca queda en el bucket público
- **WHEN** se sube un archivo de receta adjunto a una cotización
- **THEN** el sistema lo almacena en el bucket privado configurado (`PRIVATE_OBJECT_STORAGE_BUCKET`), nunca en el bucket público de fotografías de producto

#### Scenario: Contenido no coincide con el tipo declarado
- **WHEN** un archivo declara ser de un tipo permitido pero su contenido real no corresponde a ese tipo (p. ej. un ejecutable renombrado como `.pdf`)
- **THEN** el sistema rechaza el archivo, sin almacenarlo

#### Scenario: Falla de persistencia no deja un archivo huérfano
- **WHEN** el archivo se sube exitosamente al bucket privado pero la creación de la solicitud en la base de datos falla
- **THEN** el sistema elimina el archivo recién subido del bucket privado como compensación, y no se muestra una confirmación de envío exitoso

### Requirement: Datos de contacto y consentimiento
El último paso del cotizador SHALL exigir nombre y teléfono como obligatorios, validar el formato del correo si se proporciona, y exigir la aceptación explícita del tratamiento de datos personales antes de permitir el envío.

#### Scenario: Envío sin consentimiento
- **WHEN** un visitante intenta enviar el cotizador sin marcar la casilla de consentimiento
- **THEN** el sistema rechaza el envío y muestra un mensaje indicando que debe aceptar el tratamiento de datos

#### Scenario: Correo con formato inválido
- **WHEN** un visitante ingresa un correo con formato inválido en el último paso
- **THEN** el sistema rechaza el envío y muestra un mensaje de error específico sobre el formato del correo

### Requirement: Envío de la solicitud de cotización
Al completar el cotizador con datos válidos, el sistema SHALL crear una solicitud de tipo cotización en la base de datos con el detalle de armazón (incluyendo, cuando corresponde, la marca y el color elegido — id, nombre y valor hexadecimal/marca resueltos desde PostgreSQL, no desde el valor enviado por el navegador), cristal, tratamientos e indicación de receta seleccionados, y mostrar una pantalla de confirmación.

#### Scenario: Envío exitoso
- **WHEN** un visitante completa los 5 pasos con datos válidos y confirma el envío
- **THEN** el sistema crea la solicitud, la deja visible en la bandeja administrativa de solicitudes, y muestra una pantalla de confirmación con un CTA para continuar por WhatsApp con un mensaje prellenado

### Requirement: Notificaciones por correo de nueva cotización
Al crearse una solicitud de cotización, el sistema SHALL intentar enviar un correo de confirmación al cliente (si dejó su correo) y un correo de notificación al negocio, cada uno con una versión HTML y una versión de texto plano equivalente, registrando el resultado de cada intento.

#### Scenario: Cliente dejó correo
- **WHEN** se crea una solicitud de cotización con un correo de cliente válido
- **THEN** el sistema intenta enviar un correo de confirmación (HTML + texto plano) a esa dirección y registra el resultado del intento

#### Scenario: Marca y color elegidos incluidos en las notificaciones y el mensaje de WhatsApp
- **WHEN** se crea una solicitud de cotización con un modelo, marca y color elegidos
- **THEN** el correo de confirmación al cliente, el correo de notificación al negocio, y el mensaje prellenado de WhatsApp de la pantalla de confirmación incluyen el nombre de la marca y del color elegido

#### Scenario: Cliente no dejó correo
- **WHEN** se crea una solicitud de cotización sin correo de cliente
- **THEN** el sistema no intenta enviar correo de confirmación al cliente, pero sí envía la notificación al negocio

#### Scenario: Falla de envío no bloquea la solicitud
- **WHEN** el envío del correo de notificación al negocio falla
- **THEN** la solicitud permanece creada y visible en la bandeja administrativa, y el sistema registra el fallo del envío

#### Scenario: Adjunto de receta mencionado sin exponerlo (actualización aprobada durante la implementación)
- **WHEN** se crea una solicitud de cotización con un archivo de receta adjunto
- **THEN** el correo de notificación al negocio indica que existe una receta adjunta disponible en el panel de administración, sin incluir el archivo, su `storageKey` ni ninguna URL hacia el bucket privado

#### Scenario: Sin adjunto, sin mención
- **WHEN** se crea una solicitud de cotización sin ningún archivo de receta adjunto
- **THEN** el correo de notificación al negocio no incluye ninguna mención de adjunto
