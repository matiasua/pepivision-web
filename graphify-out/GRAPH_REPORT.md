# Graph Report - .  (2026-07-16)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1652 nodes · 3729 edges · 123 communities (80 shown, 43 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 66 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d858ef53`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- redesign-extensible-catalog-v2 design.md
- admin-service.ts
- components.ts
- support.js
- add-admin-brand-management design.md
- design.md — technical design for Pepi Visión 360 v1 (local Docker Compose scope)
- admin-service.ts
- react
- category-service.ts
- actions.ts
- ImageSlot
- compilerOptions
- Container.tsx
- prisma.ts
- service.ts
- schemas.ts
- page.tsx
- icons.tsx
- service.ts
- service.ts
- ProductForm.tsx
- actions.ts
- service.ts
- global-setup.ts
- add-pepi-vision-360-v1 tasks.md (10 implementation phases)
- helpers.ts
- actions.ts
- seed.ts
- offering-service.ts
- CategoryForm.tsx
- service.ts
- HOME_VISIT_ENABLED Flag
- page.tsx
- service.ts
- scripts
- CI GitHub Actions pipeline
- ProductGalleryManager.tsx
- Improve Visual Identity and Content Proposal
- login
- requireSession
- page.tsx
- devDependencies
- category-attribute-service.ts
- category-service.test.ts
- page.tsx
- zod-helpers.ts
- page.tsx
- QuoteWizard.tsx
- Button.tsx
- product-gallery-storage.test.ts
- schemas.ts
- offering-service.test.ts
- page.tsx
- errors.ts
- product-offerings.test.ts
- AdminShell.tsx
- CatalogFilters.tsx
- service.ts
- category-attribute-service.test.ts
- requests-service.test.ts
- page.tsx
- OPSX: Apply command
- CurrentSession
- auth-authorization.test.ts
- attachment-processing.ts
- logout
- schemas.ts
- package.json
- admin-categories-actions.test.ts
- offering-configuration.ts
- run-lighthouse.mjs
- CookieBanner.tsx
- next.config.ts
- auth-last-superadmin.test.ts
- auth-login-rate-limit.test.ts
- page.tsx
- audit-log-repository.test.ts
- auth-admin.test.ts
- @axe-core/playwright
- eslint.config.mjs
- eslint-config-next
- jsdom
- @lhci/cli
- @playwright/test
- prisma
- @tailwindcss/postcss
- @types/nodemailer
- @types/react
- @types/react-dom
- playwright.config.ts
- postcss.config.mjs
- OPSX: Sync command
- openspec-update-change skill
- components/ README
- Pepi Visión 360 circular brand logo: navy-and-fucsia ring, hand-lettered pink 'Pepi' script with navy 'visión' and gradient blue '360' (arrow forming the zero), an eyeglasses-framed eye icon above the wordmark, tagline 'Ver bien nunca fue tan fácil', and a house/heart/delivery-van icon row below signifying home delivery
- Catálogo de Armazones Screenshot
- Product Color Swatches UI (Colores disponibles)
- Pepi Visión 360 Logo (Transparent, Principal)
- DataRightsRequest model (ARCO rights request)
- EnabledComuna model (admin-managed coverage list)
- Pepi Visión 360 Logo (Production Brand Asset)
- Angelo Falconi Brand Logo
- EYE SHIELD (brand logo)
- Eye Tech (brand logo)
- FOOSE Brand Logo
- Game Day (brand logo, styled "Qame City")
- Gattizoni Brand Logo
- George Eyewear (Brand Logo)
- Ice Look (brand logo)
- Jean de Paris (brand logo)
- JORGIO Occhiali (brand logo)
- LACROSSE Brand Logo
- LE GIRO (brand logo)
- Linea Vigo Eyewear (brand logo)
- Luxor Brand Logo
- MAXCOME Brand Logo
- MOODKIDS Brand Logo
- POLO Brand Logo
- SILMO Logo
- VESPA Brand Logo

## God Nodes (most connected - your core abstractions)
1. `requireSession()` - 47 edges
2. `recordAudit()` - 37 edges
3. `toErrorResponse()` - 30 edges
4. `redesign-extensible-catalog-v2 design.md` - 28 edges
5. `ImageSlot` - 27 edges
6. `design.md — technical design for Pepi Visión 360 v1 (local Docker Compose scope)` - 26 edges
7. `react` - 24 edges
8. `ValidationError` - 21 edges
9. `escapeHtml()` - 21 edges
10. `scripts` - 19 edges

