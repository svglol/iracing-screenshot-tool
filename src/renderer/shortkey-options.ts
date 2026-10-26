// vue3-shortkey's options. Its listeners are on the document, so a mapped key
// fires wherever focus is; `prevent` keeps them out of text fields. Delete in
// the custom width or the filename format used to delete the selected
// screenshot, and Ctrl+C copied the screenshot instead of the text.
export const SHORTKEY_OPTIONS = {
	prevent: ['input', 'textarea', 'select', '[contenteditable]'],
};
