// Selectable visual skins. The actual palettes live in CSS as `:root[data-theme="…"]`
// overrides of the design tokens; this just enumerates the choices.
export type ThemeId = 'corporate' | 'retro' | 'neon';

export const THEMES: { id: ThemeId; name: string }[] = [
  { id: 'corporate', name: 'Corporate' },
  { id: 'retro', name: 'Retro OS' },
  { id: 'neon', name: 'Neon' },
];
