// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { BrandCarousel } from '@/components/BrandCarousel';

afterEach(cleanup);

const logos = [
  { src: '/marcas/A.png', alt: 'Brand A' },
  { src: '/marcas/B.png', alt: 'Brand B' },
];

describe('components/BrandCarousel', () => {
  it('renders nothing when there are no logos', () => {
    const { container } = render(<BrandCarousel logos={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders each real logo with accessible alt text exactly once for assistive tech', () => {
    render(<BrandCarousel logos={logos} />);
    // Real (announced) copy: one <img> per logo with its brand name as alt.
    expect(screen.getAllByAltText('Brand A')).toHaveLength(1);
    expect(screen.getAllByAltText('Brand B')).toHaveLength(1);
  });

  it('hides the duplicated loop copy from assistive tech (aria-hidden, empty alt)', () => {
    const { container } = render(<BrandCarousel logos={logos} />);
    const hiddenGroup = container.querySelector('[aria-hidden="true"]');
    expect(hiddenGroup).not.toBeNull();
    const hiddenImages = hiddenGroup!.querySelectorAll('img');
    expect(hiddenImages.length).toBe(logos.length);
    hiddenImages.forEach((img) => expect(img.getAttribute('alt')).toBe(''));
  });

  it('respects prefers-reduced-motion by disabling the animation and hiding the duplicate copy via motion-reduce utilities', () => {
    const { container } = render(<BrandCarousel logos={logos} />);
    const track = container.querySelector('.animate-\\[marquee_36s_linear_infinite\\]');
    expect(track).not.toBeNull();
    expect(track!.className).toContain('motion-reduce:animate-none');
    const hiddenGroup = container.querySelector('[aria-hidden="true"]');
    expect(hiddenGroup!.className).toContain('motion-reduce:hidden');
  });

  it('pauses on hover/focus via group-hover/group-focus-within, without a scripted timer', () => {
    const { container } = render(<BrandCarousel logos={logos} />);
    const region = container.querySelector('[role="region"]');
    expect(region?.className).toContain('group');
    const track = container.querySelector('.animate-\\[marquee_36s_linear_infinite\\]');
    expect(track!.className).toContain('group-hover:[animation-play-state:paused]');
    expect(track!.className).toContain('group-focus-within:[animation-play-state:paused]');
  });

  it('clips overflow so the track never causes page-level horizontal scroll', () => {
    const { container } = render(<BrandCarousel logos={logos} />);
    const region = container.querySelector('[role="region"]');
    expect(region?.className).toContain('overflow-hidden');
  });
});
