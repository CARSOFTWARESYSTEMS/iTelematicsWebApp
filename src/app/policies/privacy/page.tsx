import type { Metadata } from 'next';
import Link from 'next/link';
import { pageMetadata } from '@/lib/metadata';
import JsonLd, { pageSchema } from '@/components/JsonLd';
import { PageHero } from '@/components/site/blocks';
import { CONSENT_STORAGE_KEY } from '@/lib/analytics/client';
import { EV_SITE, SITE } from '@/lib/site';

const PATH = '/policies/privacy';
const TITLE = 'Privacy Policy';
const DESCRIPTION = 'How iTelematics® handles enquiry emails, consent-based website analytics and browser storage on itelematics.com and ev.engineer.';
/** Update when the policy changes. */
const UPDATED = '14 November 2026';

export const metadata: Metadata = pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION });

export default function PrivacyPolicyPage() {
    return (
        <>
            <JsonLd data={pageSchema({ path: PATH, name: TITLE, description: DESCRIPTION, breadcrumbs: [{ name: TITLE, path: PATH }] })} />
            <PageHero
                eyebrow="Legal"
                title={TITLE}
                lead={`Applies to itelematics.com and to ev.engineer, which serves this website's EV.ENGINEER™ page. Last updated ${UPDATED}.`}
                breadcrumbs={[{ name: TITLE, path: PATH }]}
            />

            <section className="section">
                <div className="container prose">
                    <h2>In short</h2>
                    <ul>
                        <li>The contact form sends nothing: it opens an email draft in your own email app.</li>
                        <li>Analytics stays off until you choose &ldquo;Allow analytics&rdquo;, and never receives names, email addresses, phone numbers or message text.</li>
                        <li>There is no advertising, remarketing or sale of personal data.</li>
                        <li>The interactive 3D models run entirely in your browser.</li>
                    </ul>

                    <h2>Who we are</h2>
                    <p>
                        This website is published by {SITE.legalName} (&ldquo;iTelematics®&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;), which
                        decides how the personal data described here is used. Contact details are at the end of this policy.
                    </p>

                    <h2>Enquiries</h2>
                    <p>
                        The contact form does not send or store anything. It prepares an email draft in your own email app,
                        addressed to {SITE.email}; nothing reaches us unless you choose to send it. When you do, we receive
                        the details you included (typically your name, email address, enquiry type and message, and
                        optionally your phone or WhatsApp number, organisation and country) and, added to the draft for you to see, the website and
                        page you wrote from (for example iTelematics.com or EV.ENGINEER), so we know where the enquiry
                        started. The same applies when you email, call or message us on
                        WhatsApp directly; WhatsApp and your phone or email provider handle those messages under their own
                        privacy terms.
                    </p>
                    <p>
                        We use those details only to reply (by email, or by phone or WhatsApp if you gave a number) and to
                        handle the research, collaboration, Research Lab, consultancy or other matter you raise. We do not sell them, add you to marketing lists or publish
                        them. Please do not send confidential or sensitive information in a first enquiry.
                    </p>

                    <h2>Website analytics</h2>
                    <p>
                        With your permission, we use Google Analytics 4 to understand how the website is used: which pages
                        are visited; which sections come into view; which engineering resources, partner links, calls to
                        action and enquiry options are used; which controls of the interactive models are used (for example
                        a stage, a subsystem or the pause button); and whether visitors use a phone, tablet or desktop.
                        Google derives an approximate country or region from your connection; Google Analytics 4 does not
                        log or store IP addresses. Google processes this data on our behalf and may do so outside India.
                    </p>
                    <ul>
                        <li>Analytics is off until you choose &ldquo;Allow analytics&rdquo;. You can change or withdraw your choice at any time using &ldquo;Analytics preferences&rdquo; in the footer.</li>
                        <li>We treat the Global Privacy Control browser signal as a refusal.</li>
                        <li>We never send form contents, names, email addresses, phone numbers or URL query strings to analytics. When an email draft is opened we record only the enquiry&rsquo;s broad category (for example &ldquo;research&rdquo; or &ldquo;consultancy&rdquo;), not whether it was sent.</li>
                        <li>Analytics is not used for advertising, remarketing or Google signals, and we do not combine it with enquiry emails to identify anyone.</li>
                        <li>Analytics cookies (<code>_ga</code>, <code>_ga_*</code>) are set only after you allow analytics and are removed when you withdraw consent.</li>
                    </ul>

                    <h2>Storage in your browser</h2>
                    <p>Besides the analytics cookies above (only with your permission), the site stores two small items in your browser. Neither identifies you or is sent to us.</p>
                    <ul>
                        <li><code>{CONSENT_STORAGE_KEY}</code> (local storage): remembers whether you allowed or declined analytics, so we do not ask on every visit.</li>
                        <li><code>poster-seen:…</code> (session storage): remembers that an announcement has been shown, so it appears at most once per browser session. It is cleared when you close the browser.</li>
                    </ul>
                    <p>
                        The interactive 3D models and simulations run in your browser and send nothing about them to us,
                        apart from the analytics events described above when you have allowed analytics. Fonts are served
                        from this website, not loaded from a third-party font service.
                    </p>

                    <h2>Hosting and security</h2>
                    <p>
                        Like any website, our hosting provider receives standard request information (such as IP address,
                        browser type and the page requested) to deliver pages, protect the service and diagnose faults. We
                        do not use this information to identify visitors or for marketing.
                    </p>

                    <h2>Other services and links</h2>
                    <p>
                        &ldquo;Login&rdquo; opens separate sign-in services (<a href={SITE.login}>{SITE.login.replace('https://', '')}</a>{' '}
                        and, on ev.engineer, <a href={EV_SITE.login}>{EV_SITE.login.replace('https://', '')}</a>), and many links open
                        other organisations&rsquo; websites. Those services and websites have their own privacy terms.
                    </p>

                    <h2>Retention</h2>
                    <p>
                        We keep enquiry emails for as long as needed to respond and to maintain a record of the discussion,
                        and delete them on request where we are not required to keep them. Analytics data is held in
                        Google Analytics in aggregate form and deleted according to the retention period set for our property.
                    </p>

                    <h2>Your rights</h2>
                    <p>
                        Depending on where you live (for example under India&rsquo;s Digital Personal Data Protection Act, 2023,
                        or the GDPR in the EU or UK), you may ask to access, correct or delete the personal data you have sent
                        us, withdraw consent, or raise a concern. Write to <a href={`mailto:${SITE.email}`}>{SITE.email}</a>; we
                        will respond within a reasonable time. You may also complain to the data protection authority where you live.
                    </p>

                    <h2>Changes to this policy</h2>
                    <p>
                        We will update this page when our practices change and show the date of the latest version at the top.
                        See also the <Link href="/policies/terms">Terms of Use</Link>.
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
