import type { Team } from '@shared/types';
import { buttonInteraction } from '@shared/ui';

/**
 * Results card recipes: the 760×714 card of the 1920px design at the desktop's 80%, and
 * the phone card whose actions stack at full width.
 */

export const card: string =
  'max-w-[358px] items-center gap-[16px] rounded-2xl bg-surface px-[20px] pt-[28px] pb-[28px] ' +
  'text-center shadow-auth-dialog md:max-w-[520px] md:px-[32px] ' +
  'desktop:max-w-[608px] desktop:gap-[18px] desktop:rounded-[28px] desktop:px-[48px] ' +
  'desktop:pt-[54px] desktop:pb-[56px]';

export const badge: string =
  'rounded-lg bg-accent-yellow px-[19px] py-[6px] text-md leading-none font-black ' +
  'tracking-[3px] text-text-ink uppercase';

export const trophy: string = 'h-[128px] w-[176px]';

export const headline: string =
  'text-[28px] leading-none font-bold uppercase md:text-4xl desktop:text-[42px]';

export const headlineTone: Record<Team, string> = {
  RED: 'text-secondary-deep',
  BLUE: 'text-primary',
};

export const reason: string =
  'max-w-[416px] text-xl leading-[1.2] font-regular text-text-slate desktop:text-[18px]';

export const scores: string = 'flex items-center justify-center gap-[12px] desktop:gap-[19px]';

export const separator: string =
  'text-3xl leading-none font-bold text-text-muted desktop:text-[26px]';

export const chip: string =
  'flex w-[134px] flex-col items-center gap-[2px] rounded-[18px] px-[16px] py-[11px] ' +
  'text-surface desktop:w-[157px]';

export const chipTone: Record<Team, string> = {
  RED: 'bg-secondary',
  BLUE: 'bg-primary',
};

export const chipLabel: string = 'text-md leading-none font-black tracking-[2.4px] uppercase';

export const chipScore: string = 'text-[42px] leading-none font-bold';

export const actions: string =
  'flex w-full flex-col items-stretch gap-[12px] desktop:flex-row desktop:justify-center ' +
  'desktop:gap-[14px]';

export const primary: string =
  `${buttonInteraction} inline-flex h-[56px] items-center justify-center rounded-[19px] ` +
  'bg-primary px-[20px] text-2xl leading-none font-bold text-surface shadow-button-primary ' +
  'not-disabled:hover:bg-primary-bright not-disabled:hover:shadow-button-primary-hover ' +
  'disabled:opacity-70 desktop:h-[50px] desktop:w-[240px] desktop:text-[21px]';

export const secondary: string =
  `${buttonInteraction} inline-flex h-[50px] items-center justify-center rounded-[19px] ` +
  'border-(length:--stroke-default) border-primary-deep bg-surface px-[20px] text-xl ' +
  'leading-none font-bold text-primary-sky not-disabled:hover:bg-primary/10 ' +
  'disabled:opacity-50 desktop:w-[224px] desktop:text-[19px]';

/** Exit: a quiet text action under the buttons, so leaving the room is never a reflex. */
export const exit: string =
  'mx-auto mt-[14px] inline-flex cursor-pointer items-center rounded-sm text-lg ' +
  'leading-[22px] font-bold text-accent-red underline-offset-2 not-disabled:hover:underline ' +
  'disabled:cursor-default disabled:opacity-60 desktop:text-[16px]';

export const deadline: string =
  'mb-[16px] text-center text-md leading-[18px] font-bold text-text-muted tabular-nums ' +
  'desktop:text-[14px]';

export const error: string =
  'mb-[12px] text-center text-md leading-[18px] font-bold text-accent-red desktop:text-[14px]';
