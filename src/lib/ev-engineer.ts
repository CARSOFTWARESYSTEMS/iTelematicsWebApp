/**
 * Content for the EV.ENGINEER™ page (/ev-engineer): destinations, pathways, ecosystem and the
 * research index. This file is the only source file allowed to name the person behind
 * EV.ENGINEER™ and the "Training & Internship" programme (instruction, 2026-10-25);
 * src/content-guard.test.ts keeps both out of every other file.
 *
 * URLs are used exactly as supplied, query strings included.
 */
import type { ClickEvent } from '@/lib/analytics/taxonomy';

const AEV = 'https://autonomous.ev.engineer';

/** ev.engineer serves this page (next.config.mjs redirects its root to /ev-engineer). */
export const EV_HOME = 'https://ev.engineer';

/** The EV.ENGINEER™ platform that hosts the research pages; "Explore / Visit EV.ENGINEER™" lead here. */
export const EV_PLATFORM = 'https://autonomous.ev.engineer/';

export const EV_BRAND_LINE = 'Built by engineers. Driven by teams. Focused on solving difficult engineering problems.';
export const EV_PILLARS = ['Engineering', 'Research', 'Learning', 'Building', 'Collaboration'] as const;

export const EV_URL = {
    space: `${AEV}/space`,
    everyday: `${AEV}/space/everyday-applications`,
    satellite: `${AEV}/space/satellite-engineering`,
    interactive3d: `${AEV}/space/satellite-engineering/interactive-3d`,
    cubesat: `${AEV}/space/cubesat`,
    rocketAdvanced: `${AEV}/space/rocket-engine-digital-twin-advanced`,
    rocket: `${AEV}/space/rocket-engine-digital-twin`,
    modelRocketry: `${AEV}/space/model-rocketry`,
    spaceStation: `${AEV}/space/space-station`,
    ishavasyam: 'https://ishavasyam.org/',
    aerospace: 'https://aerospace.ev.engineer/aerospace',
    uflight3d: `${AEV}/aerospace/uflight-3d`,
    aqip: `${AEV}/internships/aerospace-quality-intelligence-platform`,
    batteryCyber: `${AEV}/internships/battery-cybersecurity`,
    batteryFire: `${AEV}/internships/battery-fire-prevention`,
    aegisCan: `${AEV}/internships/AegisCAN`,
    batteryHealth: `${AEV}/internships/ev-battery-health-diagnostics-toolkit`,
    batteryAadhaar: `${AEV}/internships/battery-aadhaar`,
    evHelpAgent: `${AEV}/internships/ev-help-agent/usecases`,
    packDesign: `${AEV}/internships/battery-pack-design`,
    batteryPortal: 'https://battery.ev.engineer/',
    autoRickshaw: `${AEV}/internships/evAutoRickshaw?passengers=6&dailyKm=120&terrain=mixed&traffic=medium&speed=50&ac=0&budget=425000&software=connected&charging=overnight&priority=balanced`,
    passengerTaxi: `${AEV}/design-development/passenger-taxi`,
    circular: `${AEV}/internships/battery-circular-economy`,
    internships: `${AEV}/internships`,
    trainingInternship: `${AEV}/internships/training-internship`,
    evCareer: `${AEV}/ev-career`,
    workshops: `${AEV}/workshop-gallery`,
    startup: `${AEV}/internships/miscellaneous/startup`,
    repair: 'https://repair.ev.engineer/',
    profile: `${AEV}/about/sudarshana-karkala`,
} as const;

export const EV_DOMAINS = ['Energy', 'Space', 'Aerospace', 'Digital Twins', 'Cybersecurity', 'Battery'] as const;

/** The person behind EV.ENGINEER™, introduced by identity rather than by corporate title. */
export const EV_PERSON = {
    name: 'Sudarshana Karkala',
    identity: 'EV.ENGINEER™',
    focus: 'Aerospace & Space Systems · Digital Twins · Cybersecurity',
    line: 'Exploring engineering across Energy, EV Batteries, Aerospace, Space Systems, Digital Twins, Cybersecurity and Engineering Intelligence.',
    location: 'Bengaluru, India',
    profile: EV_URL.profile,
} as const;

