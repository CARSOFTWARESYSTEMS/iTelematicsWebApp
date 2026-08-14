export type EventDomain = 'Electric Mobility' | 'Aerospace' | 'Space';
export type EventMode = 'In-Person' | 'Online' | 'Hybrid';
export type EventType = 'Free' | 'Paid';
export type EventStatus =
    | 'draft'
    | 'registration_open'
    | 'registration_closed'
    | 'completed'
    | 'cancelled';

export interface EventSpeaker {
    name: string;
    title?: string;
}

export interface EventAgendaItem {
    time: string;
    title: string;
}

export interface EventRecord {
    slug: string;
    title: string;
    domain: EventDomain;
    mode: EventMode;
    type: EventType;
    status: EventStatus;
    organizer: string;
    description: string;
    startDateTime: string; // ISO 8601
    endDateTime?: string; // ISO 8601
    timezone: string;
    venue?: string; // required context for In-Person/Hybrid
    organizerContactEmail: string;
    speakers?: EventSpeaker[];
    agenda?: EventAgendaItem[];
    registrationDeadline?: string; // ISO 8601
    capacity?: number;
    /** Base fee in INR. Absent/0 for Free events. This is the sole source of truth for pricing. */
    baseFeeInr?: number;
    /** Additional taxes/fees in INR, if applicable. */
    taxesFeesInr?: number;
    currency: 'INR';
    refundSummary?: string;
    isPilot?: boolean;
}
