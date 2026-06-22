import {defineConfig, loadEnv} from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import {componentTagger} from "pp-tagger";
import viteCompression from "vite-plugin-compression";

// DDoS Guard требует двусторонний app-level keepalive чаще 30s.
// Сервер: text-frame {type:'ping'} каждые 5-9s (рандом — чтобы DDoS Guard
// не триггерился на одинаковые интервалы; Vite-клиент игнорирует, case "ping": break;).
// Клиент: server.hmr.timeout = 7000 ниже понижает pingInterval @vite/client до 7s.
const hmrKeepalive = {
    name: 'hmr-ws-keepalive',
    configureServer(server: import("vite").ViteDevServer) {
        let timer: ReturnType<typeof setTimeout> | null = null;
        const tick = () => {
            server.ws?.send({type: 'ping'});
            timer = setTimeout(tick, 5000 + Math.floor(Math.random() * 4000));
        };
        timer = setTimeout(tick, 5000 + Math.floor(Math.random() * 4000));
        server.httpServer?.on('close', () => {
            if (timer) clearTimeout(timer);
        });
    },
};

// https://vitejs.dev/config/
export default defineConfig(({mode}) => {
    // Load env variables based on `mode` in the current working directory.
    const env = loadEnv(mode, process.cwd(), '');
    const supabaseApiUrl = env.VITE_SUPABASE_API_URL || 'http://localhost:54321';

    return {
        plugins: [
            react(),
            hmrKeepalive,
            mode === 'development' &&
            componentTagger(),
            // P0: Pre-compress JS/CSS to .gz files at build time.
            // nginx gzip_static on; will serve these without CPU overhead.
            mode === 'production' && viteCompression({
                algorithm: 'gzip',
                ext: '.gz',
                threshold: 1024,      // Only compress files > 1KB
                deleteOriginFile: false,
            }),
        ].filter(Boolean),
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
            },
        },
        build: {
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        if (id.includes('node_modules')) {
                            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                                return 'vendor-react';
                            }
                            if (id.includes('@tanstack') || id.includes('query-core')) {
                                return 'vendor-query';
                            }
                        }
                    }
                }
            }
        },
        server: {
            host: '0.0.0.0',
            port: 5173,
            allowedHosts: true,
            hmr: {
                overlay: false, // Disables the error overlay if you only want console errors
                timeout: 7000, // pingInterval @vite/client — нужен <30s для DDoS Guard
            },
            proxy: {
                '/supabase-api': {
                    target: supabaseApiUrl,
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/supabase-api/, '')
                }
            }
        },
    };
});