/** The FAI & drawing-ballooning card that opens over this page once per visit (PosterDialog). */
export const EV_CARD = {
    id: 'ev-engineer-card',
    src: '/images/ev-engineer-fai-card.webp',
    width: 1659,
    height: 948,
    label: `${EV_PERSON.name}, ${EV_PERSON.identity}`,
    alt: `${EV_PERSON.name}, ${EV_PERSON.identity}, ${EV_PERSON.location}. FAI AS9102 & Drawing Ballooning Automation: Defence Aerospace Quality Intelligence Platform. +91 9845561518, sudarshana.karkala@gmail.com, https://fai.ev.engineer.`,
} as const;

export type EvLink = { label: string; href: string; event: ClickEvent };

/* ---------- Engineering Pathways ---------- */

export const PATHWAYS_INTRO =
    'Explore careers, workshops, training, startup engineering, field-service knowledge and hands-on engineering development.';

export type Pathway = EvLink & { label: string; title: string; text: string; cta: string };

export const PATHWAYS: Pathway[] = [
    {
        title: 'EV Career',
        label: 'Careers · Electric Mobility',
        text: 'Roles, skills and competencies across EVs, batteries, energy systems, cell manufacturing and automotive software.',
        href: EV_URL.evCareer,
        cta: 'Explore EV Career →',
        event: 'ev_engineer_external_click',
    },
    {
        title: 'Workshop Gallery',
        label: 'Hands-on · Workshops',
        text: 'Photographs from hands-on EV battery and autonomous-vehicle workshops.',
        href: EV_URL.workshops,
        cta: 'Explore Workshops →',
        event: 'ev_engineer_external_click',
    },
    {
        title: 'Startup Engineering',
        label: 'Organisation · Growth',
        text: 'The fundamental activities and organisational structure behind a stable EV engineering business.',
        href: EV_URL.startup,
        cta: 'Explore Startup Engineering →',
        event: 'ev_engineer_external_click',
    },
    {
        title: 'Training & Internship',
        label: 'Programmes · Projects',
        text: 'Structured engineering programmes and internship projects across EV, battery, aerospace and space systems.',
        href: EV_URL.trainingInternship,
        cta: 'Explore Training Programs →',
        event: 'ev_engineer_external_click',
    },
    {
        title: 'Battery Engineering Portal',
        label: 'Battery · Research',
        text: 'Lithium-ion degradation research and battery health-monitoring systems.',
        href: EV_URL.batteryPortal,
        cta: 'Visit Battery Engineering →',
        event: 'ev_engineer_battery_click',
    },
    {
        title: 'Electric 2-Wheeler Repair & Service Center',
        label: 'Field Engineering · Service',
        text: 'Field engineering for e-scooters and e-bikes: repairs, battery service and maintenance, in Mangalore.',
        href: EV_URL.repair,
        cta: 'Explore Repair Engineering →',
        event: 'ev_engineer_battery_click',
    },
];

/* ---------- Partnerships & Engineering Ecosystem ---------- */

export type Partner = EvLink & { label: string; mark: string; role: string; line: string; cta: string };

