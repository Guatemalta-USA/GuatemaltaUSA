import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        login: resolve(__dirname, 'login.html'),
        'mailing-list': resolve(__dirname, 'mailing-list.html'),
        notfound: resolve(__dirname, '404.html'),
      },
    },
  },
});