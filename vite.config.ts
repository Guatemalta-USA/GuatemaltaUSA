import { defineConfig } from 'vite';
import { resolve } from 'path';
import sitemap from 'vite-plugin-sitemap'; // Make sure to npm install vite-plugin-sitemap -D

export default defineConfig({
  base: '/',
  plugins: [
    sitemap({
      hostname: 'https://guatemaltausa.org',
      dynamicRoutes: [
        '/about',
        '/mailinglist',
        '/login'
      ],
    }),
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        mailinglist: resolve(__dirname, 'mailinglist.html'),
        login: resolve(__dirname, 'login.html')
      },
    },
  },
});