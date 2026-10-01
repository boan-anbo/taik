import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  const localEnv = loadEnv(mode, __dirname, '');
  const webEnv = loadEnv(mode, path.resolve(__dirname, '..', 'web'), '');
  const sonioxApiKey =
    localEnv.SONIOX_API_KEY ||
    localEnv.VITE_SONIOX_API_KEY ||
    webEnv.VITE_SONIOX_API_KEY ||
    process.env.SONIOX_API_KEY ||
    process.env.VITE_SONIOX_API_KEY ||
    '';

  return {
    root: path.resolve(__dirname, 'src/renderer'),
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src/renderer'),
      },
    },
    base: './',
    server: {
      port: 5174,
      strictPort: true,
      host: '127.0.0.1',
    },
    define: isDev
      ? {
          'import.meta.env.SONIOX_API_KEY': JSON.stringify(sonioxApiKey),
          'import.meta.env.VITE_SONIOX_API_KEY': JSON.stringify(sonioxApiKey),
        }
      : undefined,
    build: {
      outDir: path.resolve(__dirname, 'dist/renderer'),
      emptyOutDir: true,
      target: 'chrome120',
    },
  };
});
