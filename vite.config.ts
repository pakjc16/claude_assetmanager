import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
      server: {
        port: 3100,
        host: '0.0.0.0',
        watch: {
          usePolling: true,  // Docker 볼륨 마운트에서 파일 변경 감지 필수
        },
        proxy: {
          // VWorld 주소검색 API
          '/api/vworld': {
            target: 'https://api.vworld.kr',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/vworld/, ''),
            secure: false,
            configure: (proxy) => {
              proxy.on('error', (err) => {
                console.log('proxy error', err);
              });
              proxy.on('proxyReq', (proxyReq, req) => {
                console.log('Proxying:', req.url);
              });
              proxy.on('proxyRes', (proxyRes, req) => {
                console.log('Received:', proxyRes.statusCode, req.url);
              });
            },
          },
          // VWorld 토지임야목록조회 API
          '/api/land': {
            target: 'https://api.vworld.kr',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/land/, '/ned/data'),
            secure: false,
            configure: (proxy) => {
              proxy.on('error', (err) => {
                console.log('land proxy error', err);
              });
              proxy.on('proxyReq', (proxyReq, req) => {
                console.log('Land API Proxying:', req.url);
              });
              proxy.on('proxyRes', (proxyRes, req) => {
                console.log('Land API Received:', proxyRes.statusCode, req.url);
              });
            },
          },
          // data.go.kr 국가승강기정보 API
          '/api/elevator': {
            target: 'https://apis.data.go.kr',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/elevator/, '/B553664'),
            secure: false,
            configure: (proxy) => {
              proxy.on('error', (err) => {
                console.log('elevator proxy error', err);
              });
              proxy.on('proxyReq', (proxyReq, req) => {
                console.log('Elevator API Proxying:', req.url);
              });
              proxy.on('proxyRes', (proxyRes, req) => {
                console.log('Elevator API Received:', proxyRes.statusCode, req.url);
              });
            },
          },
          // data.go.kr 건축물대장 API
          '/api/building': {
            target: 'https://apis.data.go.kr',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/building/, '/1613000/BldRgstHubService'),
            secure: false,
            configure: (proxy) => {
              proxy.on('error', (err) => {
                console.log('building proxy error', err);
              });
              proxy.on('proxyReq', (proxyReq, req) => {
                console.log('Building API Proxying:', req.url);
              });
              proxy.on('proxyRes', (proxyRes, req) => {
                console.log('Building API Received:', proxyRes.statusCode, req.url);
              });
            },
          },
          // 국세청 사업자등록 상태조회 API (api.odcloud.kr)
          '/api/nts-businessman': {
            target: 'https://api.odcloud.kr',
            changeOrigin: true,
            secure: false,
            configure: (proxy) => {
              proxy.on('error', (err) => {
                console.log('nts proxy error', err);
              });
              proxy.on('proxyReq', (proxyReq, req) => {
                console.log('NTS API Proxying:', req.url);
              });
              proxy.on('proxyRes', (proxyRes, req) => {
                console.log('NTS API Received:', proxyRes.statusCode, req.url);
              });
            },
          },
          // Google Cloud Vision OCR API
          '/api/vision': {
            target: 'https://vision.googleapis.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/vision/, ''),
            secure: false,
            configure: (proxy) => {
              proxy.on('error', (err) => {
                console.log('vision proxy error', err);
              });
              proxy.on('proxyReq', (proxyReq, req) => {
                console.log('Vision API Proxying:', req.url);
              });
              proxy.on('proxyRes', (proxyRes, req) => {
                console.log('Vision API Received:', proxyRes.statusCode, req.url);
              });
            },
          },
        },
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
});
