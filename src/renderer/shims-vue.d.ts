// src/renderer/shims-vue.d.ts — type shims for non-TS assets imported by .ts files
declare module '*.vue' {
	import type { DefineComponent } from 'vue';
	const component: DefineComponent<object, object, unknown>;
	export default component;
}
declare module '*.scss';
declare module '*.css';

// Third-party Vue plugins without bundled or @types/* type declarations.
// Installed via npm; plugins are consumed through Vue's `app.use(plugin)` which
// accepts any (typed as Plugin). Loose shapes are acceptable per D-12-08.
declare module 'vue-simple-context-menu';
declare module 'vue3-shortkey';
declare module 'vue3-markdown-it';
