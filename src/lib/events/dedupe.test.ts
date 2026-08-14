import { describe, it, expect } from 'vitest';
import { isRateLimitedOrDuplicate } from './dedupe';

describe('isRateLimitedOrDuplicate', () => {
    it('does not flag the first submission', () => {
        expect(isRateLimitedOrDuplicate('slug-a', 'unique1@example.com', '9000000001')).toBe(false);
    });

    it('flags rapid duplicate submissions of the same event+email+mobile beyond the threshold', () => {
        const slug = 'slug-b';
        const email = 'dup@example.com';
        const mobile = '9000000002';
        expect(isRateLimitedOrDuplicate(slug, email, mobile)).toBe(false); // 1st
        expect(isRateLimitedOrDuplicate(slug, email, mobile)).toBe(false); // 2nd
        expect(isRateLimitedOrDuplicate(slug, email, mobile)).toBe(false); // 3rd
        expect(isRateLimitedOrDuplicate(slug, email, mobile)).toBe(true); // 4th — flagged
    });

    it('is case-insensitive on email', () => {
        const slug = 'slug-c';
        const mobile = '9000000003';
        isRateLimitedOrDuplicate(slug, 'Person@Example.com', mobile);
        isRateLimitedOrDuplicate(slug, 'person@example.com', mobile);
        isRateLimitedOrDuplicate(slug, 'PERSON@EXAMPLE.COM', mobile);
        expect(isRateLimitedOrDuplicate(slug, 'person@example.com', mobile)).toBe(true);
    });

    it('does not flag a different attendee for the same event', () => {
        const slug = 'slug-d';
        isRateLimitedOrDuplicate(slug, 'first@example.com', '9000000004');
        expect(isRateLimitedOrDuplicate(slug, 'second@example.com', '9000000005')).toBe(false);
    });
});
