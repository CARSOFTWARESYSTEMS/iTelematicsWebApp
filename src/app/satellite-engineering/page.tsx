import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import Link from 'next/link';
import JsonLd, { faqSchema, pageSchema } from '@/components/JsonLd';
import { CtaBand, PageHero, ResourceCards, SystemArchitecture } from '@/components/site/blocks';
import { FLAGSHIP } from '@/lib/site';

const PATH = '/satellite-engineering';
const TITLE = 'Satellite Engineering: Energy, Telemetry & Health';
const DESCRIPTION =
    'Satellite Engineering as a system of systems: solar arrays, EPS, batteries, sensors, telemetry and spacecraft health monitoring, and how they interact.';

export const metadata: Metadata = pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION });

const QUESTIONS = [
    {
        question: 'How does satellite solar energy work?',
        answer:
            'Photovoltaic cells on the solar arrays convert sunlight into electrical power. Above the atmosphere sunlight carries about 1361 W/m². Array output depends on the angle between the panels and the Sun, cell temperature and degradation from radiation over the mission, and it drops to zero whenever the satellite is in Earth’s shadow.',
    },
    {
        question: 'Why are batteries important in satellites?',
        answer:
            'A satellite in low Earth orbit spends roughly a third of each orbit in eclipse with no solar power. The battery stores surplus energy in sunlight and carries every load through eclipse. How deeply it discharges each orbit, and at what temperature, largely determines battery lifetime and therefore mission lifetime.',
    },
    {
        question: 'What does a satellite EPS do?',
        answer:
            'The electrical power system (EPS) is the spacecraft’s power plant and switchboard. It extracts maximum power from the arrays, charges and protects the battery, regulates the power buses and distributes switched, current-limited power to each subsystem, so a fault in one load cannot take down the bus.',
    },
    {
        question: 'What satellite telemetry is monitored?',
        answer:
            'Housekeeping telemetry typically includes array voltage and current, battery voltage, current, temperature and state of charge, bus voltages, per-subsystem load currents, eclipse state, attitude data, onboard computer status and the health of each sensor. It is logged onboard and downlinked during ground-station passes.',
    },
    {
        question: 'What sensors are used on a satellite?',
        answer:
            'Power and thermal monitoring uses voltage and current sensors and thermistors. Attitude determination uses sun sensors, magnetometers, gyroscopes and sometimes star trackers. Radiation sensors track the environment, and payload sensors make the mission measurements themselves.',
    },
    {
        question: 'How does satellite health monitoring work?',
        answer:
            'Health monitoring compares telemetry against limits, models and expected behaviour for the current mission state. A sun sensor reading zero is a fault in sunlight but expected in eclipse, so good health logic uses context. It classifies each subsystem as nominal, warning or fault and supports decisions such as rescheduling loads or entering safe mode.',
    },
];

export default function SatelliteEngineeringPage() {
    return (
        <>
            <JsonLd
                data={[
                    ...pageSchema({ path: PATH, name: TITLE, description: DESCRIPTION, breadcrumbs: [{ name: 'Satellite Engineering', path: PATH }] }),
                    faqSchema(QUESTIONS),
                ]}
            />
            <PageHero
                eyebrow="Satellite Engineering"
                title="A system-of-systems engineering discipline"
                lead="Satellite Engineering is the design, analysis and verification of a spacecraft as one system: how it generates and stores energy, measures itself and its environment, communicates, and stays healthy enough to complete its mission."
                breadcrumbs={[{ name: 'Satellite Engineering', path: PATH }]}
            >
                <div className="actions hero-actions">
                    <Link href="/research-platform" className="btn btn-primary">Explore the Research Platform</Link>
                    <Link href="/internships" className="btn btn-secondary">Satellite Engineering Internships</Link>
                </div>
            </PageHero>

            <section className="section" data-analytics-section="what-why-how">
                <div className="container">
                    <div className="grid grid-2">
                        <div className="card">
                            <h2 className="h3-like">What</h2>
                            <p>
                                The engineering of spacecraft subsystems (power, attitude, communications, computing,
                                thermal, payload) and of the interfaces between them. No subsystem works alone: the power
                                system’s limits shape what the payload can do, and the sensors decide what engineers can know.
                            </p>
                        </div>
                        <div className="card">
                            <h2 className="h3-like">Why it matters</h2>
                            <p>
                                A satellite cannot be repaired after launch. Every decision about energy, margins and
                                monitoring must hold for the whole mission, so engineering evidence, not assumption, decides
                                whether a design is ready.
                            </p>
                        </div>
                        <div className="card">
                            <h2 className="h3-like">How we approach it</h2>
                            <p>
                                Through the energy path and the telemetry path. Our research platform, {FLAGSHIP}, studies how
                                a spacecraft generates, stores and manages energy, and how telemetry reveals its health.
                            </p>
                        </div>
                        <div className="card">
                            <h2 className="h3-like">Who it is for</h2>
                            <p>
                                Interns building their foundation, and researchers, professors, engineers and architects who
                                want to review, guide or contribute to the research.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="section" data-analytics-section="architecture">
                <div className="container">
                    <div className="section-head">
                        <p className="eyebrow">System architecture</p>
                        <h2>From sunlight to mission decision</h2>
                        <p>Eleven steps, two paths and one feedback loop. This is the architecture our research is organised around.</p>
                    </div>
                    <SystemArchitecture />
                </div>
            </section>

            <section className="section" data-analytics-section="questions">
                <div className="container">
                    <div className="section-head">
                        <p className="eyebrow">Core concepts</p>
                        <h2>Satellite energy, sensors and health, in plain terms</h2>
                    </div>
                    <div className="grid grid-2">
                        {QUESTIONS.map((q) => (
                            <article key={q.question} className="card">
                                <h3>{q.question}</h3>
                                <p>{q.answer}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="section" data-analytics-section="engineering-resources">
                <div className="container">
                    <div className="section-head">
                        <p className="eyebrow">Engineering learning environment</p>
                        <h2>Learn the full spacecraft, subsystem by subsystem</h2>
                        <p>Hosted on EV.ENGINEER™, the iTelematics engineering-learning platform.</p>
                    </div>
                    <ResourceCards />
                </div>
            </section>

            <CtaBand
                title="Work on these questions with us"
                text="Interns build models, simulations and engineering evidence. Researchers and engineers review, guide and contribute."
            >
                <Link href="/contact?enquiry=internship" className="btn btn-primary" data-track="internship_apply_click">Apply for Internship</Link>
                <Link href="/contact?enquiry=research" className="btn btn-secondary" data-track="research_collaboration_click">
                    Discuss Research Collaboration
                </Link>
            </CtaBand>
        </>
    );
}
