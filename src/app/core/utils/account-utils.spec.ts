import { FormControl, FormGroup } from '@angular/forms';
import { toMultipartBody } from './form-data.util';
import { isLibyanMobile, isLibyanPhone } from './phone.util';
import { parseRouteId } from './record-loader.util';
import {
  dateOrderValidator,
  firstError,
  libyanMobileValidator,
  numberValidator,
} from '../../shared/validators/form-validation.util';
import { parseDecimal, parseInteger } from '../../shared/utils/number-parse.util';
import { toGeoPoint } from '../../shared/utils/geo.util';

describe('Libyan phone rules', () => {
  it('accepts mobiles in every prefix form, with separators and Arabic-Indic digits', () => {
    for (const phone of ['0912345678', '912345678', '+218912345678', '00218 92 123 4567', '218-95-1234567', '٠٩١٢٣٤٥٦٧٨']) {
      expect(isLibyanMobile(phone)).withContext(phone).toBeTrue();
    }
  });

  it('rejects non-Libyan or malformed mobiles', () => {
    for (const phone of ['0962345678', '091234567', '01012345678', '+20912345678', '', 'abc']) {
      expect(isLibyanMobile(phone)).withContext(phone).toBeFalse();
    }
  });

  it('accepts landlines only where a landline is allowed', () => {
    expect(isLibyanPhone('0213334444')).toBeTrue();
    expect(isLibyanPhone('0912345678')).toBeTrue();
    expect(isLibyanMobile('0213334444')).toBeFalse();
  });
});

describe('toMultipartBody', () => {
  it('omits empty values so an edit leaves them untouched', () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    const body = toMultipartBody({
      name: 'مغسلة',
      password: null,
      address: '   ',
      latitude: undefined,
      cityId: 3,
      fee: 12.5,
      isActive: false,
      image: file,
    });

    expect(body.get('name')).toBe('مغسلة');
    expect(body.has('password')).toBeFalse();
    expect(body.has('address')).toBeFalse();
    expect(body.has('latitude')).toBeFalse();
    expect(body.get('cityId')).toBe('3');
    expect(body.get('fee')).toBe('12.5');
    expect(body.get('isActive')).toBe('false');
    expect((body.get('image') as File).name).toBe('photo.jpg');
  });
});

describe('number parsing', () => {
  it('parses signed decimals and integers, Arabic digits included', () => {
    expect(parseDecimal('32.8872')).toBe(32.8872);
    expect(parseDecimal('-٣٫٥')).toBe(-3.5);
    expect(parseDecimal('1e3')).toBeNull();
    expect(parseInteger('٢٠١٩')).toBe(2019);
    expect(parseInteger('20.5')).toBeNull();
  });
});

describe('account validators', () => {
  it('libyanMobileValidator ignores empty values and flags bad numbers', () => {
    const validate = libyanMobileValidator();
    expect(validate(new FormControl(''))).toBeNull();
    expect(validate(new FormControl('0912345678'))).toBeNull();
    expect(validate(new FormControl('12345'))).toEqual({ libyanMobile: true });
  });

  it('numberValidator checks format, integer-ness and range', () => {
    const year = numberValidator({ integer: true, min: 1950, max: 2030 });
    expect(year(new FormControl('2019'))).toBeNull();
    expect(year(new FormControl('19x'))).toEqual({ number: true });
    expect(year(new FormControl('1900'))).toEqual({ min: { min: 1950, actual: 1900 } });
  });

  it('dateOrderValidator puts its message on the end date and clears it once fixed', () => {
    const group = new FormGroup(
      { start: new FormControl('2026-05-01'), end: new FormControl('2026-04-01') },
      { validators: dateOrderValidator('start', 'end', 'تاريخ الانتهاء يجب أن يكون بعد تاريخ الإصدار') },
    );
    const end = group.controls.end;
    end.markAsTouched();

    expect(group.invalid).toBeTrue();
    expect(firstError(end, 'تاريخ الانتهاء')).toBe('تاريخ الانتهاء يجب أن يكون بعد تاريخ الإصدار');

    end.setValue('2027-05-01');
    expect(group.valid).toBeTrue();
    expect(end.errors).toBeNull();
  });
});

describe('small parsers', () => {
  it('parseRouteId accepts positive integers only', () => {
    expect(parseRouteId('42')).toBe(42);
    expect(parseRouteId('0')).toBeNull();
    expect(parseRouteId('4a')).toBeNull();
    expect(parseRouteId(undefined)).toBeNull();
  });

  it('toGeoPoint drops missing, out-of-range and (0,0) coordinates', () => {
    expect(toGeoPoint(32.9, 13.2)).toEqual({ lat: 32.9, lng: 13.2 });
    expect(toGeoPoint(null, 13.2)).toBeNull();
    expect(toGeoPoint(0, 0)).toBeNull();
    expect(toGeoPoint(95, 13)).toBeNull();
  });
});
