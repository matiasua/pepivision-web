import { describe, expect, it } from 'vitest';
import { navItems, getVisibleNavItems } from '@/lib/nav-items';

describe('lib/nav-items — getVisibleNavItems', () => {
  it('includes "Atención a domicilio" when enabled (navegación con enlace)', () => {
    const items = getVisibleNavItems(true);
    expect(items).toEqual(navItems);
    expect(items.some((item) => item.href === '/domicilio')).toBe(true);
  });

  it('omits "Atención a domicilio" when disabled, keeping every other item in order (navegación sin enlace)', () => {
    const items = getVisibleNavItems(false);
    expect(items.some((item) => item.href === '/domicilio')).toBe(false);
    expect(items.map((item) => item.href)).toEqual(
      navItems.filter((item) => item.href !== '/domicilio').map((item) => item.href)
    );
    expect(items).toHaveLength(navItems.length - 1);
  });
});
