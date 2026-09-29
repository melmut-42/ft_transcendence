import type { Team } from '@shared/types';

/** The turn heading: 23px in the team's color on phones and tablets, 36px on desktop. */

export const heading: string =
  'text-center text-2xl leading-[37px] font-black uppercase desktop:text-[36px] ' +
  'desktop:leading-none desktop:text-text-ink';

export const compactTone: Record<Team, string> = {
  RED: 'text-secondary-deep',
  BLUE: 'text-primary',
};

export const wideTone: Record<Team, string> = {
  RED: 'desktop:text-secondary-deep',
  BLUE: 'desktop:text-primary',
};
