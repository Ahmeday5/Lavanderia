import { normalizeAmountInput, parseAmount } from './number-parse.util';

describe('normalizeAmountInput', () => {
  it('converts Arabic-Indic digits and decimal separators', () => {
    expect(normalizeAmountInput('١٢٫٥')).toBe('12.5');
    expect(normalizeAmountInput('7,25')).toBe('7.25');
    expect(normalizeAmountInput(' 1 0 ')).toBe('10');
  });
});

describe('parseAmount', () => {
  it('parses plain and localized amounts', () => {
    expect(parseAmount('10')).toBe(10);
    expect(parseAmount('0')).toBe(0);
    expect(parseAmount('٧٫٥')).toBe(7.5);
    expect(parseAmount('2,250')).toBe(2.25);
  });

  it('rejects non-numeric, negative and malformed input', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount(null)).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('-5')).toBeNull();
    expect(parseAmount('1.2.3')).toBeNull();
    expect(parseAmount('5.')).toBeNull();
  });

  it('rejects more decimals than the currency supports instead of rounding', () => {
    expect(parseAmount('1.125')).toBe(1.125);
    expect(parseAmount('1.1255')).toBeNull();
    expect(parseAmount('1.25', 1)).toBeNull();
  });
});
