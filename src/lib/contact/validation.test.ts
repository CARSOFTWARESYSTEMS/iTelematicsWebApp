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
            data: { name: 'Jane Researcher', email: 'jane@example.org', organisation: 'IISc', country: '', enquiry: 'internship', message: VALID.message },
        });
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
