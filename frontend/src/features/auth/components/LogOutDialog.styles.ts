import { buttonInteraction } from '@shared/ui';

/**
 * Class recipes for the Log Out confirmation, the design system's confirmation modal.
 * Phones are the base, `md:` draws the design at full size and `desktop:` at 80%, like
 * the other confirmations over the room and the game.
 */

export const card: string =
  'max-w-[580px] items-center rounded-xl bg-surface px-3 pt-[28px] pb-[22px] text-center ' +
  'shadow-auth-dialog md:rounded-2xl md:px-[36px] md:pt-[40px] md:pb-[36px] ' +
  'desktop:max-w-[464px] desktop:rounded-[28px] desktop:px-[29px] desktop:pt-[32px] ' +
  'desktop:pb-[29px]';

export const title: string =
  'text-3xl leading-[30px] font-black tracking-[-0.8px] text-text-black normal-case ' +
  'md:text-4xl md:leading-[32px] desktop:text-[26px] desktop:leading-[26px]';

export const body: string =
  'mt-[14px] max-w-[440px] text-lg leading-[22px] font-regular text-text-black ' +
  'md:mt-[18px] md:text-2xl md:leading-[26px] desktop:mt-[16px] desktop:max-w-[352px] ' +
  'desktop:text-[18px] desktop:leading-[21px]';

export const error: string =
  'mt-[12px] text-md leading-[18px] font-bold text-accent-red desktop:text-[14px]';

export const actions: string =
  'mt-[24px] grid w-full grid-cols-2 gap-3 md:mt-[32px] md:gap-[28px] desktop:mt-[26px] ' +
  'desktop:gap-[22px]';

export const button: string =
  `${buttonInteraction} inline-flex h-[56px] items-center justify-center rounded-lg ` +
  'text-2xl leading-none font-bold tracking-[-0.5px] md:h-[68px] md:text-3xl ' +
  'desktop:h-[54px] desktop:rounded-[16px] desktop:text-[22px]';

export const stay: string =
  'bg-background text-text-black shadow-button-neutral ' +
  'not-disabled:hover:shadow-button-neutral-hover';

export const confirm: string =
  'bg-secondary-deep text-surface shadow-button-coral not-disabled:hover:brightness-105 ' +
  'not-disabled:hover:shadow-button-coral-hover';
