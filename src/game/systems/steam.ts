// Renderer-side Steam stub. Real integration would bridge to steamworks.js in the main
// process behind one interface; for now this records intent so the rest of the game can
// fire achievements without caring whether Steam is present.
let bridge: ((id: string) => void) | null = null;

/** Allows a future Electron/steamworks bridge to register itself. */
export function setSteamBridge(fn: (id: string) => void): void {
  bridge = fn;
}

export function steamUnlock(id: string): void {
  if (bridge) bridge(id);
  else if (typeof console !== 'undefined') console.debug('[steam] unlock achievement:', id);
}
