/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'build',
  images: {
    unoptimized: true
  }
};

module.exports = {
    distDir: '.next',
  };