import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { sveltePreprocess } from 'svelte-preprocess';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    svelte({ preprocess: sveltePreprocess() }),
    dts({
      insertTypesEntry: true,
      include: ['./src/'],
      entryRoot: './src'
    })
  ],
  server: {
    open: '/test/index.html'
  },
  build: {
    sourcemap: true,
    lib: {
      entry: './src/index.ts',
      name: 'AnnotoriousConnectors',
      formats: ['es', 'umd'],
      fileName: (format) => 
        format === 'umd' ? `annotorious-connectors.js` : `annotorious-connectors.es.js` 
    },
    rollupOptions: {
      external: [
        '@annotorious/annotorious', 
        '@annotorious/openseadragon', 
        'openseadragon'
      ],
      output: {
        globals: {
          '@annotorious/annotorious': 'Annotorious',
          '@annotorious/openseadragon': 'AnnotoriousOSD', 
          'openseadragon': 'OpenSeadragon'
        },
        assetFileNames: 'annotorious-connectors.[ext]'
      }
    }
  }
});