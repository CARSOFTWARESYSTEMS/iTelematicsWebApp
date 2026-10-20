import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import Link from 'next/link';
import styles from './page.module.css';
import JsonLd, { faqSchema, ORG_ID, pageSchema } from '@/components/JsonLd';
import { CtaBand, PageHero } from '@/components/site/blocks';
import { FLAGSHIP, SITE } from '@/lib/site';

const PATH = '/internships';
const TITLE = 'Satellite Engineering Internship';
const DESCRIPTION =
    'Research-based Satellite Engineering internships: model, simulate and validate spacecraft energy, battery, EPS, telemetry and health systems.';

export const metadata: Metadata = pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION });

const LOOP = ['Learn', 'Model', 'Simulate', 'Build', 'Measure', 'Analyse', 'Validate', 'Document'];

const STAGES = [
    ['Learn', 'Understand satellite fundamentals: mission, orbit, subsystems and the energy path.'],
    ['Define', 'Choose a research question with a clear, testable outcome.'],
    ['Model', 'Build an engineering model with stated assumptions.'],
    ['Simulate', 'Run nominal and abnormal scenarios.'],
    ['Instrument', 'Identify the sensors and telemetry needed to observe the behaviour.'],
    ['Analyse', 'Interpret results and quantify uncertainty.'],
    ['Validate', 'Compare against assumptions and available reference information.'],
    ['Document', 'Write it up as engineering evidence others can review.'],
    ['Review', 'Defend the work in a technical review.'],
    ['Demonstrate', 'Present a final research demonstration.'],
] as const;

const TOPICS = [
    ['Satellite battery energy and health intelligence research', 'SOC estimation, depth of discharge, temperature effects and early indicators of degradation.'],
    ['Satellite telemetry acquisition and sensor-data engineering', 'Which parameters to sample, at what rate, and how to detect missing or implausible data.'],
    ['AI-assisted spacecraft energy anomaly detection research', 'Separating genuine subsystem faults from sensor artefacts and expected eclipse behaviour.'],
    ['Eclipse energy and power-budget analysis', 'How β angle, eclipse duration and load schedules drive the energy margin.'],
    ['Load prioritisation and safe-mode logic', 'Which loads to shed, when, and what telemetry should trigger the decision.'],
    ['Satellite digital twin for energy behaviour', 'Simulation that tracks telemetry, with its limits and assumptions stated.'],
] as const;

const OUTPUTS = ['A defined research question', 'An engineering model with documented assumptions', 'Simulation results for nominal and abnormal cases', 'A telemetry and instrumentation plan', 'A technical report and review record', 'A final demonstration'];

const FAQ = [
    {
        question: 'Is this a software internship?',
        answer:
            'No. Software is a tool, but the work is Satellite Engineering: spacecraft energy, batteries, the EPS, sensors, telemetry and health. Coding, data analysis or AI are used only where they serve a Satellite Engineering research question.',
    },
    {
        question: 'Do I need prior space experience?',
        answer:
            'No prior space project is required. A foundation in engineering or physics, comfort with mathematics and a willingness to document your reasoning matter more. The first stage covers satellite fundamentals.',
    },
    {
        question: 'Will I work on flight hardware?',
        answer:
            'No. Research uses reference models, simulation and educational engineering hardware. Nothing in the programme is flight-qualified, and results are labelled with their maturity.',
    },
    {
        question: 'What will I produce?',
        answer:
            'Engineering evidence: a research question, a model with stated assumptions, simulation results, a telemetry plan, a technical report and a final demonstration that has been through technical review.',
    },
    {
        question: 'How long is the internship, and is it remote?',
        answer:
            'Duration, format and availability are confirmed for each cohort. Mention your preferred timing and location in your enquiry and we will tell you what is currently available.',
    },
];