## Surprising Connections (you probably didn't know these)
- `home-visit-business-notification.ts (email template)` --conceptually_related_to--> `submitHomeVisit()`  [INFERRED]
  openspec/changes/temporarily-disable-home-visit/design.md → modules/requests/service.ts
- `home-visit-customer-confirmation.ts (email template)` --conceptually_related_to--> `submitHomeVisit()`  [INFERRED]
  openspec/changes/temporarily-disable-home-visit/design.md → modules/requests/service.ts
- `HOME_VISIT_ENABLED Flag` --conceptually_related_to--> `submitHomeVisit()`  [EXTRACTED]
  openspec/changes/temporarily-disable-home-visit/design.md → modules/requests/service.ts
- `NewCategoryPage()` --calls--> `requireSession()`  [EXTRACTED]
  app/admin/categories/new/page.tsx → modules/auth/service.ts
- `CI GitHub Actions pipeline` --references--> `add-pepi-vision-360-v1 (archived change, 100/100 tasks)`  [INFERRED]
  .github/workflows/ci.yml → README.md

## Import Cycles
- 3-file cycle: `app/admin/products/actions.ts -> components/admin/ProductForm.tsx -> components/admin/ProductOfferingsManager.tsx -> app/admin/products/actions.ts`
- 3-file cycle: `app/admin/products/actions.ts -> components/admin/ProductForm.tsx -> components/admin/ProductGalleryManager.tsx -> app/admin/products/actions.ts`

