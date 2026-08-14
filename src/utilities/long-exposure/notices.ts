// Notice-list assembly helpers for the long-exposure panel.
//
// Pure and separate from the component so the one rule that matters here — the
// same sentence is never shown twice — is unit-testable without mounting a
// 900-line SFC that requires config and electron at module scope.

export interface Notice {
	level: string;
	text: string;
}

/**
 * Collapse notices that say exactly the same thing, keeping the first.
 *
 * The panel assembles its list from two sources that legitimately overlap:
 * `validatePlan`'s verdict on the CURRENT settings (the live pre-flight), and the
 * warnings carried back by the last completed capture — which come from the same
 * validatePlan call on the same recipe. `lastResult` is only cleared when the
 * next capture starts, not when a setting changes, so after any completed shot
 * every plan warning was rendered twice: "This shutter is short enough that only
 * one frame will land inside it…" appearing once, then again immediately below.
 *
 * First occurrence wins so the live pre-flight keeps its position at the top of
 * the list, and so a notice that is both an error and a warning keeps the
 * higher severity (errors are pushed first).
 *
 * Deliberately keyed on TEXT, not on level or source: two notices reading
 * identically are indistinguishable to the person reading them, whatever
 * produced them. Runtime-only outcome warnings — a sample shortfall, a bracket
 * shortfall — word themselves differently and are unaffected.
 */
export function dedupeNotices<T extends Notice>(notices: T[]): T[] {
	const seen = new Set<string>();
	const result: T[] = [];

	for (const notice of notices) {
		if (seen.has(notice.text)) {
			continue;
		}
		seen.add(notice.text);
		result.push(notice);
	}

	return result;
}
