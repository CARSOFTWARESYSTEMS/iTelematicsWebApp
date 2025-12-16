/** @type {import('next').NextConfig} */
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/",
        destination: "/ev-engineer (or /ev-engineer)",
      },
    ];
  },
};

export default nextConfig;
