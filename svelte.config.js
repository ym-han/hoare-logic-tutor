import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const REPO_NAME = "hoare-logic-tutor";
/** @type {import('@sveltejs/kit').Config} */
const config = {
	// https://kit.svelte.dev/docs/integrations#preprocessors
	extensions: ['.svelte'],
	preprocess: [vitePreprocess()],
	kit: {
		// adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
		// If your environment is not supported or you settled on a specific environment, switch out the adapter.
		// See https://kit.svelte.dev/docs/adapters for more information about adapters.
		
		// ==== for GH pages ==========
		adapter: adapter(),
    paths: {
      base: process.env.NODE_ENV === "production" ? `/${REPO_NAME}` : "",
    },
	}
};

export default config;