// Each line follows the organisation's own published description. Marks are neutral monograms,
// not the organisations' logos.
export const PARTNERS: Partner[] = [
    {
        label: 'APEX Rocket Systems',
        line: 'Rocket propulsion and launch systems: from a liquid-engine demonstrator toward an integrated launch system.',
        mark: 'AR',
        role: 'Rocket Systems',
        href: 'https://autonomous.ev.engineer/space/partners/apexrocketsystems',
        cta: 'Explore Collaboration →',
        event: 'ev_engineer_partner_click',
    },
    {
        label: 'Gamyaa AeroSystems',
        line: 'Engineering assurance for defence, aerospace and space: requirements, configuration, evidence and verification.',
        mark: 'GA',
        role: 'Aerospace Assurance',
        href: 'https://aerosystems.gamyaa.in',
        cta: 'Visit Gamyaa AeroSystems ↗',
        event: 'ev_engineer_partner_click',
    },
    {
        label: 'UFlight™',
        line: 'Health and usage monitoring (HUMS) for aerospace and autonomous platforms.',
        mark: 'UF',
        role: 'Aerospace Health · Telemetry',
        href: 'https://www.uflight.in/',
        cta: 'Visit UFlight™ ↗',
        event: 'ev_engineer_partner_click',
    },
    {
        label: 'iTelematics®',
        line: 'Applied Satellite Engineering: spacecraft energy, batteries, EPS, sensors, telemetry and health.',
        mark: 'iT',
        role: 'Engineering Software',
        href: 'https://itelematics.com/',
        cta: 'Visit iTelematics® ↗',
        event: 'ev_engineer_partner_click',
    },
    {
        label: 'iFab Innovations',
        line: 'Bengaluru engineering solutions. No formal partnership claimed.',
        mark: 'iF',
        role: 'Embedded Systems',
        href: 'https://ifab.tech/',
        cta: 'Visit iFab Innovations ↗',
        event: 'ev_engineer_partner_click',
    },
    {
        label: 'Thasmai InfoTech Private Limited',
        line: 'A CanSat and model-rocketry engineering research programme: avionics, telemetry, simulation and validation.',
        mark: 'TI',
        role: 'Space Research',
        href: 'https://www.thasmaiinfotech.com/space-research',
        cta: 'Explore Space Research ↗',
        event: 'ev_engineer_partner_click',
    },
    {
        label: 'EV Society™',
        line: 'A non-profit educational and technical community for electric mobility.',
        mark: 'ES',
        role: 'EV Education',
        href: 'https://www.evsociety.org/',
        cta: 'Visit EV Society™ ↗',
        event: 'ev_engineer_partner_click',
    },
    {
        label: 'CAR SOFTWARE SYSTEMS',
        line: 'Electric-vehicle engineering and agentic AI software.',
        mark: 'CS',
        role: 'Engineering Software',
        href: 'https://carsoftwaresystems.com/',
        cta: 'Visit CAR SOFTWARE SYSTEMS ↗',
        event: 'ev_engineer_partner_click',
    },
];

/* ---------- Complete research index ---------- */

export type IndexGroup = { name: string; links: EvLink[] };

const group = (name: string, event: ClickEvent, links: [string, string][]): IndexGroup => ({
    name,
    links: links.map(([label, href]) => ({ label, href, event })),
});

export const RESEARCH_INDEX: IndexGroup[] = [
    group('Space', 'ev_engineer_space_click', [
        ['Space & Aerospace Technologies', EV_URL.space],
        ['Satellite Engineering', EV_URL.satellite],
        ['Interactive 3D Satellite', EV_URL.interactive3d],
        ['CubeSat / CubeTwin', EV_URL.cubesat],
        ['Everyday Applications', EV_URL.everyday],
        ['Rocket Engineering', EV_URL.rocket],
        ['Advanced Rocket Digital Twin', EV_URL.rocketAdvanced],
        ['Model Rocketry', EV_URL.modelRocketry],
        ['Space Station', EV_URL.spaceStation],
    ]),
    group('Aerospace', 'ev_engineer_aerospace_click', [
        // aerospace.ev.engineer serves its Aerospace Technologies and Cybersecurity platform at one address
        ['Aerospace Technologies & Cybersecurity', EV_URL.aerospace],
        ['UFlight™ 3D', EV_URL.uflight3d],
        ['Aerospace Quality Intelligence', EV_URL.aqip],
    ]),
    group('EV & Battery', 'ev_engineer_battery_click', [
        ['Battery Cybersecurity', EV_URL.batteryCyber],
        ['Battery Fire Prevention', EV_URL.batteryFire],
        ['AegisCAN™', EV_URL.aegisCan],
        ['Battery Health & Diagnostics', EV_URL.batteryHealth],
        ['Battery Aadhaar', EV_URL.batteryAadhaar],
        ['Battery Pack Design', EV_URL.packDesign],
        ['Battery Circular Economy', EV_URL.circular],
        ['EV Help Agent', EV_URL.evHelpAgent],
        ['EV Auto Rickshaw', EV_URL.autoRickshaw],
        ['Passenger Taxi', EV_URL.passengerTaxi],
        ['Battery Engineering Portal', EV_URL.batteryPortal],
        ['EV Repair Engineering', EV_URL.repair],
    ]),
    group('Learning & Career', 'ev_engineer_external_click', [
        ['Internships', EV_URL.internships],
        ['Training & Internship', EV_URL.trainingInternship],
        ['EV Career', EV_URL.evCareer],
        ['Workshop Gallery', EV_URL.workshops],
        ['Startup Engineering', EV_URL.startup],
    ]),
    {
        name: 'Ecosystem',
        links: PARTNERS.map(({ label, href, event }) => ({ label, href, event })),
    },
];
