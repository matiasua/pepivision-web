// Static placeholder business info, matching design-reference/'s
// CONFIG_DEFAULT. `business-settings` (Fase 5) will replace this with a
// real BusinessSettings row from the database — until then, every public
// page that needs contact info reads it from here instead of the DB.
export const siteConfig = {
  waPhone: '56936992313',
  phoneDisplay: '+56 9 3699 2313',
  email: 'pepivision360@gmail.com',
  instagram: 'pepivision360',
  horario: 'Lunes a sábado de 10:00 a 18:00 hrs',
  ubicacion: 'Quilicura, Región Metropolitana',
} as const;

export const instagramUrl = `https://instagram.com/${siteConfig.instagram}`;
