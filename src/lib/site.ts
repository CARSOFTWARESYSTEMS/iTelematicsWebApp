/**
 * Single source of truth for site-wide content: company details, navigation,
 * Consultancy & Services menu, ecosystem organisations and engineering resources.
 * Navbar, Footer, pages, sitemap and structured data all read from here.
 */
import type { ClickEvent } from '@/lib/analytics/taxonomy';

export const SITE = {
    name: 'iTelematics®',
    legalName: 'iTelematics Software Private Limited',
    url: 'https://itelematics.com',
    positioning: 'Satellite Engineering',
    descriptor: 'Solar · EPS · Battery · Sensors · Telemetry · Spacecraft Health',
    description:
        'Applied Satellite Engineering projects in spacecraft energy, batteries, EPS, sensors, telemetry and health, shaped by startup and industry requirements.',
    email: 'info@iTelematics.com',
    hrEmail: 'hr@iTelematics.com',
    phone: '+91 91082 06147',
    phoneHref: 'tel:+919108206147',
    address: {
        street: 'Bhoganahalli',
        locality: 'Bangalore',
        region: 'Karnataka',
        postalCode: '560103',
        country: 'IN',
        display: 'Bhoganahalli, Bangalore 560103, India',
    },
    cin: 'U72200KA2012PTC065650',
    gstin: '29AADCI0384D1ZQ',
    msme: 'UDYAM-KR-02-0123269',
} as const;

export const CORE_QUESTION = 'Can the satellite generate, store and manage sufficient energy to safely accomplish its mission?';
export const FLAGSHIP = 'Satellite Energy & Telemetry Intelligence';
export const REGIONS = ['India', 'USA', 'Europe', 'Asia-Pacific', 'Global'] as const;

export type NavItem = {
    name: string;
    href: string;
    external?: boolean;
};

export type NavGroup = {
    name: string;
    links: NavItem[];
};

export type PrimaryNavItem = NavItem & {
    groups?: NavGroup[];
    extraLinks?: NavItem[];
    // Analytics event for submenu links that no destination rule claims
    track?: ClickEvent;
};

// Existing Consultancy & Services structure, kept as-is. Removed: "Battery Diagnostics (POC/UX) - 3"
// (demo.battery.ev.engineer fails its TLS handshake). Documents under /documents are the public
// versions with neutral filenames; unredacted originals are kept, unserved, in archive/public-originals.
export const CONSULTANCY_GROUPS: NavGroup[] = [
    {
        name: 'Space Research & Workshops',
        links: [
            { name: 'Space Technologies', href: 'https://aerospace.ev.engineer/space', external: true },
            { name: 'CanSat Model Rocketry Workshops', href: 'https://aerospace.ev.engineer/space/model-rocketry', external: true },
            { name: 'CanSat Model Rocketry - 1', href: 'https://drive.google.com/file/d/1syaneI6zCLfm4NPquCoEpwQDmth3pZqY/view', external: true },
            { name: 'CubeTwin Simulator', href: 'https://aerospace.ev.engineer/space/cubesat', external: true },
            { name: 'Aerospace Cybersecurity', href: 'https://aerospace.ev.engineer', external: true },
            { name: 'Space Applications', href: 'https://aerospace.ev.engineer/space/everyday-applications', external: true },
            { name: 'Space Station Research', href: 'https://ishavasyam.org/', external: true },
            { name: 'Space Career Opportunities', href: '/documents/space-career-opportunities.pdf', external: true },
        ],
    },
    {
        name: 'EV Battery Workshops',
        links: [
            { name: 'EV Workshops', href: 'https://repair.ev.engineer/', external: true },
            { name: 'Battery Workshops', href: 'https://battery.ev.engineer/', external: true },
            { name: 'Energy Research', href: 'https://autonomous.ev.engineer/si-ems', external: true },
            { name: 'Mobile Workshops', href: 'https://imacxrepair.com/', external: true },
            { name: 'EV Engineering Labs', href: 'https://labs.ev.engineer/', external: true },
        ],
    },
    {
        name: 'Papers & Presentations',
        links: [
            { name: 'IEEE - Battery Intelligence', href: '/research/IEEE conference certificate - Battery Intelligence - secure.pdf', external: true },
            { name: 'PPT - Battery Intelligence v.1', href: '/public/Battery Intelligence v.1.pdf', external: true },
            { name: 'PPT - Battery Pack Aadhaar Services', href: '/documents/battery-pack-aadhaar.pdf', external: true },
        ],
    },
    {
        name: 'Battery Pack Aadhaar Systems',
        links: [
            { name: 'Battery Pack Aadhaar (Draft)', href: '/documents/battery-pack-aadhaar.pdf', external: true },
            { name: 'Battery Pack Aadhaar (POC/UX) - 1', href: 'https://tweak-stand-28567793.figma.site/', external: true },
            { name: 'Battery Pack Aadhaar (POC/UX) - 2', href: 'https://stack-beta-65283525.figma.site/', external: true },
        ],
    },
    {
        name: 'EV & AI Toolkits',
        links: [
            { name: 'MSME Toolkit - AS9102 FAI Reports', href: 'https://fai.ev.engineer/', external: true },
            { name: 'Online Webinar Poster Generator', href: 'https://stove-trial-23088417.figma.site/', external: true },
            { name: 'Online Certificate Generator', href: 'https://flat-warmth-44999728.figma.site', external: true },
            { name: 'Chess Puzzle Generator', href: 'https://krutarth.in', external: true },
            { name: 'EV Society portal', href: 'https://www.evsociety.org/', external: true },
        ],
    },
];

