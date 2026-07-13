// One-off provisioning command: creates the first SUPERADMIN in a fresh
// environment. Run with `docker compose exec web npm run
// admin:create-superadmin` — never invoked over HTTP, never hardcodes
// credentials (unlike the mockup's admin/pepi360).
import { z } from 'zod';
import { createSuperadmin } from '@/modules/auth/service';
import { prisma } from '@/lib/prisma';

const inputSchema = z.object({
  email: z.string().trim().toLowerCase().email('SUPERADMIN_EMAIL no tiene un formato de correo válido.'),
  name: z.string().trim().min(2, 'SUPERADMIN_NAME debe tener al menos 2 caracteres.'),
  password: z.string().min(10, 'SUPERADMIN_PASSWORD debe tener al menos 10 caracteres.'),
});

async function main() {
  const parsed = inputSchema.safeParse({
    email: process.env.SUPERADMIN_EMAIL,
    name: process.env.SUPERADMIN_NAME,
    password: process.env.SUPERADMIN_PASSWORD,
  });

  if (!parsed.success) {
    console.error('No se pudo crear el SUPERADMIN. Define estas variables de entorno y vuelve a intentar:');
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.message}`);
    }
    console.error(
      '\nEjemplo: SUPERADMIN_EMAIL=admin@pepivision360.cl SUPERADMIN_NAME="Nombre Apellido" SUPERADMIN_PASSWORD="una-contraseña-larga" docker compose exec web npm run admin:create-superadmin'
    );
    process.exitCode = 1;
    return;
  }

  const user = await createSuperadmin(parsed.data);
  console.log(`SUPERADMIN creado: ${user.email} (id ${user.id}). Ya puede iniciar sesión en /admin.`);
}

main()
  .catch((error) => {
    // Only the error message (never raw credentials) — createSuperadmin
    // throws a controlled ValidationError when the email already exists.
    console.error(error instanceof Error ? error.message : 'Error inesperado al crear el SUPERADMIN.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
