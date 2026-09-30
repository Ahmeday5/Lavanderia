import { APP_CURRENCY } from '../../core/constants/currency.constants';
import { formatMoney } from './number-format.util';

const NBSP = String.fromCharCode(0xa0);

describe('formatMoney', () => {
  it('always renders Libyan dinars with the fixed symbol', () => {
    expect(APP_CURRENCY.code).toBe('LYD');
    expect(formatMoney(27)).toBe(`27${NBSP}د.ل`);
    expect(formatMoney(82602.98)).toBe(`82.602,98${NBSP}د.ل`);
  });

  it('keeps dirhams (3 decimals) and drops trailing zeros', () => {
    expect(formatMoney(1.125)).toBe(`1,125${NBSP}د.ل`);
    expect(formatMoney(10.5)).toBe(`10,5${NBSP}د.ل`);
  });

  it('treats missing values as zero', () => {
    expect(formatMoney(null)).toBe(`0${NBSP}د.ل`);
    expect(formatMoney(Number.NaN)).toBe(`0${NBSP}د.ل`);
  });

  it('contains no invisible bidi marks', () => {
    expect(/[‎‏؜]/.test(formatMoney(1234.5))).toBeFalse();
  });
});
