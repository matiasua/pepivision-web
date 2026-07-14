// One-off provisioning command: creates (or, idempotently, resets the
// password of) an admin account in a fresh or existing environment. Run
// with `docker compose exec web npm run admin:create-superadmin` — never
// invoked over HTTP, never hardcodes credentials (unlike the mockup's
// admin/pepi360). Defaults to SUPERADMIN; set ADMIN_ROLE=ADMIN to
// provision an operational (non-superadmin) account instead.
import { z } from 'zod';
import { AdminRole } from '@prisma/client';
import { provisionDevAdminUser } from '@/modules/auth/service';
import { usernameSchema } from '@/modules/auth/schemas';
import { prisma } from '@/lib/prisma';

const inputSchema = z.object({
  email: z.string().trim().toLowerCase().email('SUPERADMIN_EMAIL no tiene un formato de correo válido.'),
  username: usernameSchema,
  name: z.string().trim().min(2, 'SUPERADMIN_NAME debe tener al menos 2 caracteres.'),
  password: z.string().min(10, 'SUPERADMIN_PASSWORD debe tener al menos 10 caracteres.'),
  role: z.enum(AdminRole).default(AdminRole.SUPERADMIN),
});

async function main() {
  const parsed = inputSchema.safeParse({
    email: process.env.SUPERADMIN_EMAIL,
    username: process.env.SUPERADMIN_USERNAME,
    name: process.env.SUPERADMIN_NAME,
    password: process.env.SUPERADMIN_PASSWORD,
    role: process.env.ADMIN_ROLE || undefined,
  });

  if (!parsed.success) {
    console.error('No se pudo aprovisionar el usuario. Define estas variables de entorno y vuelve a intentar:');
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.message}`);
    }
    console.error(
      '\nEjemplo: SUPERADMIN_EMAIL=admin@pepivision360.cl SUPERADMIN_USERNAME=admin SUPERADMIN_NAME="Nombre Apellido" SUPERADMIN_PASSWORD="una-contraseña-larga" [ADMIN_ROLE=ADMIN] docker compose exec web npm run admin:create-superadmin'
    );
    process.exitCode = 1;
    return;
  }

  const user = await provisionDevAdminUser(parsed.data);
  console.log(
    `Usuario ${parsed.data.role} listo: ${user.email} / @${user.username} (id ${user.id}). Ya puede iniciar sesión en /admin.`
  );
}

main()
  .catch((error) => {
    // Only the error message (never raw credentials).
    console.error(error instanceof Error ? error.message : 'Error inesperado al aprovisionar el usuario.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
