// vue3-shortkey's options. Its listeners are on the document, so a mapped key
// fires wherever focus is, and `prevent` lists where it must not. Home's Delete
// (delete the selected screenshot, with no confirmation) and Ctrl+C used to
// fire while typing — Delete in the custom width or the filename format — and
// in a dialog over Home (Delete on a graphics profile). Controls that take no
// typing (a select, a switch, a slider) keep the shortcuts.
//
// A modal dialog or the profile menu blocks them wherever focus is, not only
// inside it: focus drops to <body> in an open dialog when the control that had
// it goes away (a profile's trash button turning into its confirm row).
export const SHORTKEY_OPTIONS = {
	prevent: [
		'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]):not([type=submit]):not([type=reset]):not([type=color]):not([type=file]):not([type=image])',
		'textarea',
		'[contenteditable]:not([contenteditable=false])',
		':root:has([role="dialog"][aria-modal="true"]) *',
		':root:has([role="menu"]) *',
	],
};
