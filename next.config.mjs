/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // Only when request host is ev.engineer (or www.ev.engineer)
      {
        source: "/",
        has: [{ type: "host", value: "ev\\.engineer" }],
        destination: "/ev-engineer",
      },
      {
        source: "/",
        has: [{ type: "host", value: "www\\.ev\\.engineer" }],
        destination: "/ev-engineer",
      },
    ];
  },
};

export default nextConfig;
