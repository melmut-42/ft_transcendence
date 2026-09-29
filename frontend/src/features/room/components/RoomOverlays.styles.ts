import { buttonInteraction } from '@shared/ui';

/**
 * Class recipes for the dialogs over the Ready Room: Leave Room and the game countdown.
 * Phones are the base, `md:` draws the design at full size and `desktop:` at 80%, like the
 * page behind them.
 */

// ---- Leave Room ----

export const leave: string =
  'max-w-[580px] items-center rounded-xl bg-surface px-3 pt-[28px] pb-[22px] text-center ' +
  'shadow-auth-dialog md:rounded-2xl md:px-[36px] md:pt-[40px] md:pb-[36px] ' +
  'desktop:max-w-[464px] desktop:rounded-[28px] desktop:px-[29px] desktop:pt-[32px] ' +
  'desktop:pb-[29px]';

export const leaveTitle: string =
  'text-3xl leading-[30px] font-black tracking-[-0.8px] text-text-black normal-case ' +
  'md:text-4xl md:leading-[32px] desktop:text-[26px] desktop:leading-[26px]';

export const leaveBody: string =
  'mt-[14px] max-w-[440px] text-lg leading-[22px] font-regular text-text-black ' +
  'md:mt-[18px] md:text-2xl md:leading-[26px] desktop:mt-[16px] desktop:max-w-[352px] ' +
  'desktop:text-[18px] desktop:leading-[21px]';

export const leaveError: string =
  'mt-[12px] text-md leading-[18px] font-bold text-accent-red desktop:text-[14px]';

export const leaveActions: string =
  'mt-[24px] grid w-full grid-cols-2 gap-3 md:mt-[32px] md:gap-[28px] desktop:mt-[26px] ' +
  'desktop:gap-[22px]';

export const leaveButton: string =
  `${buttonInteraction} inline-flex h-[56px] items-center justify-center rounded-lg ` +
  'text-2xl leading-none font-bold tracking-[-0.5px] md:h-[68px] md:text-3xl ' +
  'desktop:h-[54px] desktop:rounded-[16px] desktop:text-[22px]';

export const stayTone: string =
  'bg-background text-text-black shadow-button-neutral ' +
  'not-disabled:hover:shadow-button-neutral-hover';

export const leaveTone: string =
  'bg-secondary-deep text-surface shadow-button-coral not-disabled:hover:brightness-105 ' +
  'not-disabled:hover:shadow-button-coral-hover';

// ---- Countdown ----

export const countdown: string =
  'max-w-[358px] items-center gap-[20px] rounded-xl bg-surface px-3 py-[32px] ' +
  'shadow-auth-dialog outline-none md:h-[480px] md:max-w-[600px] md:justify-center ' +
  'md:gap-[28px] md:rounded-2xl md:py-0 desktop:h-[384px] desktop:max-w-[480px] ' +
  'desktop:gap-[22px] desktop:rounded-[28px]';

export const countdownEyebrow: string =
  'text-lg leading-none font-bold tracking-[4px] text-text-muted uppercase md:text-xl ' +
  'md:tracking-[5px] desktop:text-[16px] desktop:tracking-[4px]';

export const countdownRing: string =
  'flex size-[200px] shrink-0 items-center justify-center rounded-pill ' +
  'bg-linear-to-b from-primary-bright to-primary-sky ' +
  'shadow-[0_8px_2px_var(--color-shadow-primary),0_12px_20px_var(--color-shadow-medium)] ' +
  'md:size-[264px] desktop:size-[211px]';

export const countdownNumber: string =
  'text-[128px] leading-none font-bold text-surface motion-safe:animate-pop-in ' +
  'md:text-[170px] desktop:text-[136px]';

export const countdownHint: string =
  'max-w-[440px] text-center text-xl leading-[26px] font-regular text-text-slate ' +
  'md:text-2xl md:leading-[28px] desktop:max-w-[352px] desktop:text-[18px] ' +
  'desktop:leading-[22px]';
