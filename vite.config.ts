import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
// import type { ViteDevServer } from 'vite';

export default defineConfig({
	build: {
		target: 'esnext' //browsers can handle the latest ES features
	},
	plugins: [
		sveltekit(),
		// viteServerConfig(),
	],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});



/*---------------------------------------------------------------
    Superseded but keeping around in comments
    because it's a good reference
-----------------------------------------------------------------
Not using viteServerConfig,
because using service worker
(because deploying on GH Pages,
where we cannot control the HTTP headers that the server returns)
*/
// /**
// 	* Z3 uses `SharedArrayBuffer`
// 	* which requires either HTTPS or localhost, and it requires cross origin isolation.
// 	* So we're enabling the CORS headers here for development mode.
// 	* Note that the production server will need HTTPS and CORS headers set up correctly.
// 	* If you cannot control the HTTP headers that your production server sends back (like on GitHub pages),
// 	* then there's a workaround using a service worker. See https://dev.to/stefnotch/enabling-coop-coep-without-touching-the-server-2d3n
// 	*/
// const viteServerConfig = (): import('vite').Plugin => ({
// 	name: 'add-headers',
// 	// eslint-disable-next-line  @typescript-eslint/no-explicit-any
// 	configureServer: (server: ViteDevServer) => {
// 		// eslint-disable-next-line  @typescript-eslint/no-explicit-any
// 		server.middlewares.use((_req, res, next) => {
// 			res.setHeader('Access-Control-Allow-Origin', '*');
// 			res.setHeader('Access-Control-Allow-Methods', 'GET');
// 			res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
// 			res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
// 			next();
// 		});
// 	}
// });
