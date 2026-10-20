/** The four internship themes, shared by the homepage and /internships. */
export const INTERNSHIP_THEMES = [
    {
        title: 'Startup Ideas',
        text: 'Identify and develop practical Satellite Engineering ideas with commercial or startup potential.',
    },
    {
        title: 'Industry Requirements',
        text: 'Work on projects aligned with real requirements in spacecraft systems, energy, telemetry, sensors and mission operations.',
    },
    {
        title: 'Practical Projects',
        text: 'Build simulations, engineering models, prototypes, technical workflows and engineering evidence.',
    },
    {
        title: 'Career-Focused Work',
        text: 'Select projects aligned with the engineering roles you want to grow into.',
    },
] as const;

export const CAREER_ROLES = [
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
