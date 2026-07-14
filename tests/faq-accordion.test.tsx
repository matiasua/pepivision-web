// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { FaqAccordion } from '@/components/FaqAccordion';

afterEach(cleanup);

const items = [
  { q: '¿Hacen despacho a domicilio?', a: 'Sí, a las comunas habilitadas.' },
  { q: '¿Puedo pagar con WhatsApp?', a: 'La cotización se cierra por WhatsApp.' },
];

describe('components/FaqAccordion', () => {
  it('starts with every panel collapsed (aria-expanded=false, aria-hidden=true, inert)', () => {
    render(<FaqAccordion items={items} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    buttons.forEach((button) => expect(button.getAttribute('aria-expanded')).toBe('false'));

    const panel = document.getElementById('faq-panel-0')!;
    expect(panel.getAttribute('aria-hidden')).toBe('true');
    expect(panel.getAttribute('inert')).not.toBeNull(); // collapsed panels are removed from the a11y tree/tab order
  });

  it('expands a panel on click, exposing it to assistive tech (aria-expanded, aria-hidden, inert all flip)', () => {
    render(<FaqAccordion items={items} />);
    const [firstButton] = screen.getAllByRole('button');

    fireEvent.click(firstButton);

    expect(firstButton.getAttribute('aria-expanded')).toBe('true');
    const panel = document.getElementById('faq-panel-0')!;
    expect(panel.getAttribute('aria-hidden')).toBe('false');
    expect(panel.getAttribute('inert')).toBeNull();
  });

  it('each button is labelled via aria-controls/aria-labelledby pointing at its own panel (never a shared id)', () => {
    render(<FaqAccordion items={items} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0].getAttribute('aria-controls')).toBe('faq-panel-0');
    expect(buttons[1].getAttribute('aria-controls')).toBe('faq-panel-1');

    const panel1 = document.getElementById('faq-panel-1')!;
    expect(panel1.getAttribute('aria-labelledby')).toBe('faq-button-1');
  });

  it('collapsing one panel does not affect another (single-open accordion)', () => {
    render(<FaqAccordion items={items} />);
    const [firstButton, secondButton] = screen.getAllByRole('button');

    fireEvent.click(firstButton);
    fireEvent.click(secondButton);

    expect(firstButton.getAttribute('aria-expanded')).toBe('false'); // opening the 2nd closes the 1st
    expect(secondButton.getAttribute('aria-expanded')).toBe('true');
  });
});
