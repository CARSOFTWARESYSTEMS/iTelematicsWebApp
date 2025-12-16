export default function JsonLd() {
    const schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Organization",
                "name": "iTelematics Software Private Limited",
                "url": "https://itelematics.com",
                "contactPoint": {
                    "@type": "ContactPoint",
                    "telephone": "+91 91082 06147",
                    "contactType": "customer service",
                    "email": "info@iTelematics.com"
                },
                "address": {
                    "@type": "PostalAddress",
                    "streetAddress": "Bhoganahalli",
                    "addressLocality": "Bangalore",
                    "postalCode": "560103",
                    "addressCountry": "IN"
                }
            },
            {
                "@type": "WebSite",
                "name": "iTelematics®",
                "url": "https://itelematics.com"
            }
        ]
    };

    return (
        <section>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
            />
        </section>
    );
}
