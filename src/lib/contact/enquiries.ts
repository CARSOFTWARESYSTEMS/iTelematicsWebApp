import type { EnquiryType } from '@/lib/analytics/taxonomy';

/** Enquiry options shown in the contact form, each mapped to the controlled analytics vocabulary. */
export const ENQUIRY_OPTIONS = [
    { value: 'internship', label: 'Satellite Engineering Internship', analytics: 'internship' },
    { value: 'research', label: 'Research Collaboration', analytics: 'research' },
    { value: 'academic', label: 'Academic Collaboration', analytics: 'academic' },
    { value: 'technical-review', label: 'Technical Review', analytics: 'research' },
    { value: 'industry', label: 'Industry Collaboration', analytics: 'industry' },
    { value: 'consultancy', label: 'Consultancy', analytics: 'consultancy' },
    { value: 'research-platform', label: 'Research Platform', analytics: 'research' },
    { value: 'investment', label: 'Investment / Strategic Discussion', analytics: 'investment' },
    { value: 'other', label: 'Other', analytics: 'other' },
] as const satisfies readonly { value: string; label: string; analytics: EnquiryType }[];

export type EnquiryValue = (typeof ENQUIRY_OPTIONS)[number]['value'];

export function findEnquiry(value: unknown) {
    return ENQUIRY_OPTIONS.find((o) => o.value === value);
}
