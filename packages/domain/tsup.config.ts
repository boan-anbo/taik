import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/stores/index.ts',
    'src/hooks/index.ts',
    'src/types/index.ts',
  ],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'zustand', '@taik/capabilities', '@taik/speech-engine'],
});
