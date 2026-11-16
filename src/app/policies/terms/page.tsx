import type { Metadata } from 'next';
import Link from 'next/link';
import { pageMetadata } from '@/lib/metadata';
import JsonLd, { pageSchema } from '@/components/JsonLd';
import { PageHero } from '@/components/site/blocks';
import { SITE } from '@/lib/site';
import ExternalLink from '@/components/site/ExternalLink';

const PATH = '/policies/terms';
const TITLE = 'Terms of Use';
const DESCRIPTION = 'Terms of use for itelematics.com: technical content, simulations, forward-looking statements, research participation, intellectual property and governing law.';
/** Update when the terms change. */
const UPDATED = '16 November 2026';

export const metadata: Metadata = pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION });

export default function TermsPage() {
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
                    <h2>About this website</h2>
                    <p>
                        This website is published by {SITE.legalName} (&ldquo;iTelematics®&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) to
                        describe its Space Station Digital Twin research and development, its foundational spacecraft energy and
                        telemetry research, the Research Lab, consultancy and services, and its engineering ecosystem. By using
                        the website you accept these terms.
                    </p>

                    <h2>Technical content and simulations</h2>
                    <p>
                        Engineering content on this site, including models, equations, reference cases, interactive 3D models
                        and telemetry values, is provided for engineering reference and research. In particular:
                    </p>
                    <ul>
                        <li>Values described as illustrative, simulated or reference are not flight data and are not specifications for any real spacecraft or space station.</li>
                        <li>The space station shown on the site (Station Reference Case SRC-1) is a conceptual station, not modelled on any real station, and its parameters are illustrative and unvalidated.</li>
                        <li>The interactive models are simulations. They are not operational digital twins and are not connected to any real system; faults shown in them are simulated.</li>
                        <li>Maturity labels describe the current state of each item. Nothing on this site is flight-qualified or certified for operational or crewed use.</li>
                    </ul>
                    <p>
                        The content is not professional engineering advice. Do not rely on it for design, safety, procurement or
                        operational decisions without your own independent verification.
                    </p>

                    <h2>Plans and forward-looking statements</h2>
                    <p>
                        The vision, goals, objectives, milestones, programmes, roadmap and deliverables described on this site
                        express our current intentions. Items marked proposed, planned or concept do not yet exist, and dates are
                        planning targets, not commitments; they depend on research results, people and funding and may change.
                    </p>

                    <h2>Research participation and competency pathways</h2>
                    <p>
                        Research Lab participation, competency pathways and descriptions of roles are capability descriptions,
                        not job vacancies or offers. Taking part does not imply employment, funding, certification or university
                        affiliation. Any collaboration, including scope, confidentiality and ownership of results, is agreed
                        separately in writing.
                    </p>

                    <h2>Enquiries and consultancy</h2>
                    <p>
                        Descriptions of consultancy, workshops and services are information, not an offer. Services are provided
                        only under a separate written agreement. Please do not send confidential information in a first enquiry;
                        sending an idea or document does not create a confidentiality obligation or a collaboration unless we
                        agree one in writing.
                    </p>

                    <h2>Third-party websites and services</h2>
                    <p>
                        Links to ecosystem organisations and external resources open websites we do not control, and
                        &ldquo;Login&rdquo; opens separate sign-in services with their own terms. Their content, terms and privacy
                        practices are their own. Listing an organisation does not mean it endorses iTelematics®, and
                        relationships are described as they currently stand.
                    </p>

                    <h2>Intellectual property</h2>
                    <p>
                        All content on this site, including text, models, images and code, is the property of iTelematics® or its
                        licensors. You may quote brief extracts with attribution and a link for research, review or reporting, and
                        search engines and AI assistants may index and summarise public pages with attribution. Any other
                        reproduction needs our permission. iTelematics® is a trademark of {SITE.legalName}; other names and marks
                        shown on the site belong to their respective owners.
                    </p>

                    <h2 id="image-credits">Image credits</h2>
                    <p>Third-party imagery and typefaces keep their own terms:</p>
                    <ul>
                        <li>
                            Earth imagery in the interactive 3D models (daytime surface, night lights and clouds): NASA Visible Earth and NASA
                            Earth Observatory, public domain. Some map layers are as distributed by{' '}
                            <ExternalLink href="https://www.solarsystemscope.com/textures/" trackName="Image credits: Solar System Scope">
                                Solar System Scope
                            </ExternalLink>{' '}
                            under{' '}
                            <ExternalLink href="https://creativecommons.org/licenses/by/4.0/" trackName="Image credits: CC BY 4.0">
                                CC BY 4.0
                            </ExternalLink>
                            . Use of NASA imagery follows the{' '}
                            <ExternalLink href="https://www.nasa.gov/nasa-brand-center/images-and-media/" trackName="Image credits: NASA media guidelines">
                                NASA media guidelines
                            </ExternalLink>{' '}
                            and does not imply endorsement by NASA.
                        </li>
                        <li>
                            Maps of the Sun, Mercury, Venus, the Moon, Mars, Jupiter, Saturn and its rings, Uranus and Neptune in the Solar System experience:{' '}
                            <ExternalLink href="https://www.solarsystemscope.com/textures/" trackName="Image credits: Solar System Scope planets">
                                Solar System Scope
                            </ExternalLink>
                            , CC BY 4.0, recompressed. Maps of Pluto, Io, Europa, Ganymede and Callisto:{' '}
                            <ExternalLink href="https://astrogeology.usgs.gov/search?pmi-target=pluto" trackName="Image credits: USGS Astrogeology">
                                USGS Astrogeology Science Center
                            </ExternalLink>{' '}
                            global mosaics from NASA New Horizons, Galileo and Voyager images, public domain; downsampled, with colour approximated
                            for the greyscale mosaics. The sky, ground, concrete and metal surfaces at the launch site:{' '}
                            <ExternalLink href="https://polyhaven.com/" trackName="Image credits: Poly Haven">
                                Poly Haven
                            </ExternalLink>
                            , CC0.
                        </li>
                        <li>Typefaces: Inter and JetBrains Mono, under the SIL Open Font License.</li>
                    </ul>
                    <p>
                        Still images of the 3D models (previews and share images) are rendered by iTelematics® from those models. Posters
                        and documents published for ecosystem organisations are supplied by those organisations.
                    </p>

                    <h2>Acceptable use</h2>
                    <p>
                        Do not attempt to disrupt the website, gain unauthorised access to it or misrepresent your affiliation with
                        us. Automated access is welcome where it follows our robots.txt and does not overload the site.
                    </p>

                    <h2>Availability</h2>
                    <p>
                        The website is provided as is. We may change, update or remove content at any time and do not guarantee
                        that it is always available, complete or free of errors.
                    </p>

                    <h2>Limitation of liability</h2>
                    <p>
                        iTelematics® is not liable for indirect or consequential loss arising from use of this website or its
                        content, to the extent permitted by applicable law.
                    </p>

                    <h2>Governing law</h2>
                    <p>These terms are governed by the laws of India, with courts in Bangalore, Karnataka having jurisdiction.</p>

                    <h2>Changes to these terms</h2>
                    <p>
                        We may update these terms; the date of the latest version is shown at the top. See also the{' '}
                        <Link href="/policies/privacy">Privacy Policy</Link>.
                    </p>

                    <h2>Contact</h2>
                    <p>
                        {SITE.legalName}
                        <br />
                        <span className="nowrap">CIN {SITE.cin}</span> · <span className="nowrap">GSTIN {SITE.gstin}</span> ·{' '}
                        <span className="nowrap">MSME {SITE.msme}</span>
                        <br />
                        {SITE.address.display}
                        <br />
                        Email: <a href={`mailto:${SITE.email}`}>{SITE.email}</a> · Phone: <a href={SITE.phoneHref} className="nowrap">{SITE.phone}</a>
                    </p>
                </div>
            </section>
        </>
    );
}
