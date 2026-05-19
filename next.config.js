/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Monaco Editor loads from CDN via @monaco-editor/react loader
  // No webpack worker configuration needed
};

module.exports = nextConfig;
