/** @type {import('next').NextConfig} */
const nextConfig = {
    async redirects() {
        return [
            {
                source: "/",
                has: [{ type: "host", value: "ev\\.engineer" }],
                destination: "/ev-engineer",
                permanent: true,
            },
            {
                source: "/",
                has: [{ type: "host", value: "www\\.ev\\.engineer" }],
                destination: "/ev-engineer",
                permanent: true,
            },
            // Retired sections: keep old links and search results working with 301s.
            { source: "/events", destination: "/", statusCode: 301 },
            { source: "/events/:path*", destination: "/", statusCode: 301 },
            { source: "/academy", destination: "/research-lab", statusCode: 301 },
            // Internships became the Research Lab.
            { source: "/internships", destination: "/research-lab", statusCode: 301 },
            { source: "/internships/:path*", destination: "/research-lab", statusCode: 301 },
            // The About page was retired; company details live on /contact and /policies/terms.
            { source: "/about", destination: "/", statusCode: 301 },
            // The Research Platform moved to the bottom of the Research Lab.
            { source: "/research-platform", destination: "/research-lab#flagship-research", statusCode: 301 },
            { source: "/research-platform/:path*", destination: "/research-lab#flagship-research", statusCode: 301 },
            // Satellite Engineering became the Space Station Digital Twin R&D Center (2026-11-14).
            { source: "/satellite-engineering", destination: "/space-station", statusCode: 301 },
            { source: "/satellite-engineering/:path*", destination: "/space-station", statusCode: 301 },
            { source: "/policies/refund", destination: "/policies/terms", statusCode: 301 },
            { source: "/policies/delivery", destination: "/policies/terms", statusCode: 301 },
            // Documents republished under neutral filenames (originals in archive/public-originals).
            // Sources are matched against the percent-encoded path, so encode filenames with spaces.
            ...[
                ["/public/iTelematics-FrequentlyAskedQuestions.pdf", "/documents/itelematics-faq.pdf"],
                ["/space/Space Career Opportunities - iTelematics Software Private Limited.pdf", "/documents/space-career-opportunities.pdf"],
                ["/public/EV.ENGINEER - Battery Pack Aadhaar - Krutarth S Karkala.pdf", "/documents/battery-pack-aadhaar.pdf"],
                ["/research/IEEE conference certificate - Battery Intelligence.pdf", "/research/IEEE conference certificate - Battery Intelligence - secure.pdf"],
            ].map(([source, destination]) => ({ source: encodeURI(source), destination: encodeURI(destination), statusCode: 301 })),
        ];
    },
};

export default nextConfig;
