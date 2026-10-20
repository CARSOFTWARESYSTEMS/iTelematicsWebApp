import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import JsonLd, { pageSchema } from '@/components/JsonLd';
import { PageHero } from '@/components/site/blocks';
import { SITE } from '@/lib/site';

const PATH = '/policies/privacy';
const TITLE = 'Privacy Policy';
const DESCRIPTION = 'How iTelematics Software Private Limited handles enquiry details and website analytics on itelematics.com.';

export const metadata: Metadata = pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION });

export default function PrivacyPolicyPage() {
    return (
        <>
            <JsonLd data={pageSchema({ path: PATH, name: TITLE, description: DESCRIPTION, breadcrumbs: [{ name: TITLE, path: PATH }] })} />
            <PageHero eyebrow="Legal" title={TITLE} lead="Applies to itelematics.com." breadcrumbs={[{ name: TITLE, path: PATH }]} />

            <section className="section">
                <div className="container prose">
                    <h2>Enquiries</h2>
                    <p>
                        The contact form does not send or store anything. It prepares an email draft in your own email app,
                        addressed to {SITE.email}; nothing reaches us unless you choose to send it. When you do, we receive
                        the details you included (typically your name, email address, enquiry type and message, and
                        optionally your organisation and country).
                    </p>
                    <p>
                        We use those details only to reply and to handle the internship, research, collaboration or
                        consultancy matter you raise. We do not sell them, add you to marketing lists or publish them.
                    </p>

                    <h2>Website analytics</h2>
                    <p>
                        With your permission, we use Google Analytics 4 to understand how the website is used: which pages
                        are visited, which engineering resources, partner links and enquiry options are opened, and whether
                        visitors use a phone, tablet or desktop. Google derives an approximate country or region from your
                        connection; Google Analytics 4 does not log or store IP addresses.
                    </p>
                    <ul>
                        <li>Analytics is off until you choose “Allow analytics”. You can change or withdraw your choice at any time using “Analytics preferences” in the footer.</li>
                        <li>We treat the Global Privacy Control browser signal as a refusal.</li>
                        <li>We never send form contents, names, email addresses, phone numbers or URL query strings to analytics. When an email draft is opened we record only the enquiry’s broad category (for example “internship” or “research”), not whether it was sent.</li>
                        <li>Analytics is not used for advertising, remarketing or Google signals.</li>
                        <li>Analytics cookies (<code>_ga</code>, <code>_ga_*</code>) are set only after you allow analytics and are removed when you withdraw consent.</li>
                    </ul>

                    <h2>Retention</h2>
                    <p>
                        We keep enquiry emails for as long as needed to respond and to maintain a record of the discussion,
                        and delete them on request where we are not required to keep them.
                    </p>

                    <h2>Your rights</h2>
                    <p>
                        You may ask to access, correct or delete the personal data you have sent us by writing to{' '}
                        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
                    </p>

                    <h2>Contact</h2>
                    <p>
                        {SITE.legalName}
                        <br />
                        {SITE.address.display}
                        <br />
                        Email: <a href={`mailto:${SITE.email}`}>{SITE.email}</a> · Phone: <a href={SITE.phoneHref}>{SITE.phone}</a>
                    </p>
                </div>
            </section>
        </>
    );
}
