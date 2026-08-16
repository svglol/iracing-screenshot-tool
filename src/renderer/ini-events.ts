// The one cross-page sync contract for iRacing's renderer ini files: anything
// in this renderer that writes one (the config editor's save, the profiles
// dialog's apply) dispatches this on `window`, and anything displaying ini
// state (the title-bar configuration picker, the config editor) listens and
// refreshes. Main-process writes don't need it — those are caught by the
// existing focus/iracing-status refreshes.
export const INI_CHANGED_EVENT = 'renderer-ini-changed';
