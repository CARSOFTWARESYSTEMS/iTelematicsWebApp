import { findEnquiry, type EnquiryValue } from './enquiries';

export type ContactEnquiry = {
    name: string;
    email: string;
    organisation: string;
    country: string;
    enquiry: EnquiryValue;
    message: string;
};

export type ContactField = keyof ContactEnquiry;

export type ContactValidation =
    | { valid: true; data: ContactEnquiry }
    | { valid: false; errors: Partial<Record<ContactField, string>> };

export const LIMITS = {
    name: 100,
    email: 254,
    organisation: 120,
    country: 60,
    messageMin: 20,
    messageMax: 1500, // keeps the mailto: draft within what email apps accept
} as const;

// Unicode letters so names from any country validate; rejects markup and digits.
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} .,'’-]*$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const text = (value: unknown) => (typeof value === 'string' ? value.replace(CONTROL_CHARS, '').trim() : '');
const singleLine = (value: unknown) => text(value).replace(/\s+/g, ' ');

export function validateContact(input: Record<string, unknown>): ContactValidation {
    const name = singleLine(input.name);
    const email = singleLine(input.email);
    const organisation = singleLine(input.organisation);
    const country = singleLine(input.country);
    const message = text(input.message);
    const enquiry = findEnquiry(input.enquiry);

    const errors: Partial<Record<ContactField, string>> = {};
    if (name.length < 2 || name.length > LIMITS.name || !NAME_PATTERN.test(name)) {
        errors.name = 'Enter your name (letters only, up to 100 characters).';
    }
    if (!email || email.length > LIMITS.email || !EMAIL_PATTERN.test(email)) {
        errors.email = 'Enter a valid email address.';
    }
    if (organisation.length > LIMITS.organisation) {
        errors.organisation = `Keep this under ${LIMITS.organisation} characters.`;
    }
    if (country.length > LIMITS.country) {
        errors.country = `Keep this under ${LIMITS.country} characters.`;
    }
    if (!enquiry) {
        errors.enquiry = 'Choose an enquiry type.';
    }
    if (message.length < LIMITS.messageMin || message.length > LIMITS.messageMax) {
        errors.message = `Write between ${LIMITS.messageMin} and ${LIMITS.messageMax} characters.`;
    }

    if (Object.keys(errors).length > 0 || !enquiry) return { valid: false, errors };
    return { valid: true, data: { name, email, organisation, country, enquiry: enquiry.value, message } };
}
