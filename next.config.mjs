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
            { source: "/academy", destination: "/internships", statusCode: 301 },
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
