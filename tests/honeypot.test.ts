import { describe, expect, it } from 'vitest';
import { honeypotSchema, isHoneypotTriggered } from '@/lib/honeypot';

describe('lib/honeypot', () => {
  it('is not triggered when empty or absent', () => {
    expect(isHoneypotTriggered('')).toBe(false);
    expect(isHoneypotTriggered('   ')).toBe(false);
  });

  it('is triggered when filled', () => {
    expect(isHoneypotTriggered('http://spam.example')).toBe(true);
  });

  it('schema never rejects a filled value — detection happens in the service layer', () => {
    expect(honeypotSchema.safeParse('http://spam.example').success).toBe(true);
    expect(honeypotSchema.safeParse(undefined).data).toBe('');
  });
});
