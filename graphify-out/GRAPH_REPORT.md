# Graph Report - .  (2026-07-16)

## Corpus Check
- 356 files · ~481,482 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1537 nodes · 3502 edges · 106 communities (66 shown, 40 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 43 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- E2E Test Fixtures & Setup
- Admin Login & Auth Pages
- Admin Request Actions (ARCO/Delete)
- Email Template Rendering Helpers
- Design-Tool Preview Runtime (support.js)
- V1 Data Model: Admin/Business/Legal
- Admin Home-Visit Coverage Management
- UI Component Library & SDK Deps
- V2 Redesign Specs: Offerings/Filters/Quote
- V1 Capability Specs Overview
- Design-Tool Image Slot Component
- OpenSpec Workflow Commands & CLAUDE.md
- Admin Product/Offering Actions
- Request Attachments & WhatsApp/Email Utils
- TypeScript Compiler Config Includes
- Home Page Brand Carousel
- E2E/A11y Spec Suite
- Admin Edit/New Product Pages
- Admin Category Attribute Actions
- Admin Products List & Catalog Filters UI
- Offering Repository (Data Access)
- Admin Category Attributes Manager UI
- Lens Types Comparison Page
- ARCO Data Rights Form & Honeypot
- Category Repository (Data Access)
- Home-Visit Request Schemas
- Admin Zod Schemas & Helpers
- Public Quote/Home-Visit Submit Actions
- Offering Detail Page & Service
- Contact Page & Site Header/Footer
- package.json Scripts
- Category Catalog Listing Page
- package.json Dev Dependencies
- Cotizador (Quote Wizard) Page
- Admin New/List Category Pages
- Admin Product Image/Delete Actions
- Catalog Offering Detail Route & Gallery Lightbox
- Not-Found Page & Button Component
- Root Layout, Global Error & Cookie Banner
- Category Service Unit Tests
- Category Attribute Repository (Data Access)
- Admin Edit Category Page
- Offering Service Unit Tests
- App Error Types
- FAQ Page & Accordion
- Public Offering/Product Gallery Components
- Mail Transport Client
- Catalog Admin Service Unit Tests
- About Us Page (Nosotros)
- Privacy & Terms Legal Pages
- Category Attribute Service Unit Tests
- Auth Authorization Integration Tests
- Catalog Filters Schema
- Attachment File Schemas
- package.json Metadata
- Admin Categories Actions Integration Tests
- Offering Configuration Schema
- Lighthouse CI Runner Script
- Next.js Config & CSP Tests
- Last-Superadmin Guard Integration Tests
- Auth Login Rate-Limit Integration Tests
- Audit Log Repository Unit Tests
- Admin Auth Integration Tests
- eslint dependency
- ESLint Flat Config
- jsdom dependency
- @lhci/cli dependency
- @playwright/test dependency
- tailwindcss dependency
- @tailwindcss/postcss dependency
- @testing-library/dom dependency
- @types/node dependency
- @types/nodemailer dependency
- typescript dependency
- Playwright Config
- PostCSS Config
- Brand Logo: Design-Reference Asset
- Mockup Screenshot: Catálogo de Armazones
- Mockup UI: Product Color Swatches
- Brand Logo: Transparent Principal Asset
- DataRightsRequest Entity
- EnabledComuna Entity
- Brand Logo: Production Asset
- Brand Logo: Angelo Falconi
- Brand Logo: Eye Shield
- Brand Logo: Eye Tech
- Brand Logo: Foose
- Brand Logo: Game Day
- Brand Logo: Gattizoni
- Brand Logo: George Eyewear
- Brand Logo: Ice Look
- Brand Logo: Jean de Paris
- Brand Logo: Jorgio Occhiali
- Brand Logo: Lacrosse
- Brand Logo: Le Giro
- Brand Logo: Linea Vigo
- Brand Logo: Luxor
- Brand Logo: Maxcome
- Brand Logo: Moodkids
- Brand Logo: Polo
- Brand Logo: Silmo
- Brand Logo: Vespa

## God Nodes (most connected - your core abstractions)
1. `requireSession()` - 47 edges
2. `recordAudit()` - 37 edges
3. `toErrorResponse()` - 30 edges
4. `ImageSlot` - 27 edges
5. `design.md — technical design for Pepi Visión 360 v1 (local Docker Compose scope)` - 26 edges
6. `react` - 24 edges
7. `tasks.md (redesign-extensible-catalog-v2)` - 22 edges
8. `ValidationError` - 21 edges
9. `escapeHtml()` - 21 edges
10. `scripts` - 19 edges

## Surprising Connections (you probably didn't know these)
- `NewCategoryPage()` --calls--> `requireSession()`  [EXTRACTED]
  app/admin/categories/new/page.tsx → modules/auth/service.ts
- `CI GitHub Actions pipeline` --references--> `add-pepi-vision-360-v1 (archived change, 100/100 tasks)`  [INFERRED]
  .github/workflows/ci.yml → README.md
- `components/ README` --conceptually_related_to--> `CLAUDE.md project guidance`  [INFERRED]
  components/README.md → CLAUDE.md
- `loginAction()` --calls--> `getClientIp()`  [EXTRACTED]
  app/admin/actions.ts → lib/request-ip.ts
- `EditCategoryPage()` --calls--> `requireSession()`  [EXTRACTED]
  app/admin/categories/[id]/edit/page.tsx → modules/auth/service.ts

## Import Cycles
- 3-file cycle: `app/admin/products/actions.ts -> components/admin/ProductForm.tsx -> components/admin/ProductGalleryManager.tsx -> app/admin/products/actions.ts`
- 3-file cycle: `app/admin/products/actions.ts -> components/admin/ProductForm.tsx -> components/admin/ProductOfferingsManager.tsx -> app/admin/products/actions.ts`

## Hyperedges (group relationships)
- **OPSX workflow: slash-commands paired with their skills** — claude_commands_opsx_apply_command, claude_commands_opsx_archive_command, claude_commands_opsx_explore_command, claude_commands_opsx_propose_command, claude_commands_opsx_sync_command, claude_commands_opsx_update_command, claude_skills_openspec_apply_change_skill_doc, claude_skills_openspec_archive_change_skill_doc, claude_skills_openspec_explore_skill_doc, claude_skills_openspec_propose_skill_doc, claude_skills_openspec_sync_specs_skill_doc, claude_skills_openspec_update_change_skill_doc [EXTRACTED 0.95]
- **Docker Compose service startup/dependency chain** — compose_postgres_service, compose_migrate_service, compose_dbinit_service, compose_minio_service, compose_minioinit_service, compose_mailpit_service, compose_web_service, compose_nginx_service [EXTRACTED 1.00]
- **Docs jointly defining the reproducible local Docker dev environment** — readme_devguide, github_workflows_ci_pipeline, compose_config [INFERRED 0.85]
- **Three file variants of the same Pepi Visión 360 mockup** — design_reference__pepi_standalone_src_doc, design_reference_pepi_vision_360_dc_doc, design_reference_pepi_vision_360_standalone_doc [EXTRACTED 1.00]
- **modules/* directories forming the modular-monolith architecture of Pepi Visión 360** — modules_catalog_readme_doc, modules_requests_readme_doc, modules_data_rights_readme_doc, modules_home_visit_coverage_readme_doc, modules_business_settings_readme_doc, modules_auth_readme_doc, modules_notifications_readme_doc, modules_storage_readme_doc [EXTRACTED 1.00]
- **docs/* analysis documents that cross-reference each other to describe design-reference/** — docs_component_inventory_doc, docs_design_analysis_doc, docs_functional_gaps_doc, docs_page_inventory_doc [EXTRACTED 1.00]
- **Admin authentication, roles, and audit logging flow** — openspec_changes_archive_2026_07_14_add_pepi_vision_360_v1_specs_admin_auth_spec_adminuser, openspec_changes_archive_2026_07_14_add_pepi_vision_360_v1_specs_admin_auth_spec_session, openspec_changes_archive_2026_07_14_add_pepi_vision_360_v1_specs_admin_auth_spec_auditlogentry, openspec_changes_archive_2026_07_14_add_pepi_vision_360_v1_specs_data_rights_requests_spec, openspec_changes_archive_2026_07_14_add_pepi_vision_360_v1_specs_product_management_spec, openspec_changes_archive_2026_07_14_add_pepi_vision_360_v1_specs_request_inbox_spec [INFERRED 0.85]
- **Extensible category/offering/attribute data model** — openspec_changes_redesign_extensible_catalog_v2_design_category, openspec_changes_redesign_extensible_catalog_v2_design_productoffering, openspec_changes_redesign_extensible_catalog_v2_design_categoryattributedefinition, openspec_changes_redesign_extensible_catalog_v2_design_productofferingattributevalue [EXTRACTED 1.00]
- **Commercial request lifecycle governed by configurable retention** — openspec_changes_archive_2026_07_14_add_pepi_vision_360_v1_specs_quote_requests_spec_request, openspec_changes_archive_2026_07_14_add_pepi_vision_360_v1_specs_home_visit_requests_spec, openspec_changes_archive_2026_07_14_add_pepi_vision_360_v1_specs_request_inbox_spec, openspec_changes_archive_2026_07_14_add_pepi_vision_360_v1_specs_business_settings_spec_businesssettings [INFERRED 0.85]
- **redesign-extensible-catalog-v2 change proposal artifacts** — openspec_changes_redesign_extensible_catalog_v2_specs_catalog_seo_spec, openspec_changes_redesign_extensible_catalog_v2_specs_configurable_quote_flow_spec, openspec_changes_redesign_extensible_catalog_v2_specs_dynamic_catalog_filters_spec, openspec_changes_redesign_extensible_catalog_v2_specs_product_offerings_spec, openspec_changes_redesign_extensible_catalog_v2_specs_request_category_snapshot_spec, openspec_changes_redesign_extensible_catalog_v2_tasks [EXTRACTED 1.00]
- **Shared requirement: every admin action logged to audit log** — openspec_specs_admin_auth_spec, openspec_specs_product_management_spec, openspec_specs_data_rights_requests_spec, openspec_specs_home_visit_coverage_spec [INFERRED 0.85]
- **Quote request lifecycle: category-aware wizard -> snapshot -> admin inbox** — openspec_specs_quote_requests_spec, openspec_changes_redesign_extensible_catalog_v2_specs_configurable_quote_flow_spec, openspec_changes_redesign_extensible_catalog_v2_specs_request_category_snapshot_spec, openspec_specs_request_inbox_spec [INFERRED 0.80]

## Communities (106 total, 40 thin omitted)

### Community 0 - "E2E Test Fixtures & Setup"
Cohesion: 0.05
Nodes (76): createCatalogFixture(), FIXTURES_PATH, globalSetup(), randomPassword(), reconcileExistingCatalogFixture(), tag(), FIXTURES_PATH, globalTeardown() (+68 more)

### Community 1 - "Admin Login & Auth Pages"
Cohesion: 0.05
Nodes (66): loginAction(), LoginActionState, AdminPage(), metadata, ActionResult, createUserAction(), resetPasswordAction(), toggleUserActiveAction() (+58 more)

### Community 2 - "Admin Request Actions (ARCO/Delete)"
Cohesion: 0.06
Nodes (55): AttachmentDownloadUrlResult, changeArcoStatusAction(), ChangeArcoStatusResult, deleteRequestAction(), getAttachmentDownloadUrlAction(), toggleRequestStatusAction(), AdminRequestsPage(), metadata (+47 more)

### Community 3 - "Email Template Rendering Helpers"
Cohesion: 0.13
Nodes (42): BADGE_TONE_STYLES, BUTTON_TONE_STYLES, escapeHtml(), escapeHtmlMultiline(), HTML_ESCAPE_MAP, renderButton(), renderDataRow(), renderInfoCard() (+34 more)

### Community 4 - "Design-Tool Preview Runtime (support.js)"
Cohesion: 0.07
Nodes (46): boot(), cdnScriptFor(), collectProps(), compileAttr(), compileTemplate(), contentKey(), createComponentFactory(), createExternalModules() (+38 more)

### Community 5 - "V1 Data Model: Admin/Business/Legal"
Cohesion: 0.08
Nodes (54): admin-auth capability, AdminUser entity, AuditLogEntry entity (append-only audit log), Brand entity (Prisma model), business-settings capability, BusinessSettings entity (singleton row), Design decision: data minimization for ARCO requests (no RUT, no attachments), data-rights-requests capability (+46 more)

### Community 6 - "Admin Home-Visit Coverage Management"
Cohesion: 0.08
Nodes (32): createComunaAction(), CreateComunaResult, toggleComunaAction(), AdminHomeVisitsPage(), metadata, Dashboard(), updateBusinessSettingsAction(), UpdateSettingsResult (+24 more)

### Community 7 - "UI Component Library & SDK Deps"
Cohesion: 0.07
Nodes (42): @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, bcryptjs, Accordion(), Badge(), Button(), Card(), IconCircle() (+34 more)

### Community 8 - "V2 Redesign Specs: Offerings/Filters/Quote"
Cohesion: 0.12
Nodes (43): e2e/admin/auth.spec.ts (full-stack auth e2e test, referenced not read), modules/auth/session.ts (cookies()-based session module, referenced not read), add-pepi-vision-360-v1 (prior OpenSpec change, precondition), catalog-seo spec (redesign-extensible-catalog-v2), configurable-quote-flow spec (redesign-extensible-catalog-v2), dynamic-catalog-filters spec (redesign-extensible-catalog-v2), CategoryAttributeDefinition (entity), ProductOfferingAttributeValue (entity) (+35 more)

### Community 9 - "V1 Capability Specs Overview"
Cohesion: 0.09
Nodes (37): admin-auth capability spec (v1), AdminUser model (SUPERADMIN/ADMIN roles), AuditLogEntry (insert-only audit log), Session (persisted, invalidable, server-side), business-settings capability spec (v1), BusinessSettings model (contact data + retention periods), data-rights-requests capability spec (v1, ARCO), home-visit-coverage capability spec (v1) (+29 more)

### Community 10 - "Design-Tool Image Slot Component"
Cohesion: 0.14
Nodes (7): flushNow(), getSlot(), ImageSlot, load(), save(), setSlot(), toDataUrl()

### Community 11 - "OpenSpec Workflow Commands & CLAUDE.md"
Cohesion: 0.10
Nodes (33): OPSX: Apply command, OPSX: Archive command, OPSX: Explore command, OPSX: Propose command, OPSX: Sync command, OPSX: Update command, CLAUDE.md project guidance, Target architecture (Next.js/Postgres/Prisma/Nginx/Docker Compose/Lightsail) (+25 more)

### Community 12 - "Admin Product/Offering Actions"
Cohesion: 0.15
Nodes (28): AddColorActionResult, addProductColorAction(), changeProductImageColorAction(), createOfferingAction(), createProductAction(), deleteProductImageAction(), ImageActionResult, OfferingActionResult (+20 more)

### Community 13 - "Request Attachments & WhatsApp/Email Utils"
Cohesion: 0.14
Nodes (23): IMAGE_ATTACHMENT_TYPES, PDF_MAGIC, sanitizeAttachmentFileName(), verifyAttachmentContent(), buildWhatsAppLink(), getEffectiveBusinessSettings(), sendAndLog(), createRequest() (+15 more)

### Community 14 - "TypeScript Compiler Config Includes"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 15 - "Home Page Brand Carousel"
Cohesion: 0.11
Nodes (21): Home(), BrandCarousel(), ALLOWED_EXTENSIONS, ALT_TEXT_OVERRIDES, BrandLogo, BRANDS_DIR, getBrandLogos(), toAltText() (+13 more)

### Community 16 - "E2E/A11y Spec Suite"
Cohesion: 0.15
Nodes (15): STATIC_PAGES, expectNoSeriousA11yViolations(), tinyPdfBuffer(), tinyPngBuffer(), tinySolidPngBuffer(), loginAsAdmin(), logout(), E2eFixtures (+7 more)

### Community 17 - "Admin Edit/New Product Pages"
Cohesion: 0.11
Nodes (20): OfferingView, ProductColorView, EditProductPage(), metadata, metadata, NewProductPage(), BrandOption, BrandSelect() (+12 more)

### Community 18 - "Admin Category Attribute Actions"
Cohesion: 0.11
Nodes (22): AttributeActionResult, createCategoryAttributeAction(), deleteCategoryAction(), DeleteCategoryActionResult, reorderCategoriesAction(), SaveActionResult, setCategoryActiveAction(), SimpleActionResult (+14 more)

### Community 19 - "Admin Products List & Catalog Filters UI"
Cohesion: 0.14
Nodes (19): AdminProductsPage(), metadata, CatalogFilters(), chipClass(), COLOR_SWATCHES, GENDER_OPTIONS, MATERIAL_OPTIONS, SHAPE_OPTIONS (+11 more)

### Community 20 - "Offering Repository (Data Access)"
Cohesion: 0.16
Nodes (23): buildPublicOfferingWhere(), createOfferingRow(), findOfferingById(), findOfferingByProductAndCategory(), findOfferingBySlugInCategoryAny(), IMAGES_ORDERED, listPublicOfferingsForCategory(), listPublicOfferingsForCategoryFiltered() (+15 more)

### Community 21 - "Admin Category Attributes Manager UI"
Cohesion: 0.14
Nodes (19): CategoryAttributeView, deleteCategoryAttributeAction(), CategoryAttributesManager(), EMPTY_NEW_ATTRIBUTE, NEEDS_OPTIONS, TYPE_LABELS, CAPABILITY_LABELS, CategoryCapabilitiesValues (+11 more)

### Community 22 - "Lens Types Comparison Page"
Cohesion: 0.14
Nodes (14): comparisonRows, glassTypes, metadata, treatments, metadata, rights, metadata, steps (+6 more)

### Community 23 - "ARCO Data Rights Form & Honeypot"
Cohesion: 0.16
Nodes (14): DataRightsActionState, submitDataRightsAction(), RIGHT_OPTIONS, honeypotSchema, isHoneypotTriggered(), computeRetentionExpiresAt(), createDataRightsRequest(), CreateDataRightsRequestInput (+6 more)

### Community 24 - "Category Repository (Data Access)"
Cohesion: 0.18
Nodes (21): CategoryRowInput, countCategoryOfferings(), createCategoryRow(), deleteCategoryRow(), findCategoryById(), findCategoryBySlugAny(), listActiveCategoriesForAdmin(), listActiveVisibleCategories() (+13 more)

### Community 25 - "Home-Visit Request Schemas"
Cohesion: 0.09
Nodes (19): consentSchema, GLASS_TYPES, HomeVisitRequestInput, homeVisitRequestSchema, nameSchema, optionalEmailSchema, phoneSchema, QuoteRequestInput (+11 more)

### Community 26 - "Admin Zod Schemas & Helpers"
Cohesion: 0.12
Nodes (17): optionalNonEmpty(), addProductColorSchema, changeProductImageColorSchema, deleteProductSchema, hexColorSchema, productColorSchema, ProductFormInput, productFormSchema (+9 more)

### Community 27 - "Public Quote/Home-Visit Submit Actions"
Cohesion: 0.18
Nodes (10): QuoteActionState, submitQuoteAction(), submitHomeVisitAction(), logoutAction(), LogFields, logger, LogLevel, checkPublicFormRateLimit() (+2 more)

### Community 28 - "Offering Detail Page & Service"
Cohesion: 0.16
Nodes (19): generateMetadata(), OfertaPage(), offeringCtaLabel(), findPublicOfferingByCategoryAndSlug(), listOtherPublicOfferingsForProduct(), listRelatedPublicOfferings(), BrandFilterOption, buildGalleryImages() (+11 more)

### Community 29 - "Contact Page & Site Header/Footer"
Cohesion: 0.20
Nodes (10): metadata, Header(), isActive(), InstagramIcon(), MenuIcon(), WhatsAppIcon(), WhatsAppFloatButton(), navItems (+2 more)

### Community 30 - "package.json Scripts"
Cohesion: 0.11
Nodes (19): scripts, admin:create-superadmin, build, ci, dev, lint, migrate, postinstall (+11 more)

### Community 31 - "Category Catalog Listing Page"
Cohesion: 0.18
Nodes (14): CatalogResults(), CategoriaPage(), generateMetadata(), Params, SearchParams, CatalogEmptyState(), OfferingCard(), findActiveVisibleCategoryBySlug() (+6 more)

### Community 32 - "package.json Dev Dependencies"
Cohesion: 0.12
Nodes (17): @axe-core/playwright, eslint-config-next, devDependencies, @axe-core/playwright, eslint-config-next, prisma, @testing-library/react, tsx (+9 more)

### Community 33 - "Cotizador (Quote Wizard) Page"
Cohesion: 0.16
Nodes (13): CotizadorPage(), metadata, ATTACHMENT_ACCEPT, choiceClass(), formatFileSize(), FrameOption, GLASS_DESCRIPTIONS, PRESCRIPTION_DESCRIPTIONS (+5 more)

### Community 34 - "Admin New/List Category Pages"
Cohesion: 0.17
Nodes (11): createCategoryAction(), metadata, NewCategoryPage(), AdminCategoriesPage(), metadata, AdminNav(), NAV_ITEMS, AdminShell() (+3 more)

### Community 35 - "Admin Product Image/Delete Actions"
Cohesion: 0.18
Nodes (9): deleteProductAction(), ProductImageView, ConfirmDeleteButton(), ACCEPT_ATTR, bySortOrder(), ColorOption, PendingUpload, ProductGalleryManager() (+1 more)

### Community 36 - "Catalog Offering Detail Route & Gallery Lightbox"
Cohesion: 0.20
Nodes (10): Params, CatalogoPage(), metadata, GalleryLightbox(), LightboxImage, OtherCategoryOfferings(), ChevronRightIcon(), CloseIcon() (+2 more)

### Community 37 - "Not-Found Page & Button Component"
Cohesion: 0.17
Nodes (11): HomeVisitActionState, Button(), classesFor(), LinkButton(), Size, sizes, Variant, variants (+3 more)

### Community 38 - "Root Layout, Global Error & Cookie Banner"
Cohesion: 0.21
Nodes (8): metadata, CookieBanner(), getServerSnapshot(), getSnapshot(), subscribe(), Footer(), inter, poppins

### Community 39 - "Category Service Unit Tests"
Cohesion: 0.13
Nodes (13): actor, countCategoryOfferings, createCategoryRow, deleteCategoryRow, findCategoryById, findCategoryBySlugAny, listCategoriesForAdmin, recordAudit (+5 more)

### Community 40 - "Category Attribute Repository (Data Access)"
Cohesion: 0.33
Nodes (12): AttributeRowInput, createAttributeRow(), deleteAttributeRow(), findAttributeByCategoryAndKey(), findAttributeById(), listAttributesForCategory(), updateAttributeRow(), auditAttributes() (+4 more)

### Community 41 - "Admin Edit Category Page"
Cohesion: 0.24
Nodes (10): updateCategoryAction(), EditCategoryPage(), metadata, listAttributes(), categoryCapabilitiesSchema, FAIL_CLOSED_CAPABILITIES, parseCategoryCapabilities(), validateCategoryCapabilities() (+2 more)

### Community 42 - "Offering Service Unit Tests"
Cohesion: 0.15
Nodes (11): actor, createOfferingRow, findCategoryById, findOfferingById, findOfferingByProductAndCategory, findOfferingBySlugInCategoryAny, findProductById, recordAudit (+3 more)

### Community 43 - "App Error Types"
Cohesion: 0.27
Nodes (5): AppError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError

### Community 44 - "FAQ Page & Accordion"
Cohesion: 0.24
Nodes (6): faqs, metadata, FaqAccordion(), ChevronDownIcon(), SectionHeading(), items

### Community 45 - "Public Offering/Product Gallery Components"
Cohesion: 0.25
Nodes (7): ImagePlaceholder(), ProductGallery(), RelatedProducts(), RFC-1918, GalleryImageView, OfferingCardView, OfferingDetailView

### Community 46 - "Mail Transport Client"
Cohesion: 0.24
Nodes (8): RFC-3834, buildDkimConfig(), createTransport(), globalForMail, MailTransport, SendEmailInput, emailLogCreate, sendMail

### Community 47 - "Catalog Admin Service Unit Tests"
Cohesion: 0.18
Nodes (9): CurrentSession, actor, countProductImagesByColorId, createProductColorRow, deleteProductColorRow, findProductById, findProductColorById, reassignAndDeleteColor (+1 more)

### Community 48 - "About Us Page (Nosotros)"
Cohesion: 0.24
Nodes (6): metadata, values, benefits, metadata, quoteSteps, Eyebrow()

### Community 49 - "Privacy & Terms Legal Pages"
Cohesion: 0.31
Nodes (4): metadata, metadata, LegalDocument(), LegalDraftNotice()

### Community 50 - "Category Attribute Service Unit Tests"
Cohesion: 0.20
Nodes (8): actor, createAttributeRow, deleteAttributeRow, findAttributeByCategoryAndKey, findAttributeById, findCategoryById, recordAudit, updateAttributeRow

### Community 51 - "Auth Authorization Integration Tests"
Cohesion: 0.22
Nodes (6): activeAdmin, createAuditLogEntry, findSessionByTokenHash, inactiveAdmin, readSessionCookie, RedirectSignal

### Community 52 - "Catalog Filters Schema"
Cohesion: 0.29
Nodes (7): CatalogFilters, catalogFiltersSchema, firstValue(), parseCatalogFilters(), PriceBucket, priceBucketSchema, SearchParamsInput

### Community 53 - "Attachment File Schemas"
Cohesion: 0.32
Nodes (6): ALLOWED_ATTACHMENT_MIME_TYPES, ALLOWED_IMAGE_MIME_TYPES, AttachmentFileMeta, attachmentFileMetaSchema, ImageFileMeta, imageFileMetaSchema

### Community 54 - "package.json Metadata"
Cohesion: 0.25
Nodes (7): name, overrides, postcss, prisma, seed, private, version

### Community 55 - "Admin Categories Actions Integration Tests"
Cohesion: 0.25
Nodes (7): ADMIN_SESSION, recordAudit, requireRole, requireSession, SUPERADMIN_SESSION, validCategoryInput, validOfferingInput

### Community 56 - "Offering Configuration Schema"
Cohesion: 0.38
Nodes (5): OfferingConfiguration, offeringConfigurationSchema, offeringConfigurationV1Schema, parseOfferingConfiguration(), validateOfferingConfiguration()

### Community 57 - "Lighthouse CI Runner Script"
Cohesion: 0.29
Nodes (5): autorunStatus, childEnv, executablePath, healthcheckStatus, lhciBin

### Community 58 - "Next.js Config & CSP Tests"
Cohesion: 0.40
Nodes (3): nextConfig, loadCsp(), loadHeaders()

### Community 59 - "Last-Superadmin Guard Integration Tests"
Cohesion: 0.33
Nodes (5): actor, countActiveSuperadmins, createAuditLogEntry, findAdminById, updateAdminUser

### Community 60 - "Auth Login Rate-Limit Integration Tests"
Cohesion: 0.33
Nodes (5): admin, createAuditLogEntry, createSession, findAdminByIdentifier, verifyPassword

### Community 61 - "Audit Log Repository Unit Tests"
Cohesion: 0.50
Nodes (3): auditLogEntryCreate, entry, loggerError

## Knowledge Gaps
- **428 isolated node(s):** `LoginActionState`, `metadata`, `SaveActionResult`, `SimpleActionResult`, `DeleteCategoryActionResult` (+423 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **40 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ValidationError` connect `App Error Types` to `E2E Test Fixtures & Setup`, `Admin Login & Auth Pages`, `Admin Request Actions (ARCO/Delete)`, `Admin Home-Visit Coverage Management`, `Category Service Unit Tests`, `Category Attribute Repository (Data Access)`, `Admin Edit Category Page`, `Offering Service Unit Tests`, `Request Attachments & WhatsApp/Email Utils`, `Catalog Admin Service Unit Tests`, `Category Attribute Service Unit Tests`, `Offering Repository (Data Access)`, `Category Repository (Data Access)`, `Home-Visit Request Schemas`, `Offering Configuration Schema`, `Last-Superadmin Guard Integration Tests`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `Container()` connect `Lens Types Comparison Page` to `Cotizador (Quote Wizard) Page`, `Admin New/List Category Pages`, `Catalog Offering Detail Route & Gallery Lightbox`, `Not-Found Page & Button Component`, `FAQ Page & Accordion`, `About Us Page (Nosotros)`, `Privacy & Terms Legal Pages`, `Contact Page & Site Header/Footer`, `Category Catalog Listing Page`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `requireSession()` connect `Admin Product/Offering Actions` to `Admin Login & Auth Pages`, `Admin New/List Category Pages`, `Admin Product Image/Delete Actions`, `Admin Request Actions (ARCO/Delete)`, `Admin Home-Visit Coverage Management`, `Admin Edit Category Page`, `Admin Edit/New Product Pages`, `Admin Products List & Catalog Filters UI`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `LoginActionState`, `metadata`, `SaveActionResult` to the rest of the system?**
  _428 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `E2E Test Fixtures & Setup` be split into smaller, more focused modules?**
  _Cohesion score 0.05273177232057872 - nodes in this community are weakly interconnected._
- **Should `Admin Login & Auth Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.05393000573723465 - nodes in this community are weakly interconnected._
- **Should `Admin Request Actions (ARCO/Delete)` be split into smaller, more focused modules?**
  _Cohesion score 0.056692242114237 - nodes in this community are weakly interconnected._