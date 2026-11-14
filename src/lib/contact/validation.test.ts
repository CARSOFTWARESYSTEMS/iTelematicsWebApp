import { describe, it, expect } from 'vitest';
import { validateContact } from './validation';
import { ENQUIRY_OPTIONS } from './enquiries';
import { ENQUIRY_TYPES } from '@/lib/analytics/taxonomy';

const VALID = {
    name: 'Jane Researcher',
    email: 'jane@example.org',
    enquiry: 'internship',
    message: 'Interested in satellite battery SOH research.',
};

describe('validateContact', () => {
    it('accepts a valid enquiry and normalises whitespace', () => {
        const result = validateContact({ ...VALID, name: '  Jane   Researcher ', organisation: ' IISc ' });
        expect(result).toEqual({
            valid: true,
            data: { name: 'Jane Researcher', email: 'jane@example.org', phone: '', organisation: 'IISc', country: '', enquiry: 'internship', message: VALID.message },
        });
    });

    it('accepts an optional phone number in international formats and rejects implausible ones', () => {
        for (const phone of ['+91 98765 43210', '+1 (415) 555-0134', '+44 20 7946 0958', '098765 43210', '+49.30.1234567']) {
            const r = validateContact({ ...VALID, phone });
            expect(r.valid, phone).toBe(true);
            if (r.valid) expect(r.data.phone).toBe(phone);
        }
        for (const phone of ['12345', 'call me', '+91 98765 43210 ext 5', '+1234567890123456', '<script>']) {
            const r = validateContact({ ...VALID, phone });
            expect(r.valid, phone).toBe(false);
            if (!r.valid) expect(Object.keys(r.errors)).toEqual(['phone']);
        }
        expect(validateContact({ ...VALID, phone: '   ' })).toMatchObject({ valid: true, data: { phone: '' } });
    });

    it('accepts names from any script', () => {
        for (const name of ['José Martínez', 'Zoë O’Brien', 'Анна Смирнова', '山田 太郎', 'प्रिया शर्मा']) {
            expect(validateContact({ ...VALID, name }).valid, name).toBe(true);
        }
    });

    it('rejects markup, digits and missing required fields', () => {
        const result = validateContact({ name: '<b>x</b>', email: 'a@b', enquiry: 'unknown', message: 'too short' });
        expect(result.valid).toBe(false);
        if (!result.valid) expect(Object.keys(result.errors).sort()).toEqual(['email', 'enquiry', 'message', 'name']);
    });

    it('strips control characters', () => {
        const result = validateContact({ ...VALID, message: `${VALID.message}\u0000\u0007` });
        expect(result.valid && result.data.message).toBe(VALID.message);
    });

    it('maps every enquiry option to the controlled analytics vocabulary', () => {
        for (const option of ENQUIRY_OPTIONS) {
            expect(ENQUIRY_TYPES).toContain(option.analytics);
        }
    });
});
