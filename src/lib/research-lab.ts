/** The four Research Lab themes, shared by the homepage and /research-lab. */
export const RESEARCH_THEMES = [
    {
        title: 'Startup Ideas',
        text: 'Identify and develop practical Satellite Engineering ideas with commercial or startup potential.',
        areas: false,
    },
    {
        title: 'Industry Requirements',
        text: 'Research aligned with real requirements in spacecraft systems, energy, telemetry, sensors and mission operations.',
        areas: false,
    },
    {
        title: 'Practical Projects',
        text: 'Build simulations, engineering models, prototypes, technical workflows and engineering evidence.',
        areas: false,
    },
    {
        title: 'Research & Engineering Development',
        text: 'Develop research in the spacecraft systems and engineering domains below, from model to evidence.',
        areas: true,
    },
] as const;

export const RESEARCH_AREAS = [
    'Satellite Systems',
    'Electrical Power Systems / EPS',
    'Solar Energy',
    'Battery Systems',
    'Telemetry',
    'Avionics',
    'Sensors',
    'Spacecraft Health Monitoring',
    'Digital Twins',
    'Mission Engineering',
] as const;
