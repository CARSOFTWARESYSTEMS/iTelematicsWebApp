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
    ];
  },
};

export default nextConfig;
