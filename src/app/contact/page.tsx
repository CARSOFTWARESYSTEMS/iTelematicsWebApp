import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import styles from './page.module.css';
import ContactForm from '@/components/ContactForm';
import JsonLd, { pageSchema } from '@/components/JsonLd';
import { PageHero } from '@/components/site/blocks';
import { SITE } from '@/lib/site';

const PATH = '/contact';
const TITLE = 'Contact: Discuss Satellite Engineering';
const DESCRIPTION =
    'Contact iTelematics about Satellite Engineering internships, research or academic collaboration, technical reviews, consultancy or investment.';

export const metadata: Metadata = pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION });

export default function ContactPage() {
    return (
        <>
            <JsonLd data={pageSchema({ path: PATH, name: TITLE, description: DESCRIPTION, type: 'ContactPage', breadcrumbs: [{ name: 'Contact', path: PATH }] })} />
            <PageHero
                eyebrow="Contact"
                title="Discuss Satellite Engineering"
                lead="Internships, research and academic collaboration, technical reviews, industry collaboration, consultancy, the research platform, or investment and strategic discussions."
                breadcrumbs={[{ name: 'Contact', path: PATH }]}
            />

            <section className="section" id="enquiry" data-analytics-section="contact">
                <div className={`container ${styles.grid}`}>
                    <ContactForm location="contact-page" />

                    <aside className={styles.details} aria-label="Direct contact details">
                        <h2 className="h3-like">Direct contact</h2>
                        <dl>
                            <div>
                                <dt>Research, internships &amp; business</dt>
                                <dd><a href={`mailto:${SITE.email}`}>{SITE.email}</a></dd>
                            </div>
                            <div>
                                <dt>HR</dt>
                                <dd><a href={`mailto:${SITE.hrEmail}`}>{SITE.hrEmail}</a></dd>
                            </div>
                            <div>
                                <dt>Phone</dt>
                                <dd><a href={SITE.phoneHref}>{SITE.phone}</a></dd>
                            </div>
                            <div>
                                <dt>WhatsApp</dt>
                                <dd>
                                    <a href={SITE.whatsappHref} target="_blank" rel="noopener noreferrer">
                                        {SITE.phone}<span className="visually-hidden"> (opens WhatsApp in a new tab)</span>
                                    </a>
                                </dd>
                            </div>
                            <div>
                                <dt>Address</dt>
                                <dd>{SITE.legalName}<br />{SITE.address.display}</dd>
                            </div>
                            <div>
                                <dt>Corporate identity</dt>
                                <dd className="mono">CIN {SITE.cin}<br />GSTIN {SITE.gstin}<br />MSME {SITE.msme}</dd>
                            </div>
                        </dl>
                        <p className={styles.global}>
                            Researchers and engineers from India, the USA, Europe, Asia-Pacific and elsewhere are welcome.
                        </p>
                    </aside>
                </div>
            </section>
        </>
    );
}
