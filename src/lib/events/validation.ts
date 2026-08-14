export interface GuestDetails {
    fullName: string;
    email: string;
    mobile: string;
}

export interface ValidationResult {
    valid: boolean;
    errors: Partial<Record<keyof GuestDetails, string>>;
}

const NAME_MAX = 100;
const EMAIL_MAX = 254;
const MOBILE_MAX = 15;

// Deliberately conservative: letters, spaces, and a small set of punctuation
// used in real names. Rejects anything else, which also blocks markup/script
// payloads from ever being treated as a "valid" name.
const NAME_PATTERN = /^[A-Za-z][A-Za-z .,'-]{1,99}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MOBILE_PATTERN = /^[+]?[0-9]{10,15}$/;

export function validateGuestDetails(input: Partial<GuestDetails>): ValidationResult {
    const errors: ValidationResult['errors'] = {};

    const fullName = (input.fullName ?? '').trim();
    const email = (input.email ?? '').trim();
    const mobile = (input.mobile ?? '').trim();

    if (!fullName || fullName.length > NAME_MAX || !NAME_PATTERN.test(fullName)) {
        errors.fullName = 'Enter a valid full name (letters only, up to 100 characters).';
    }
    if (!email || email.length > EMAIL_MAX || !EMAIL_PATTERN.test(email)) {
        errors.email = 'Enter a valid email address.';
    }
    if (!mobile || mobile.length > MOBILE_MAX || !MOBILE_PATTERN.test(mobile)) {
        errors.mobile = 'Enter a valid mobile number (10–15 digits, optional leading +).';
    }

    return { valid: Object.keys(errors).length === 0, errors };
}
