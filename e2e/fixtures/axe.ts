import type { Page, TestInfo } from '@playwright/test';
import { expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Runs axe-core against the current page and gates on serious/critical
 * violations only — moderate/minor findings are attached to the test
 * report (never silently dropped) so they can be triaged without blocking
 * the pipeline. See design.md → "Estrategia de accesibilidad" for why the
 * threshold is set here rather than failing on any violation at all: a
 * zero-tolerance gate on moderate/minor findings tends to get disabled
 * wholesale the first time it blocks an unrelated PR, which defeats the
 * purpose more than triaging the lower-severity findings by hand.
 */
export async function expectNoSeriousA11yViolations(page: Page, testInfo: TestInfo, label: string) {
  const results = await new AxeBuilder({ page }).analyze();

  const bySeverity = { critical: 0, serious: 0, moderate: 0, minor: 0 } as Record<string, number>;
  for (const violation of results.violations) {
    bySeverity[violation.impact ?? 'minor'] = (bySeverity[violation.impact ?? 'minor'] ?? 0) + 1;
  }

  await testInfo.attach(`axe-results-${label}`, {
    body: JSON.stringify(results.violations, null, 2),
    contentType: 'application/json',
  });

  const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const nonBlocking = results.violations.filter((v) => v.impact !== 'serious' && v.impact !== 'critical');

  if (nonBlocking.length > 0) {
    console.warn(
      `axe (${label}): ${nonBlocking.length} hallazgo(s) moderate/minor no bloqueantes — ver adjunto axe-results-${label} en el reporte.`,
      nonBlocking.map((v) => `${v.impact}: ${v.id} (${v.nodes.length} nodo(s))`)
    );
  }

  expect(
    blocking,
    `axe encontró ${blocking.length} violación(es) serious/critical en ${label}:\n${blocking
      .map((v) => `- [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodo(s))`)
      .join('\n')}`
  ).toHaveLength(0);
}