## Hyperedges (group relationships)
- **Brand carousel data-source migration (filesystem scan -> Brand table)** — openspec_changes_add_admin_brand_management_design_brand_model, openspec_changes_add_admin_brand_management_design_getbrandlogos, openspec_changes_add_admin_brand_management_design_brandcarousel, openspec_changes_add_admin_brand_management_design_migration_plan [INFERRED 0.85]
- **Formal quotation issuance and immutability lifecycle** — openspec_changes_add_formal_admin_quotations_design_adminquotation_model, openspec_changes_add_formal_admin_quotations_design_adminquotationlineitem_model, openspec_changes_add_formal_admin_quotations_design_numbering_scheme, openspec_changes_add_formal_admin_quotations_design_immutability_principle, openspec_changes_add_formal_admin_quotations_design_private_storage_service [INFERRED 0.85]
- **Cross-change reuse of existing storage/audit pipelines instead of new abstractions** — openspec_changes_add_admin_brand_management_design_storage_service_public, openspec_changes_add_formal_admin_quotations_design_private_storage_service, openspec_changes_add_formal_admin_quotations_design_recordaudit, claude_md_redesign_extensible_catalog_v2 [INFERRED 0.75]
- **ARCO Customer Confirmation Flow** — modules_notifications_email_templates_data_rights_customer_confirmation, modules_data_rights_service, tests_integration_home_visit_and_arco_test, openspec_changes_improve_transactional_emails_specs_transactional_email_content_assurance_spec [EXTRACTED 1.00]
- **Content-Level Email Test Assurance** — tests_integration_helpers, tests_integration_quote_requests_test, tests_integration_home_visit_and_arco_test, concept_mailpit [EXTRACTED 1.00]
- **Shared Dependency on redesign-extensible-catalog-v2** — openspec_changes_improve_visual_identity_and_content_design, openspec_changes_improve_transactional_emails_design, openspec_changes_redesign_extensible_catalog_v2 [INFERRED 0.85]
- **Delta specs modified by the two-category taxonomy correction** — openspec_changes_redesign_extensible_catalog_v2_specs_catalog_categories_spec, openspec_changes_redesign_extensible_catalog_v2_specs_catalog_navigation_spec, openspec_changes_redesign_extensible_catalog_v2_specs_catalog_administration_spec, openspec_changes_redesign_extensible_catalog_v2_specs_catalog_data_migration_spec, openspec_changes_redesign_extensible_catalog_v2_specs_configurable_quote_flow_spec, openspec_changes_redesign_extensible_catalog_v2_specs_request_category_snapshot_spec, openspec_changes_redesign_extensible_catalog_v2_specs_catalog_seo_spec [EXTRACTED 1.00]
- **Migration flow retiring Armazones and merging Lentes de sol ópticos** — openspec_changes_redesign_extensible_catalog_v2_design_category_data_migration_two_categories, openspec_changes_redesign_extensible_catalog_v2_design_armazones_retirement, openspec_changes_redesign_extensible_catalog_v2_design_lentes_de_sol_merge, openspec_changes_redesign_extensible_catalog_v2_design_legacy_url_redirect_default, openspec_changes_redesign_extensible_catalog_v2_design_category_cta_labels_map [EXTRACTED 0.95]
- **Two-layer compatibility engine: boolean capabilities + quoteOptions allowlist + fixed catalogs** — openspec_changes_redesign_extensible_catalog_v2_design_category_capabilities_schema, openspec_changes_redesign_extensible_catalog_v2_design_quote_options_schema, openspec_changes_redesign_extensible_catalog_v2_design_lens_types_catalog, openspec_changes_redesign_extensible_catalog_v2_design_treatments_catalog, openspec_changes_redesign_extensible_catalog_v2_design_additional_options_catalog [EXTRACTED 1.00]
- **Public touchpoints gated by HOME_VISIT_ENABLED** — home_visit_enabled_flag, app_domicilio_page, lib_nav_items, app_page [EXTRACTED 1.00]
- **Admin/domain touchpoints explicitly preserved (not gated)** — home_visit_enabled_flag, app_admin_home_visits_page, components_admin_adminnav, app_admin_requests, components_admin_requestcard, modules_home_visit_coverage, modules_requests_service_submithomevisit [EXTRACTED 1.00]
- **Docker Compose service startup/dependency chain** — compose_postgres_service, compose_migrate_service, compose_dbinit_service, compose_minio_service, compose_minioinit_service, compose_mailpit_service, compose_web_service, compose_nginx_service [EXTRACTED 1.00]
- **Docs jointly defining the reproducible local Docker dev environment** — readme_devguide, github_workflows_ci_pipeline, compose_config [INFERRED 0.85]
- **Three file variants of the same Pepi Visión 360 mockup** — design_reference__pepi_standalone_src_doc, design_reference_pepi_vision_360_dc_doc, design_reference_pepi_vision_360_standalone_doc [EXTRACTED 1.00]
- **modules/* directories forming the modular-monolith architecture of Pepi Visión 360** — modules_catalog_readme_doc, modules_requests_readme_doc, modules_data_rights_readme_doc, modules_home_visit_coverage_readme_doc, modules_business_settings_readme_doc, modules_auth_readme_doc, modules_notifications_readme_doc, modules_storage_readme_doc [EXTRACTED 1.00]
- **docs/* analysis documents that cross-reference each other to describe design-reference/** — docs_component_inventory_doc, docs_design_analysis_doc, docs_functional_gaps_doc, docs_page_inventory_doc [EXTRACTED 1.00]
- **Admin authentication, roles, and audit logging flow** — openspec_changes_archive_2026_07_14_add_pepi_vision_360_v1_specs_admin_auth_spec_adminuser, openspec_changes_archive_2026_07_14_add_pepi_vision_360_v1_specs_admin_auth_spec_session, openspec_changes_archive_2026_07_14_add_pepi_vision_360_v1_specs_admin_auth_spec_auditlogentry, openspec_changes_archive_2026_07_14_add_pepi_vision_360_v1_specs_data_rights_requests_spec, openspec_changes_archive_2026_07_14_add_pepi_vision_360_v1_specs_product_management_spec, openspec_changes_archive_2026_07_14_add_pepi_vision_360_v1_specs_request_inbox_spec [INFERRED 0.85]
- **Commercial request lifecycle governed by configurable retention** — openspec_changes_archive_2026_07_14_add_pepi_vision_360_v1_specs_quote_requests_spec_request, openspec_changes_archive_2026_07_14_add_pepi_vision_360_v1_specs_home_visit_requests_spec, openspec_changes_archive_2026_07_14_add_pepi_vision_360_v1_specs_request_inbox_spec, openspec_changes_archive_2026_07_14_add_pepi_vision_360_v1_specs_business_settings_spec_businesssettings [INFERRED 0.85]
- **Shared requirement: every admin action logged to audit log** — openspec_specs_admin_auth_spec, openspec_specs_product_management_spec, openspec_specs_data_rights_requests_spec, openspec_specs_home_visit_coverage_spec [INFERRED 0.85]

## Communities (123 total, 43 thin omitted)

### Community 0 - "redesign-extensible-catalog-v2 design.md"
Cohesion: 0.07
Nodes (72): e2e/admin/auth.spec.ts (full-stack auth e2e test, referenced not read), modules/auth/session.ts (cookies()-based session module, referenced not read), add-pepi-vision-360-v1 (change), redesign-extensible-catalog-v2 change config (.openspec.yaml), redesign-extensible-catalog-v2 design.md, ADDITIONAL_OPTIONS fixed catalog (alto índice, polarizado, degradado, espejado, solares graduados), Armazones retired as a category; becomes physical Product within Lentes ópticos, Authorization split: SUPERADMIN for category structure, ADMIN+SUPERADMIN for offerings (+64 more)

### Community 1 - "admin-service.ts"
Cohesion: 0.06
Nodes (57): AdminPage(), Dashboard(), metadata, AttachmentDownloadUrlResult, changeArcoStatusAction(), ChangeArcoStatusResult, deleteRequestAction(), getAttachmentDownloadUrlAction() (+49 more)

### Community 2 - "components.ts"
Cohesion: 0.13
Nodes (43): BADGE_TONE_STYLES, BUTTON_TONE_STYLES, escapeHtml(), escapeHtmlMultiline(), HTML_ESCAPE_MAP, renderButton(), renderDataRow(), renderInfoCard() (+35 more)

### Community 3 - "support.js"
Cohesion: 0.07
Nodes (46): boot(), cdnScriptFor(), collectProps(), compileAttr(), compileTemplate(), contentKey(), createComponentFactory(), createExternalModules() (+38 more)

### Community 4 - "add-admin-brand-management design.md"
Cohesion: 0.06
Nodes (54): CLAUDE.md (project instructions), design-reference/ (read-only mockup export), All development/validation runs through Docker Compose, graphify-out/ (generated knowledge-graph snapshot), openspec/ spec-driven change workflow, Pepi Vision 360 (project), Pepi Vision 360 V1 (archived change, baseline), redesign-extensible-catalog-v2 (active change) (+46 more)

### Community 5 - "design.md — technical design for Pepi Visión 360 v1 (local Docker Compose scope)"
Cohesion: 0.08
Nodes (54): admin-auth capability, AdminUser entity, AuditLogEntry entity (append-only audit log), Brand entity (Prisma model), business-settings capability, BusinessSettings entity (singleton row), Design decision: data minimization for ARCO requests (no RUT, no attachments), data-rights-requests capability (+46 more)

### Community 6 - "admin-service.ts"
Cohesion: 0.10
Nodes (43): reassignAndRemoveProductColorAction(), removeProductColorAction(), reorderProductImagesAction(), setCoverImageAction(), recordAudit(), countProductImages(), countProductImagesByColorId(), createProductColorRow() (+35 more)

### Community 7 - "react"
Cohesion: 0.07
Nodes (42): @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, bcryptjs, Accordion(), Badge(), Button(), Card(), IconCircle() (+34 more)

### Community 8 - "category-service.ts"
Cohesion: 0.11
Nodes (30): deleteCategoryAction(), reorderCategoriesAction(), setCategoryActiveAction(), updateCategoryAction(), AdminCategoriesPage(), metadata, CategoryList(), CategoryListItem (+22 more)

### Community 9 - "actions.ts"
Cohesion: 0.10
Nodes (31): AddColorActionResult, addProductColorAction(), createOfferingAction(), ImageActionResult, OfferingActionResult, ReassignColorActionResult, RemoveColorActionResult, replaceProductImageAction() (+23 more)

### Community 10 - "ImageSlot"
Cohesion: 0.14
Nodes (7): flushNow(), getSlot(), ImageSlot, load(), save(), setSlot(), toDataUrl()

### Community 11 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 12 - "Container.tsx"
Cohesion: 0.13
Nodes (12): metadata, rights, metadata, values, metadata, metadata, Container(), maxWidths (+4 more)

### Community 13 - "prisma.ts"
Cohesion: 0.15
Nodes (15): STATIC_PAGES, expectNoSeriousA11yViolations(), tinyPdfBuffer(), tinyPngBuffer(), tinySolidPngBuffer(), loginAsAdmin(), logout(), E2eFixtures (+7 more)

### Community 14 - "service.ts"
Cohesion: 0.13
Nodes (25): generateMetadata(), OfertaPage(), buildWhatsAppLink(), BADGE_LABELS, CATEGORY_CTA_LABELS, formatClp(), GENDER_LABELS, MATERIAL_LABELS (+17 more)

### Community 15 - "schemas.ts"
Cohesion: 0.12
Nodes (22): ActionResult, createUserAction(), resetPasswordAction(), toggleUserActiveAction(), AdminUserView, NewUserForm(), ResetPasswordControl(), ROLE_LABELS (+14 more)

### Community 16 - "page.tsx"
Cohesion: 0.12
Nodes (21): CatalogResults(), CategoriaPage(), generateMetadata(), Params, SearchParams, CatalogEmptyState(), CatalogSearchInput(), findActiveVisibleCategoryBySlug() (+13 more)

### Community 17 - "icons.tsx"
Cohesion: 0.11
Nodes (20): metadata, metadata, LightboxImage, Footer(), Header(), isActive(), CloseIcon(), InstagramIcon() (+12 more)

### Community 18 - "service.ts"
Cohesion: 0.15
Nodes (15): DataRightsActionState, CheckIcon(), DataRightsForm(), RIGHT_OPTIONS, honeypotSchema, isHoneypotTriggered(), createDataRightsRequest(), CreateDataRightsRequestInput (+7 more)

### Community 19 - "service.ts"
Cohesion: 0.18
Nodes (19): hashPassword(), verifyPassword(), countActiveSuperadmins(), createAdminUser(), createAuditLogEntry(), findAdminByEmail(), findAdminById(), findAdminByUsername() (+11 more)

### Community 20 - "ProductForm.tsx"
Cohesion: 0.13
Nodes (18): OfferingView, ProductColorView, BrandOption, BrandSelect(), EMPTY_VALUES, PREDEFINED_COLORS, ProductColorValue, ProductForm() (+10 more)

### Community 21 - "actions.ts"
Cohesion: 0.17
Nodes (12): submitQuoteAction(), submitDataRightsAction(), HomeVisitActionState, submitHomeVisitAction(), logoutAction(), ATTENTION_TYPES, LogFields, logger (+4 more)

### Community 22 - "service.ts"
Cohesion: 0.17
Nodes (14): updateBusinessSettingsAction(), UpdateSettingsResult, AdminSettingsPage(), metadata, BusinessSettingsForm(), businessDefaults, getBusinessSettingsRow(), upsertBusinessSettingsRow() (+6 more)

### Community 23 - "global-setup.ts"
Cohesion: 0.19
Nodes (16): createCatalogFixture(), FIXTURES_PATH, globalSetup(), randomPassword(), reconcileExistingCatalogFixture(), tag(), FIXTURES_PATH, globalTeardown() (+8 more)

### Community 24 - "add-pepi-vision-360-v1 tasks.md (10 implementation phases)"
Cohesion: 0.13
Nodes (23): admin-auth capability spec (v1), AdminUser model (SUPERADMIN/ADMIN roles), AuditLogEntry (insert-only audit log), Session (persisted, invalidable, server-side), business-settings capability spec (v1), BusinessSettings model (contact data + retention periods), data-rights-requests capability spec (v1, ARCO), home-visit-coverage capability spec (v1) (+15 more)

### Community 25 - "helpers.ts"
Cohesion: 0.16
Nodes (15): Mailpit (email testing tool), BusinessSettings.hoursText model field, data-rights-customer-confirmation.ts (new template), Improve Transactional Emails Design, Decision: content-level test assertions extend, not replace, arrival checks, improve-transactional-emails change metadata, Improve Transactional Emails Proposal, Improve Transactional Emails (README) (+7 more)

### Community 26 - "actions.ts"
Cohesion: 0.13
Nodes (18): AttributeActionResult, createCategoryAttributeAction(), DeleteCategoryActionResult, SaveActionResult, SimpleActionResult, toAttributeView(), updateCategoryAttributeAction(), CategoryAttributeFormInput (+10 more)

### Community 27 - "seed.ts"
Cohesion: 0.14
Nodes (17): Home(), ALLOWED_EXTENSIONS, ALT_TEXT_OVERRIDES, BRANDS_DIR, getBrandLogos(), toAltText(), CategoryCapabilities, main() (+9 more)

### Community 28 - "offering-service.ts"
Cohesion: 0.17
Nodes (19): buildPublicOfferingWhere(), createOfferingRow(), findOfferingById(), findOfferingByProductAndCategory(), findOfferingBySlugInCategoryAny(), IMAGES_ORDERED, listPublicOfferingsForCategory(), listPublicOfferingsForCategoryFiltered() (+11 more)

### Community 29 - "CategoryForm.tsx"
Cohesion: 0.13
Nodes (16): CategoryAttributeView, createCategoryAction(), deleteCategoryAttributeAction(), metadata, NewCategoryPage(), CategoryAttributesManager(), EMPTY_NEW_ATTRIBUTE, NEEDS_OPTIONS (+8 more)

### Community 30 - "service.ts"
Cohesion: 0.21
Nodes (14): createComunaAction(), CreateComunaResult, toggleComunaAction(), AdminHomeVisitsPage(), metadata, ComunaManager(), ComunaView, createComunaRow() (+6 more)

### Community 31 - "HOME_VISIT_ENABLED Flag"
Cohesion: 0.14
Nodes (19): app/admin/requests/ (type filter), catalog-seo Change (future dependency), Graphify (impact-analysis tool), home-visit-availability-flag Capability, HOME_VISIT_ENABLED Flag, modules/home-visit-coverage/ (EnabledComuna CRUD), temporarily-disable-home-visit Design Doc, Change Config (.openspec.yaml) (+11 more)

### Community 32 - "page.tsx"
Cohesion: 0.16
Nodes (13): Params, GalleryLightbox(), ImagePlaceholder(), OfferingCard(), OtherCategoryOfferings(), ProductGallery(), RelatedProducts(), ChevronRightIcon() (+5 more)

### Community 33 - "service.ts"
Cohesion: 0.14
Nodes (17): CotizadorPage(), metadata, home-visit-business-notification.ts (email template), home-visit-customer-confirmation.ts (email template), computeRetentionExpiresAt(), createRequest(), CreateRequestInput, findActiveComunaByName() (+9 more)

### Community 34 - "scripts"
Cohesion: 0.11
Nodes (19): scripts, admin:create-superadmin, build, ci, dev, lint, migrate, postinstall (+11 more)

### Community 35 - "CI GitHub Actions pipeline"
Cohesion: 0.17
Nodes (18): adminer service (optional DB explorer, profile-gated), Docker Compose configuration (compose.yaml), db-init service (least-privilege app role provisioning), db/init-app-role.sql (external SQL script), e2e service (Playwright, profile-gated), mailpit service (local SMTP), migrate service (one-shot Prisma migrations job), minio service (object storage) (+10 more)

### Community 36 - "ProductGalleryManager.tsx"
Cohesion: 0.15
Nodes (12): changeProductImageColorAction(), deleteProductImageAction(), ProductImageView, ACCEPT_ATTR, bySortOrder(), ColorOption, PendingUpload, ProductGalleryManager() (+4 more)

### Community 37 - "Improve Visual Identity and Content Proposal"
Cohesion: 0.16
Nodes (15): app/icon.tsx (favicon/app icon convention), BrandCarousel(), BrandLogo, Improve Visual Identity and Content Design, Decision: accessibility baseline (alt text, reduced motion), Decision: favicon/app-icons via Next.js file-based metadata convention, Decision: one icon family, extended not replaced, improve-visual-identity-and-content change metadata (+7 more)

### Community 38 - "login"
Cohesion: 0.18
Nodes (12): loginAction(), LoginActionState, LoginCard(), Bucket, buckets, isRateLimited(), recordFailure(), resetRateLimit() (+4 more)

### Community 39 - "requireSession"
Cohesion: 0.22
Nodes (14): createProductAction(), parseValues(), updateProductAction(), EditProductPage(), metadata, metadata, NewProductPage(), requireSession() (+6 more)

### Community 40 - "page.tsx"
Cohesion: 0.24
Nodes (6): faqs, metadata, FaqAccordion(), ChevronDownIcon(), SectionHeading(), items

### Community 41 - "devDependencies"
Cohesion: 0.13
Nodes (16): eslint, devDependencies, eslint, tailwindcss, @testing-library/dom, @testing-library/react, tsx, @types/node (+8 more)

### Community 42 - "category-attribute-service.ts"
Cohesion: 0.30
Nodes (13): AttributeRowInput, createAttributeRow(), deleteAttributeRow(), findAttributeByCategoryAndKey(), findAttributeById(), listAttributesForCategory(), updateAttributeRow(), auditAttributes() (+5 more)

### Community 43 - "category-service.test.ts"
Cohesion: 0.13
Nodes (13): actor, countCategoryOfferings, createCategoryRow, deleteCategoryRow, findCategoryById, findCategoryBySlugAny, listCategoriesForAdmin, recordAudit (+5 more)

### Community 44 - "page.tsx"
Cohesion: 0.25
Nodes (5): comparisonRows, glassTypes, metadata, treatments, InfoIcon()

### Community 45 - "zod-helpers.ts"
Cohesion: 0.19
Nodes (9): optionalNonEmpty(), OfferingFormInput, offeringFormSchema, setOfferingActiveSchema, softDeleteOfferingSchema, CreateComunaInput, createComunaSchema, ToggleComunaInput (+1 more)

### Community 46 - "page.tsx"
Cohesion: 0.23
Nodes (9): deleteProductAction(), AdminProductsPage(), metadata, ConfirmDeleteButton(), ProductRowActions(), getProductKpis(), listProductsForAdmin(), getKpis() (+1 more)

### Community 47 - "QuoteWizard.tsx"
Cohesion: 0.18
Nodes (11): QuoteActionState, ATTACHMENT_ACCEPT, choiceClass(), formatFileSize(), FrameOption, GLASS_DESCRIPTIONS, PRESCRIPTION_DESCRIPTIONS, QuoteWizard() (+3 more)

### Community 48 - "Button.tsx"
Cohesion: 0.22
Nodes (9): Button(), classesFor(), LinkButton(), Size, sizes, Variant, variants, inter (+1 more)

### Community 49 - "product-gallery-storage.test.ts"
Cohesion: 0.27
Nodes (7): Env, envSchema, submitQuote(), globalForStorage, buildAttachmentStorageKey(), deletePrivateObject(), uploadPrivateObject()

### Community 50 - "schemas.ts"
Cohesion: 0.18
Nodes (11): consentSchema, HomeVisitRequestInput, homeVisitRequestSchema, nameSchema, optionalEmailSchema, phoneSchema, PRESCRIPTION_ANSWERS, quoteRequestSchema (+3 more)

### Community 51 - "offering-service.test.ts"
Cohesion: 0.15
Nodes (11): actor, createOfferingRow, findCategoryById, findOfferingById, findOfferingByProductAndCategory, findOfferingBySlugInCategoryAny, findProductById, recordAudit (+3 more)

### Community 52 - "page.tsx"
Cohesion: 0.27
Nodes (9): EditCategoryPage(), metadata, listAttributes(), categoryCapabilitiesSchema, FAIL_CLOSED_CAPABILITIES, parseCategoryCapabilities(), validateCategoryCapabilities(), getCategory() (+1 more)

### Community 53 - "errors.ts"
Cohesion: 0.27
Nodes (5): AppError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError

### Community 54 - "product-offerings.test.ts"
Cohesion: 0.33
Nodes (8): createTestAdmin(), deleteTestAdmins(), uniqueTag(), makeActor(), makeBrand(), makeFixture(), makeActor(), makeProduct()

### Community 55 - "AdminShell.tsx"
Cohesion: 0.24
Nodes (8): AdminUsersPage(), metadata, AdminNav(), NAV_ITEMS, AdminShell(), ROLE_LABELS, listAdminUsers(), listUsers()

### Community 56 - "CatalogFilters.tsx"
Cohesion: 0.33
Nodes (8): CatalogFilters(), chipClass(), COLOR_SWATCHES, GENDER_OPTIONS, MATERIAL_OPTIONS, SHAPE_OPTIONS, buildFilterHref(), buildToggleHref()

### Community 57 - "service.ts"
Cohesion: 0.24
Nodes (8): RFC-3834, buildDkimConfig(), createTransport(), globalForMail, MailTransport, SendEmailInput, emailLogCreate, sendMail

### Community 58 - "category-attribute-service.test.ts"
Cohesion: 0.20
Nodes (8): actor, createAttributeRow, deleteAttributeRow, findAttributeByCategoryAndKey, findAttributeById, findCategoryById, recordAudit, updateAttributeRow

### Community 59 - "requests-service.test.ts"
Cohesion: 0.18
Nodes (8): QuoteRequestInput, createRequest, deletePrivateObject, findActiveComunaByName, findProductById, sendAndLog, uploadPrivateObject, verifyAttachmentContent

### Community 60 - "page.tsx"
Cohesion: 0.21
Nodes (9): metadata, steps, benefits, metadata, quoteSteps, Card(), IconBadge(), HomeVisitForm() (+1 more)

### Community 61 - "OPSX: Apply command"
Cohesion: 0.22
Nodes (10): OPSX: Apply command, OPSX: Archive command, OPSX: Explore command, OPSX: Propose command, OPSX: Update command, openspec-apply-change skill, openspec-archive-change skill, openspec-explore skill (+2 more)

### Community 62 - "CurrentSession"
Cohesion: 0.18
Nodes (9): CurrentSession, actor, countProductImagesByColorId, createProductColorRow, deleteProductColorRow, findProductById, findProductColorById, reassignAndDeleteColor (+1 more)

### Community 63 - "auth-authorization.test.ts"
Cohesion: 0.22
Nodes (6): activeAdmin, createAuditLogEntry, findSessionByTokenHash, inactiveAdmin, readSessionCookie, RedirectSignal

### Community 64 - "attachment-processing.ts"
Cohesion: 0.36
Nodes (5): IMAGE_ATTACHMENT_TYPES, PDF_MAGIC, sanitizeAttachmentFileName(), verifyAttachmentContent(), PDF_BYTES

### Community 65 - "logout"
Cohesion: 0.39
Nodes (6): deleteSessionByTokenHash(), logout(), clearSessionCookie(), generateSessionToken(), hashSessionToken(), readSessionCookie()

### Community 66 - "schemas.ts"
Cohesion: 0.32
Nodes (6): ALLOWED_ATTACHMENT_MIME_TYPES, ALLOWED_IMAGE_MIME_TYPES, AttachmentFileMeta, attachmentFileMetaSchema, ImageFileMeta, imageFileMetaSchema

### Community 67 - "package.json"
Cohesion: 0.25
Nodes (7): name, overrides, postcss, prisma, seed, private, version

### Community 68 - "admin-categories-actions.test.ts"
Cohesion: 0.25
Nodes (7): ADMIN_SESSION, recordAudit, requireRole, requireSession, SUPERADMIN_SESSION, validCategoryInput, validOfferingInput

### Community 69 - "offering-configuration.ts"
Cohesion: 0.38
Nodes (5): OfferingConfiguration, offeringConfigurationSchema, offeringConfigurationV1Schema, parseOfferingConfiguration(), validateOfferingConfiguration()

### Community 70 - "run-lighthouse.mjs"
Cohesion: 0.29
Nodes (5): autorunStatus, childEnv, executablePath, healthcheckStatus, lhciBin

### Community 71 - "CookieBanner.tsx"
Cohesion: 0.53
Nodes (4): CookieBanner(), getServerSnapshot(), getSnapshot(), subscribe()

### Community 72 - "next.config.ts"
Cohesion: 0.40
Nodes (3): nextConfig, loadCsp(), loadHeaders()

### Community 73 - "auth-last-superadmin.test.ts"
Cohesion: 0.33
Nodes (5): actor, countActiveSuperadmins, createAuditLogEntry, findAdminById, updateAdminUser

### Community 74 - "auth-login-rate-limit.test.ts"
Cohesion: 0.33
Nodes (5): admin, createAuditLogEntry, createSession, findAdminByIdentifier, verifyPassword

### Community 75 - "page.tsx"
Cohesion: 0.67
Nodes (3): CatalogoPage(), metadata, getCategoryPicker()

### Community 76 - "audit-log-repository.test.ts"
Cohesion: 0.50
Nodes (3): auditLogEntryCreate, entry, loggerError

## Knowledge Gaps
- **458 isolated node(s):** `LoginActionState`, `metadata`, `SaveActionResult`, `SimpleActionResult`, `DeleteCategoryActionResult` (+453 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **43 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `"Multifocal" renamed to "Progresivo" (new submissions only, historical rows immutable)` connect `redesign-extensible-catalog-v2 design.md` to `page.tsx`, `page.tsx`, `page.tsx`, `prisma.ts`, `QuoteWizard.tsx`, `schemas.ts`, `page.tsx`, `add-pepi-vision-360-v1 tasks.md (10 implementation phases)`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `public-site capability spec (v1)` connect `add-pepi-vision-360-v1 tasks.md (10 implementation phases)` to `redesign-extensible-catalog-v2 design.md`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `ValidationError` connect `errors.ts` to `admin-service.ts`, `service.ts`, `offering-configuration.ts`, `admin-service.ts`, `category-service.ts`, `auth-last-superadmin.test.ts`, `category-attribute-service.ts`, `category-service.test.ts`, `service.ts`, `page.tsx`, `offering-service.test.ts`, `CurrentSession`, `category-attribute-service.test.ts`, `requests-service.test.ts`, `offering-service.ts`, `service.ts`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `redesign-extensible-catalog-v2 design.md` (e.g. with `redesign-extensible-catalog-v2 change config (.openspec.yaml)` and `redesign-extensible-catalog-v2 proposal.md`) actually correct?**
  _`redesign-extensible-catalog-v2 design.md` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `LoginActionState`, `metadata`, `SaveActionResult` to the rest of the system?**
  _458 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `redesign-extensible-catalog-v2 design.md` be split into smaller, more focused modules?**
  _Cohesion score 0.06533646322378717 - nodes in this community are weakly interconnected._
- **Should `admin-service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05593561368209256 - nodes in this community are weakly interconnected._