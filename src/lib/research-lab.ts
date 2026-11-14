/** The four Research Lab themes, shared by the homepage and /research-lab. */
export const RESEARCH_THEMES = [
    {
        title: 'Startup Ideas',
        text: 'Identify and develop space station digital twin and spacecraft engineering ideas with commercial or startup potential.',
        areas: false,
    },
    {
        title: 'Industry Requirements',
        text: 'Research aligned with real requirements in station and spacecraft systems, energy, telemetry, health monitoring and mission operations.',
        areas: false,
    },
    {
        title: 'Practical Projects',
        text: 'Build simulations, physics-based models, prototypes, technical workflows and verification evidence.',
        areas: false,
    },
    {
        title: 'Research & Engineering Development',
        text: 'Develop research in the station and spacecraft domains below, from model to evidence.',
        areas: true,
    },
] as const;

export const RESEARCH_AREAS = [
    'Space Station Systems',
    'Satellite Systems',
    'Electrical Power Systems / EPS',
    'Solar Energy',
    'Battery Energy Storage',
    'Thermal & Environmental Systems',
    'Telemetry',
    'Avionics',
    'Sensors',
    'Station & Spacecraft Health Monitoring',
    'Digital Twins',
    'Mission Engineering',
] as const;

/** Station R&D programmes run in the Research Lab (text-led; maturity as it stands today). */
export const STATION_PROGRAMS = [
    { title: 'Station Energy & Power Systems', text: 'Generation, storage and distribution models, energy margins through eclipses and faults, and load priority for critical systems.', maturity: 'Simulation' },
    { title: 'Station Health Intelligence', text: 'Residual-based fault detection and isolation, starting with power channels and batteries, with measured detection delay and false alarms.', maturity: 'Research' },
    { title: 'Integrated Digital Twin Research', text: 'A modular architecture in which subsystem models share one environment, one data model and one evidence trail.', maturity: 'Concept' },
    { title: 'Thermal & Environmental Models', text: 'Coupled power–thermal networks and cabin atmosphere mass balances for heat rejection and life-support margins.', maturity: 'Planned' },
    { title: 'Autonomous Operations', text: 'Decision support with explainable recommendations, verified against safety requirements before any autonomy is claimed.', maturity: 'Planned' },
    { title: 'Verification and Mission Assurance', text: 'Validation plans, model credibility assessments and traceable engineering evidence for every model.', maturity: 'Planned' },
] as const;

/** How research participation works. Participation implies no employment, funding, certification or affiliation. */
export const PARTICIPATION = [
    { title: 'Who can contribute', text: 'Engineers, scientists, researchers and students with a relevant technical background, individually or from organisations.' },
    { title: 'Required skills', text: 'A grounding in at least one domain (power, thermal, software, modelling, health monitoring or assurance) and the willingness to document your work.' },
    { title: 'Typical experiments', text: 'Energy-balance studies, fault detection on simulated telemetry, model coupling, verification of published equations and sensitivity analyses.' },
    { title: 'Engineering evidence expected', text: 'A stated hypothesis and assumptions, reproducible code and data, results with uncertainty, and an honest account of limitations.' },
    { title: 'Research review', text: 'Each contribution is reviewed for correctness, reproducibility and fit with the programme before it is published or built on.' },
    { title: 'Collaboration enquiries', text: 'Describe the problem, your background and the evidence you could bring; scope, format and availability are agreed case by case.' },
] as const;
