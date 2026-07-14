import { describe, expect, it } from 'vitest';
import { escapeHtml, escapeHtmlMultiline, renderButton, renderDataRow, renderInfoCard, renderNotice, renderStatusBadge } from '@/modules/notifications/email/components';

describe('modules/notifications/email/components — escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`& < > " '`)).toBe('&amp; &lt; &gt; &quot; &#39;');
  });

  it('leaves plain text (including accented Spanish) untouched', () => {
    expect(escapeHtml('Ñuñoa, José Peña')).toBe('Ñuñoa, José Peña');
  });

  it('neutralizes a <script> injection attempt', () => {
    const result = escapeHtml('<script>alert(1)</script>');
    expect(result).not.toContain('<script>');
    expect(result).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('neutralizes an attribute-breakout attempt (quote + event handler)', () => {
    const result = escapeHtml(`" onmouseover="alert(1)`);
    expect(result).not.toContain('"');
    expect(result).toContain('&quot;');
  });
});

describe('modules/notifications/email/components — escapeHtmlMultiline', () => {
  it('escapes and converts newlines to <br>', () => {
    expect(escapeHtmlMultiline('línea 1\nlínea 2 <b>')).toBe('línea 1<br>línea 2 &lt;b&gt;');
  });
});

describe('modules/notifications/email/components — renderDataRow / renderInfoCard', () => {
  it('escapes the label but embeds the pre-built value fragment as-is', () => {
    const row = renderDataRow({ label: '<b>Nombre</b>', value: 'Ana' });
    expect(row).toContain('&lt;b&gt;Nombre&lt;/b&gt;');
    expect(row).toContain('Ana');
  });

  it('wraps rows in a table-based card', () => {
    const card = renderInfoCard(renderDataRow({ label: 'Comuna', value: 'Ñuñoa' }));
    expect(card).toContain('<table');
    expect(card).toContain('Ñuñoa');
  });
});

describe('modules/notifications/email/components — renderStatusBadge', () => {
  it('escapes the label', () => {
    expect(renderStatusBadge('<script>x</script>', 'success')).not.toContain('<script>');
  });
});

describe('modules/notifications/email/components — renderButton', () => {
  it('embeds the href as an absolute, escaped attribute and escapes the label', () => {
    const html = renderButton('<script>x</script>', 'https://wa.me/56900000000?text=hola');
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('href="https://wa.me/56900000000?text=hola"');
  });

  it('escapes special characters inside the href itself', () => {
    const html = renderButton('Ir', 'https://example.cl/x?a=1&b="2"');
    expect(html).toContain('&amp;b=&quot;2&quot;');
  });
});

describe('modules/notifications/email/components — renderNotice', () => {
  it('escapes and preserves line breaks in notice text', () => {
    const html = renderNotice('Aviso <importante>\nsegunda línea');
    expect(html).toContain('&lt;importante&gt;');
    expect(html).toContain('<br>');
  });
});