export default function InternshipsPage() {
    return (
        <>
            <JsonLd
                data={[
                    ...pageSchema({ path: PATH, name: TITLE, description: DESCRIPTION, breadcrumbs: [{ name: 'Internships', path: PATH }] }),
                    {
                        '@type': 'EducationalOccupationalProgram',
                        name: 'Satellite Engineering Internship',
                        description: DESCRIPTION,
                        url: `${SITE.url}${PATH}`,
                        provider: { '@id': ORG_ID },
                        programType: 'Internship',
                    },
                    faqSchema(FAQ),
                ]}
            />
            <PageHero
                eyebrow="Satellite Engineering internships"
                title="Learn Satellite Engineering through research"
                lead={`Interns work on real engineering questions within ${FLAGSHIP}: spacecraft energy, batteries, the EPS, sensors, telemetry and system health.`}
                breadcrumbs={[{ name: 'Internships', path: PATH }]}
            >
                <ol className={styles.loop} aria-label="How interns learn">
                    {LOOP.map((step) => <li key={step}>{step}</li>)}
                </ol>
                <div className="actions hero-actions">
                    <Link href="/contact?enquiry=internship" className="btn btn-primary" data-track="internship_apply_click">Apply for Internship</Link>
                    <Link href="/research-platform#open-questions" className="btn btn-secondary">See open research questions</Link>
                </div>
            </PageHero>

            <section className="section" data-analytics-section="who">
                <div className="container">
                    <div className="grid grid-2">
                        <div className="card">
                            <h2 className="h3-like">Who it is for</h2>
                            <p>
                                Students and graduates in aerospace, electrical, electronics, mechanical, computer science or
                                physics who want to understand how a spacecraft actually works, not only how to code for one.
                            </p>
                        </div>
                        <div className="card">
                            <h2 className="h3-like">What makes it different</h2>
                            <p>
                                Every intern owns a research question, works with stated assumptions and produces evidence that
                                survives a technical review. Students are the talent pipeline of our R&amp;D, not an audience for it.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="section" data-analytics-section="research-model">
                <div className="container">
                    <div className="section-head">
                        <p className="eyebrow">Internship research model</p>
                        <h2>Ten stages from fundamentals to demonstration</h2>
                    </div>
                    <ol className={styles.stages}>
                        {STAGES.map(([name, text], i) => (
                            <li key={name}>
                                <span className="mono">Stage {String(i + 1).padStart(2, '0')}</span>
                                <h3>{name}</h3>
                                <p>{text}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            <section className="section" data-analytics-section="topics">
                <div className="container">
                    <div className="section-head">
                        <p className="eyebrow">Example research topics</p>
                        <h2>Every topic is a Satellite Engineering problem</h2>
                    </div>
                    <div className="grid grid-3">
                        {TOPICS.map(([title, text]) => (
                            <article key={title} className="card">
                                <h3>{title}</h3>
                                <p>{text}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="section" data-analytics-section="outputs">
                <div className={`container ${styles.split}`}>
                    <div>
                        <p className="eyebrow">What you leave with</p>
                        <h2>Engineering evidence</h2>
                        <ul className={styles.outputs}>
                            {OUTPUTS.map((o) => <li key={o}>{o}</li>)}
                        </ul>
                    </div>
                    <div>
                        <p className="eyebrow">How to apply</p>
                        <h2>Three steps</h2>
                        <ol className={styles.apply}>
                            <li><strong>Send an internship enquiry</strong> with your background and the area that interests you.</li>
                            <li><strong>Technical conversation</strong> about fundamentals, motivation and possible research questions.</li>
                            <li><strong>Agree a research question</strong>, a plan and the review points.</li>
                        </ol>
                    </div>
                </div>
            </section>

            <section className="section" data-analytics-section="faq">
                <div className="container">
                    <div className="section-head">
                        <p className="eyebrow">Questions</p>
                        <h2>Internship FAQ</h2>
                    </div>
                    <div className="grid grid-2">
                        {FAQ.map((f) => (
                            <article key={f.question} className="card">
                                <h3>{f.question}</h3>
                                <p>{f.answer}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <CtaBand
                title="Build your Satellite Engineering foundation"
                text="Tell us your background and what you want to investigate. We reply by email."
            >
                <Link href="/contact?enquiry=internship" className="btn btn-primary" data-track="internship_apply_click">Apply for Internship</Link>
                <Link href="/satellite-engineering" className="btn btn-secondary">Explore Satellite Engineering</Link>
            </CtaBand>
        </>
    );
}
