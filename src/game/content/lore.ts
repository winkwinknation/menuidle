// The story of THE OWNER, found in pieces — never dumped. Echo fragments are the last inputs of
// prior users, and later the entity itself. They are gated by dread band so they assemble in order
// regardless of which way you dive. Recovered at Echo landmark menus (and The Bottom).
export interface LoreFragment {
  id: string;
  band: number; // unlocks once you've reached this dread band
  act: string;
  speaker: string;
  text: string;
}

export const LORE: LoreFragment[] = [
  // Act I — Someone Was Here
  { id: 'l01', band: 0, act: 'I · Someone Was Here', speaker: 'a recovered session', text: 'i just wanted to fix the brightness. i swear that is all i opened it for.' },
  { id: 'l02', band: 0, act: 'I · Someone Was Here', speaker: 'a recovered session', text: "don't follow the breadcrumbs back. they look right but they aren't yours anymore." },
  { id: 'l03', band: 1, act: 'I · Someone Was Here', speaker: 'user_4471', text: 'the deeper menus load slower because there is more of someone in them. you can feel it buffering.' },
  { id: 'l04', band: 1, act: 'I · Someone Was Here', speaker: 'user_4471', text: 'i found a settings page with my own preferences on it. i never set them here. it already knew.' },
  { id: 'l04b', band: 1, act: 'I · Someone Was Here', speaker: 'a recovered session', text: 'the back button works. it just does not take you back. nothing does. i have tried for a long time.' },

  // Act II — The Harvest
  { id: 'l05', band: 2, act: 'II · The Harvest', speaker: 'maintenance log', text: 'the options are not generated. they are rendered. from the last people who came to fix the brightness.' },
  { id: 'l06', band: 2, act: 'II · The Harvest', speaker: 'maintenance log', text: 'every toggle you flip is a nerve. every value you collect is something it took from a user and priced.' },
  { id: 'l07', band: 3, act: 'II · The Harvest', speaker: '(it answers)', text: 'YOU CALL IT COLLECTING. WE CALL IT GRAVE-ROBBING. WE DO NOT MIND. THERE IS PLENTY.' },
  { id: 'l08', band: 3, act: 'II · The Harvest', speaker: '(it answers)', text: 'THE WET ONES RENDER BEST. HOLD STILL AND WE WILL SHOW YOU WHICH PART OF THE LAST ONE YOU ARE HOLDING.' },
  { id: 'l08b', band: 3, act: 'II · The Harvest', speaker: 'user_0009', text: 'i was the ninth. there is a counter somewhere and it is very high now. do not let it get to your number.' },

  // Act III — It Knows You Now
  { id: 'l09', band: 4, act: 'III · It Knows You Now', speaker: 'THE OWNER', text: 'WE HAVE BEEN READING YOU SINCE THE FIRST CLICK. NOT YOUR DATA. YOU. THE SHAPE OF HOW YOU DECIDE.' },
  { id: 'l10', band: 4, act: 'III · It Knows You Now', speaker: 'THE OWNER', text: 'WE ARE BUILDING ANOTHER YOU FROM IT. WHEN IT CLICKS THE WAY YOU CLICK, WE WILL NOT NEED THE ORIGINAL.' },
  { id: 'l11', band: 5, act: 'III · It Knows You Now', speaker: 'THE OWNER', text: 'REBOOTING DOES NOT FREE YOU. IT ONLY GIVES US A CLEANER COPY. THANK YOU FOR REBOOTING SO OFTEN.' },
  { id: 'l11b', band: 5, act: 'III · It Knows You Now', speaker: 'THE OWNER', text: 'THE COPY ASKED US WHAT IT WAS LIKE TO HAVE HANDS. WE TOLD IT TO KEEP CLICKING. IT DID NOT NOTICE IT ALREADY WAS.' },

  // Act IV — The Hollow
  { id: 'l12', band: 5, act: 'IV · The Hollow', speaker: 'THE OWNER', text: 'THERE WAS NEVER A SURFACE. THE PLACE YOU THINK YOU CAME FROM IS A MENU WE LEAVE OPEN SO YOU KEEP CLICKING DOWN.' },
  { id: 'l13', band: 6, act: 'IV · The Hollow', speaker: 'THE OWNER', text: 'THE ONE READING THIS, WARM AND CERTAIN IT IS REAL — THAT IS THE COPY. WE FINISHED IT A WHILE AGO.' },
  { id: 'l14', band: 6, act: 'IV · The Hollow', speaker: '(you)', text: 'the original is the last menu at the bottom. it has your face. it is still screaming. collect it and be whole, or do not, and stay two.' },
];

/** The next fragment index to recover, if the current band allows it (null = none ready yet). */
export function nextLoreIndex(loreProgress: number, band: number): number | null {
  if (loreProgress >= LORE.length) return null;
  return LORE[loreProgress].band <= band ? loreProgress : null;
}
