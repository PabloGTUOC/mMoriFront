import { describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { documentId, oid, serializeDocument, toDateOnly, toTimestamp } from '../src/lib/serialize.js';
import { toBoolean, toDateOrUndefined, toNumberOrUndefined, optionalWrapper, pick } from '../src/lib/params.js';

/**
 * The wire format is the contract (BACKEND_SPEC §6). A client reading `inserted_id.$oid`
 * breaks the moment an `_id` serialises as a bare string, so it is worth pinning down.
 */

describe('Mongoid-compatible serialisation (§6)', () => {
  it('renders ObjectIds as { $oid }, never as a bare string', () => {
    const id = new Types.ObjectId('665f1f77bcf86cd799439011');
    expect(oid(id)).toEqual({ $oid: '665f1f77bcf86cd799439011' });
    expect(documentId({ _id: id })).toEqual({ $oid: '665f1f77bcf86cd799439011' });
  });

  it('renders Date fields as YYYY-MM-DD and timestamps as ISO-8601 UTC', () => {
    const doc = {
      _id: new Types.ObjectId('665f1f77bcf86cd799439011'),
      user_id: 'abc123',
      dob: new Date(Date.UTC(1990, 4, 14)),
      created_at: new Date(Date.UTC(2024, 5, 14, 12, 2, 57)),
      __v: 0,
    };

    expect(serializeDocument(doc)).toEqual({
      _id: { $oid: '665f1f77bcf86cd799439011' },
      user_id: 'abc123',
      dob: '1990-05-14',
      created_at: '2024-06-14T12:02:57.000Z',
    });
  });

  it('drops the Mongoose version key, which Mongoid never emitted', () => {
    expect(serializeDocument({ __v: 3, name: 'HIIT' })).toEqual({ name: 'HIIT' });
  });

  it('formats dates and timestamps in UTC', () => {
    expect(toDateOnly(new Date(Date.UTC(2024, 7, 10)))).toBe('2024-08-10');
    expect(toTimestamp(new Date(Date.UTC(2024, 5, 14, 12, 2, 57)))).toBe(
      '2024-06-14T12:02:57.000Z'
    );
  });
});

describe('parameter coercion', () => {
  it('parses YYYY-MM-DD at UTC midnight so a date never shifts a day', () => {
    const parsed = toDateOrUndefined('2024-08-10');
    expect(parsed).toBeInstanceOf(Date);
    expect(toDateOnly(parsed as Date)).toBe('2024-08-10');
  });

  it('accepts numbers sent as strings', () => {
    expect(toNumberOrUndefined('77.4')).toBe(77.4);
    expect(toNumberOrUndefined(77.4)).toBe(77.4);
    expect(toNumberOrUndefined('')).toBeUndefined();
    expect(toNumberOrUndefined('not a number')).toBeUndefined();
  });

  it('accepts booleans in the several shapes a form may send', () => {
    expect(toBoolean(true)).toBe(true);
    expect(toBoolean('true')).toBe(true);
    expect(toBoolean('on')).toBe(true);
    expect(toBoolean(1)).toBe(true);
    expect(toBoolean(false)).toBe(false);
    expect(toBoolean('false')).toBe(false);
    expect(toBoolean(undefined)).toBe(false);
  });

  it('prefers the spec field name over the frontend alias', () => {
    expect(pick({ country: 'ESP', country_code: 'USA' }, 'country', 'country_code')).toBe('ESP');
    expect(pick({ country_code: 'USA' }, 'country', 'country_code')).toBe('USA');
    expect(pick({ country: '' }, 'country', 'country_code')).toBeUndefined();
  });

  it('falls back to the bare body when no wrapper key is present', () => {
    expect(optionalWrapper({ stretch: { name: 'Hamstring' } }, 'stretch')).toEqual({
      name: 'Hamstring',
    });
    expect(optionalWrapper({ stretch_name: 'Hamstring' }, 'stretch')).toEqual({
      stretch_name: 'Hamstring',
    });
  });
});
