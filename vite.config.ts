import { defineConfig } from 'vite';
import { resolve } from 'path';
import sitemap from 'vite-plugin-sitemap';

export default defineConfig({
  base: '/',
  plugins: [
    sitemap({
      hostname: 'https://guatemaltausa.org',
      outDir: 'dist',
      generateRobotsTxt: true,
      dynamicRoutes: [],
      exclude: [
        '/login',
        '/generate',
        '/blog/editpost',
        '/impact/editproject'
      ],
      robots: [
        {
          userAgent: '*',
          disallow: [
            '/login',
            '/generate',
            '/admin',
            '/blog/editpost',
            '/impact/editproject'
          ],
        }
      ]
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        mailinglist: resolve(__dirname, 'mailinglist.html'),
        login: resolve(__dirname, 'login.html'),
        admain: resolve(__dirname, 'admin.html'),
        editpost: resolve(__dirname, 'blog/editpost.html'),
        posts: resolve(__dirname, 'blog.html'),
        post: resolve(__dirname, 'blog/post.html'),
        currentprojects: resolve(__dirname, 'impact/currentprojects.html'),
        project: resolve(__dirname, 'impact/project.html'),
        editproject: resolve(__dirname, 'impact/editproject.html'),
        financialtransparency: resolve(__dirname, 'financialtransparency.html'),
        privatepolicy: resolve(__dirname, 'privatepolicy.html'),
        donate: resolve(__dirname, 'donate.html'),
        generate: resolve(__dirname, 'generate.html'),
        sponsorachild: resolve(__dirname, 'sponsor-a-child.html')
      },
      output: {
        manualChunks(id) {
          // If the asset path is inside node_modules, separate it
          if (id.includes('node_modules')) {
            // Group all firebase packages together into a 'firebase' chunk
            if (id.includes('firebase')) {
              return 'firebase';
            }
            // Group everything else into a general 'vendor' chunk
            return 'vendor';
          }
        }
      }
    },
  },
});