export const CONSULTANCY_EXTRA_LINKS: NavItem[] = [
    { name: 'FAQ - Frequently Asked Questions', href: '/documents/itelematics-faq.pdf', external: true },
];

/** Curated three-group menu for the header; every existing link remains on /consultancy. */
export const CONSULTANCY_MENU: NavGroup[] = [
    {
        name: 'Space & Research',
        links: [
            { name: 'Space Technologies', href: 'https://aerospace.ev.engineer/space', external: true },
            { name: 'CanSat / Model Rocketry', href: 'https://aerospace.ev.engineer/space/model-rocketry', external: true },
            { name: 'CubeTwin Simulator', href: 'https://aerospace.ev.engineer/space/cubesat', external: true },
            { name: 'Space Applications', href: 'https://aerospace.ev.engineer/space/everyday-applications', external: true },
            { name: 'Space Station Research', href: 'https://ishavasyam.org/', external: true },
        ],
    },
    {
        name: 'Energy & Engineering',
        links: [
            { name: 'Battery Workshops', href: 'https://battery.ev.engineer/', external: true },
            { name: 'Energy Research', href: 'https://autonomous.ev.engineer/si-ems', external: true },
            { name: 'EV Engineering Labs', href: 'https://labs.ev.engineer/', external: true },
            { name: 'Battery Pack Aadhaar', href: '/documents/battery-pack-aadhaar.pdf', external: true },
        ],
    },
    {
        name: 'Tools & Resources',
        links: [
            { name: 'AS9102 FAI Reports', href: 'https://fai.ev.engineer/', external: true },
            { name: 'Presentations', href: '/consultancy#papers-presentations' },
            { name: 'FAQs', href: '/documents/itelematics-faq.pdf', external: true },
            { name: 'Engineering Resources', href: '/consultancy#ev-ai-toolkits' },
        ],
    },
];

export const PRIMARY_NAV: PrimaryNavItem[] = [
    { name: 'Satellite Engineering', href: '/satellite-engineering' },
    { name: 'Research', href: '/research-platform' },
    { name: 'Internships', href: '/internships' },
    { name: 'Ecosystem', href: '/partners' },
    {
        name: 'Consultancy',
        href: '/consultancy',
        groups: CONSULTANCY_MENU,
        track: 'consultancy_click',
    },
    { name: 'About', href: '/about' },
];

