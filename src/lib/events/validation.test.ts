import { describe, it, expect } from 'vitest';
import { validateGuestDetails } from './validation';

describe('validateGuestDetails', () => {
    it('accepts well-formed guest details', () => {
        const result = validateGuestDetails({ fullName: 'Jane Doe', email: 'jane@example.com', mobile: '9876543210' });
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual({});
    });

    it('rejects a missing name', () => {
        const result = validateGuestDetails({ fullName: '', email: 'jane@example.com', mobile: '9876543210' });
        expect(result.valid).toBe(false);
        expect(result.errors.fullName).toBeDefined();
    });

    it('rejects a name containing script/markup content', () => {
        const result = validateGuestDetails({
            fullName: '<script>alert(1)</script>',
            email: 'jane@example.com',
            mobile: '9876543210',
        });
        expect(result.valid).toBe(false);
        expect(result.errors.fullName).toBeDefined();
    });

    it('rejects an oversized name', () => {
        const result = validateGuestDetails({
            fullName: 'A'.repeat(500),
            email: 'jane@example.com',
            mobile: '9876543210',
        });
        expect(result.valid).toBe(false);
        expect(result.errors.fullName).toBeDefined();
    });

    it('rejects a malformed email', () => {
        const result = validateGuestDetails({ fullName: 'Jane Doe', email: 'not-an-email', mobile: '9876543210' });
        expect(result.valid).toBe(false);
        expect(result.errors.email).toBeDefined();
    });

    it('rejects a mobile number with letters or too few digits', () => {
        expect(validateGuestDetails({ fullName: 'Jane Doe', email: 'jane@example.com', mobile: '12345' }).valid).toBe(false);
        expect(
            validateGuestDetails({ fullName: 'Jane Doe', email: 'jane@example.com', mobile: 'abcdefghij' }).valid
        ).toBe(false);
    });

    it('accepts an international mobile number with a leading +', () => {
        const result = validateGuestDetails({ fullName: 'Jane Doe', email: 'jane@example.com', mobile: '+919876543210' });
        expect(result.valid).toBe(true);
    });
});
