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
        ];
    },
};

export default nextConfig;