export const CONTACT_NAV: NavItem = { name: 'Contact', href: '/contact' };

/** Join R&D opens the enquiry form with Research Collaboration preselected; visitors can change it. */
export const JOIN_HREF = '/contact?enquiry=research';

export const RESOURCES = {
    satelliteEngineering: {
        name: 'Satellite Engineering',
        href: 'https://aerospace.ev.engineer/space/satellite-engineering',
        cta: 'Explore Satellite Engineering',
        description:
            'Learn Satellite Engineering from spacecraft architecture and mission requirements through subsystem design, verification and engineering reviews.',
        detail: 'Spacecraft architecture around a 6U Earth-observation reference mission, through formal SRR → MRR reviews.',
    },
    interactive3d: {
        name: 'Interactive 3D Satellite',
        href: 'https://aerospace.ev.engineer/space/satellite-engineering/interactive-3d',
        cta: 'Explore Interactive 3D',
        description: 'Explore satellite architecture and subsystem relationships through an interactive engineering model.',
        detail: 'Power, avionics, ADCS, payload, communications and thermal. Best on a laptop or desktop.',
    },
    cubeTwin: {
        name: 'CubeTwin Simulator',
        href: 'https://aerospace.ev.engineer/space/cubesat',
    },
} as const;

export type EcosystemLink = { label: string; href: string; kind: 'official' | 'context' | 'internal' };

export type EcosystemOrg = {
    name: string;
    line: string;
    status: string;
    links: EcosystemLink[];
};

// Relationships are described as each organisation's own published material states them.
export const ECOSYSTEM: EcosystemOrg[] = [
    {
        name: 'Gamyaa AeroSystems',
        line: 'Aerospace and defence engineering assurance.',
        status: 'Engineering collaboration',
        links: [{ label: 'Visit', href: 'https://aerosystems.gamyaa.in/', kind: 'official' }],
    },
    {
        name: 'APEX Rocket Systems',
        line: 'Rocket propulsion and launch systems.',
        status: 'Proposed · concept stage',
        links: [
            { label: 'Partnership', href: 'https://aerospace.ev.engineer/space/partners/apexrocketsystems', kind: 'context' },
            { label: 'Official Website', href: 'https://www.apexrocketsystems.com/', kind: 'official' },
        ],
    },
    {
        name: 'iFab Innovations',
        line: 'Bengaluru engineering solutions. No formal partnership claimed.',
        status: 'Engineering & Innovation Ecosystem',
        links: [{ label: 'Visit', href: 'https://ifab.tech/', kind: 'official' }],
    },
    {
        name: 'EV Society™',
        line: 'Technical and engineering community.',
        status: 'Ecosystem partner',
        links: [{ label: 'Visit', href: 'https://www.evsociety.org/', kind: 'official' }],
    },
    {
        name: 'EV.ENGINEER™',
        line: 'Engineering platform hosting Satellite Engineering resources.',
        status: 'Operated by iTelematics®',
        links: [{ label: 'Visit', href: '/ev-engineer', kind: 'internal' }],
    },
];

/** Routes in the active site, used by the sitemap. */
export const SITE_ROUTES = [
    { path: '/', priority: 1 },
    { path: '/satellite-engineering', priority: 0.9 },
    { path: '/research-platform', priority: 0.9 },
    { path: '/internships', priority: 0.9 },
    { path: '/partners', priority: 0.6 },
    { path: '/consultancy', priority: 0.5 },
    { path: '/about', priority: 0.6 },
    { path: '/contact', priority: 0.7 },
    { path: '/ev-engineer', priority: 0.4 },
    { path: '/policies/privacy', priority: 0.2 },
    { path: '/policies/terms', priority: 0.2 },
] as const;
