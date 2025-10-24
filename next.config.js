const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ OTIMIZAÇÃO FASE 1: Habilitar compressão automática (gzip/brotli)
  compress: true,

  // ✅ OTIMIZAÇÃO FASE 4.3: Remover console.logs em produção
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Manter error e warn
    } : false,
  },

  // ✅ OTIMIZAÇÃO FASE 4.3: Experimental optimizations
  experimental: {
    optimizeCss: true, // Minificar CSS
  },

  // ✅ OTIMIZAÇÃO: Headers customizados para cache e compressão
  async headers() {
    return [
      {
        // Aplicar a TODAS as rotas de API
        source: '/api/:path*',
        headers: [
          {
            key: 'Vary',
            value: 'Accept-Encoding',
          },
          {
            key: 'X-Content-Encoding-Options',
            value: 'br, gzip, deflate',
          },
        ],
      },
      {
        // Compressão para arquivos estáticos
        source: '/:path*.(js|css|html|svg|png|jpg|jpeg|webp|woff|woff2)',
        headers: [
          {
            key: 'Vary',
            value: 'Accept-Encoding',
          },
        ],
      },
    ];
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = withBundleAnalyzer(nextConfig);