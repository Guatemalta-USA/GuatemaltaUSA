import { defineConfig } from 'vite';
import { resolve } from 'path';
import sitemap from 'vite-plugin-sitemap';

export default defineConfig({
  base: '/',
  plugins: [
    sitemap({
      hostname: 'https://guatemaltausa.org',
      dynamicRoutes: [
        '/about',
        '/mailinglist',
        '/blog',
        '/blog/post',
        '/blog/editpost',
        '/impact/currentprojects',
        '/impact/project',
        '/impact/editproject',
        '/financialtransparency',
        '/login',
        '/privatepolicy'
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
        login: resolve(__dirname, 'login.html'),
        editpost: resolve(__dirname, 'blog/editpost.html'),
        posts: resolve(__dirname, 'blog.html'),
        post: resolve(__dirname, 'blog/post.html'),
        currentprojects: resolve(__dirname, 'impact/currentprojects.html'),
        project: resolve(__dirname, '/impact/project.html'),
        editproject: resolve(__dirname, '/impact/editproject.html'),
        financialtransparency: resolve(__dirname, 'financialtransparency.html'),
        privatepolicy: resolve(__dirname, 'private-policy.html')
      },
    },
  },
});