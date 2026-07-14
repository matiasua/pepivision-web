import Image from 'next/image';
import Link from 'next/link';
import { navItems } from '@/lib/nav-items';
import { siteConfig, instagramUrl } from '@/lib/site-config';
import { defaultWhatsAppHref } from '@/lib/whatsapp';
import { WhatsAppIcon, InstagramIcon } from '@/components/icons';

export function Footer() {
  return (
    <footer className="bg-footer text-[#c7d2ee]">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-9 px-5 py-13 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <div className="inline-block rounded-2xl bg-white p-3">
            <Image src="/brand/pepi-logo.png" alt="Pepi Visión 360" width={160} height={64} className="h-16 w-auto" />
          </div>
          <p className="mt-4 max-w-[280px] text-sm leading-relaxed">
            Óptica virtual en Chile. Armazones modernos, cristales personalizados y atención cercana, sin
            salir de casa.
          </p>
          <div className="mt-4.5 flex gap-2.5">
            <a
              href={defaultWhatsAppHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-white/10 transition-colors hover:bg-whatsapp"
            >
              <WhatsAppIcon className="h-5 w-5 text-white" />
            </a>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-white/10 transition-colors hover:bg-fucsia"
            >
              <InstagramIcon className="h-5 w-5 text-white" />
            </a>
          </div>
        </div>

        <div>
          <div className="mb-3.5 font-display text-[15px] font-semibold text-white">Navegación</div>
          <div className="flex flex-col gap-2.5 text-sm">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-white">
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3.5 font-display text-[15px] font-semibold text-white">Contacto</div>
          <div className="flex flex-col gap-2.5 text-sm">
            <div>WhatsApp: {siteConfig.phoneDisplay}</div>
            <div>Instagram: @{siteConfig.instagram}</div>
            <div>Correo: {siteConfig.email}</div>
            <div>Horario: {siteConfig.horario}</div>
            <div>Ubicación: {siteConfig.ubicacion}</div>
          </div>
        </div>

        <div>
          <div className="mb-3.5 font-display text-[15px] font-semibold text-white">Información</div>
          <div className="flex flex-col gap-2.5 text-sm">
            <Link href="/privacidad" className="hover:text-white">
              Política de Privacidad
            </Link>
            <Link href="/derechos-arco" className="hover:text-white">
              Tus derechos (ARCO)
            </Link>
            <Link href="/terminos" className="hover:text-white">
              Términos y condiciones
            </Link>
            <Link href="/admin" className="hover:text-white">
              Administración
            </Link>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-[#8493c4]">
            El tratamiento de recetas ópticas y datos personales se realiza de forma confidencial y solo
            para gestionar tu atención y cotización.
          </p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-5 py-5 text-center text-[12.5px] text-[#8493c4]">
          © 2026 Pepi Visión 360 · Ver bien nunca fue tan fácil · Contenido y precios referenciales,
          editables.
        </div>
      </div>
    </footer>
  );
}
