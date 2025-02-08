import type { NextConfig } from "next";

const nextConfig = {
  output: 'build',
  images: {
    unoptimized: true
  }
};

module.exports = {
  reactStrictMode: true,
};
