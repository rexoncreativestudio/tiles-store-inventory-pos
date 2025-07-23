// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // CORRECTED: Array of objects for remotePatterns
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co', // Allow images from placehold.co
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co', // Allow images from Supabase Storage
      },
      // Add other image hosts if you use them (e.g., cloud storage domains)
    ],
  },
  // Add any specific configurations here if needed, but keep it minimal for now.
};

export default nextConfig;