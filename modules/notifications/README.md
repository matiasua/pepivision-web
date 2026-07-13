# modules/notifications

Abstracción de correo (`SMTP_*`), independiente del proveedor: en
desarrollo apunta a Mailpit (ver Fase 1); en producción, a lo que se
configure cuando exista esa infraestructura. Se implementa en la Fase 5
(Formularios y solicitudes), donde se disparan las primeras notificaciones
reales (confirmación de cotización/domicilio, aviso de solicitud ARCO).
