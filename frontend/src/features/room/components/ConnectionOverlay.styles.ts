import { buttonInteraction } from '@shared/ui';

/**
 * Class recipes for the Reconnecting overlay and the Disconnected notice. Both cards share
 * one frame: phones are the base (a 358px card), `md:` draws the 640px card of the design
 * at full size and `desktop:` at the 80% the other screens use.
 */

export const backdrop: string =
  'fixed inset-0 z-(--z-overlay) flex overflow-y-auto overscroll-contain bg-overlay p-3 ' +
  'backdrop-blur-[2px] motion-safe:animate-fade-in';

export const card: string =
  'relative m-auto flex w-full max-w-[358px] shrink-0 flex-col items-center gap-[22px] ' +
  'rounded-[35px] bg-surface px-[20px] py-[32px] text-center shadow-auth-dialog ' +
  'outline-none motion-safe:animate-pop-in md:max-w-[640px] md:p-[44px] ' +
  'desktop:max-w-[512px] desktop:gap-[18px] desktop:rounded-[28px] desktop:p-[35px]';

export const spinnerLarge: string = 'flex desktop:hidden';

export const spinnerSmall: string = 'hidden desktop:flex';

export const badge: string = 'size-[96px] shrink-0 desktop:size-[77px]';

export const title: string =
  'text-4xl leading-none font-bold text-text-ink normal-case md:text-[44px] ' +
  'desktop:text-[35px]';

export const body: string =
  'max-w-[470px] text-2xl leading-[1.2] font-regular text-text-slate ' +
  'desktop:max-w-[376px] desktop:text-[18px]';

export const chip: string =
  'rounded-[20px] bg-surface-muted px-[22px] py-[9px] text-xl leading-none font-bold ' +
  'text-text-gray tabular-nums desktop:rounded-[16px] desktop:px-[18px] desktop:py-[7px] ' +
  'desktop:text-[16px]';

export const error: string = 'text-md leading-[18px] font-bold text-accent-red desktop:text-[14px]';

/** Leave Match: the design system's outline blue button. */
export const leave: string =
  `${buttonInteraction} inline-flex h-[54px] w-full items-center justify-center ` +
  'rounded-[22px] border-(length:--stroke-default) border-primary-deep bg-surface px-[20px] ' +
  'text-2xl leading-none font-bold text-primary-sky not-aria-disabled:hover:bg-primary/10 ' +
  'aria-disabled:cursor-default aria-disabled:opacity-50 md:w-[300px] desktop:h-[43px] desktop:w-[240px] ' +
  'desktop:rounded-[18px] desktop:text-[18px]';

/** Back to Lobby: the design system's primary button. */
export const backToLobby: string =
  `${buttonInteraction} inline-flex h-[58px] w-full items-center justify-center ` +
  'rounded-[23px] bg-primary px-[20px] text-[25px] leading-none font-bold text-surface ' +
  'shadow-button-primary not-disabled:hover:bg-primary-bright ' +
  'not-disabled:hover:shadow-button-primary-hover md:w-[340px] desktop:h-[46px] ' +
  'desktop:w-[272px] desktop:rounded-[18px] desktop:text-[20px]';
