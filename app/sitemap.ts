import type { MetadataRoute } from 'next';
import { getCategoryPicker, getPublicOfferingsForSitemap } from '@/modules/catalog/service';
import { buildCategoryCanonicalUrl, buildOfferingCanonicalUrl } from '@/modules/catalog/seo';

/**
 * Fase 14 (SEO): una entrada por `Category` activa/visible y una por
 * `ProductOffering` activa/visible (con su `Product`/`Category` también
 * activos/visibles) — nunca slugs legados (`armazones`,
 * `lentes-de-sol-opticos`, que solo redirigen 308), nunca rutas admin/API,
 * nunca URLs con query params de filtros. Un mismo `Product` en las dos
 * categorías produce dos entradas distintas, una por cada
 * `ProductOffering` real — nunca una tercera entrada "de producto" sin
 * contexto de categoría. Ver specs/catalog-seo/spec.md.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, offerings] = await Promise.all([getCategoryPicker(), getPublicOfferingsForSitemap()]);

  const categoryEntries: MetadataRoute.Sitemap = categories.map((category) => ({
    url: buildCategoryCanonicalUrl(category.slug),
    lastModified: category.updatedAt,
  }));

  const offeringEntries: MetadataRoute.Sitemap = offerings.map((offering) => ({
    url: buildOfferingCanonicalUrl(offering.categorySlug, offering.offeringSlug),
    lastModified: offering.updatedAt,
  }));

  return [...categoryEntries, ...offeringEntries];
}
