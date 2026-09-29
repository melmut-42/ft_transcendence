import { buttonInteraction } from '@shared/ui';

/**
 * Class recipes for the head of the Ready Room: the room code with its copy button and the
 * room size settings. Phones and tablets are the base; `desktop:` is the desktop design at
 * 80% of its size.
 */

// ---- Room code ----

export const code: string = 'flex items-center justify-center gap-[14px] desktop:gap-[11px]';

export const codeText: string =
  'text-[43px] leading-[43px] font-black tracking-[0.5px] text-text-ink ' +
  'desktop:text-[34px] desktop:leading-[34px]';

export const copyButton: string =
  `${buttonInteraction} inline-flex size-[57px] shrink-0 items-center justify-center ` +
  'rounded-pill bg-surface-muted text-[28px] text-text-gray not-disabled:hover:bg-surface-sunken ' +
  'desktop:size-[46px] desktop:text-[22px]';

export const copyDone: string = 'text-success-deep';

// ---- Room size ----

export const capacity: string =
  'flex flex-wrap items-center justify-center gap-[14px] desktop:gap-[11px]';

export const capacityLabel: string =
  'hidden text-lg leading-none font-black tracking-[0.5px] text-text-ink uppercase md:block ' +
  'desktop:text-[14px] desktop:tracking-[0.4px]';

export const stepper: string =
  'flex h-[36px] w-[184px] shrink-0 overflow-hidden rounded-[18px] border ' +
  'border-border bg-surface-raised desktop:h-[29px] desktop:w-[147px] desktop:rounded-[14px]';

export const stepperLocked: string = 'bg-disabled';

export const stepperButton: string =
  'inline-flex w-[37px] shrink-0 cursor-pointer items-center justify-center text-[15px] ' +
  'text-text transition-colors duration-150 not-disabled:hover:bg-surface-muted ' +
  'disabled:cursor-not-allowed disabled:text-text-disabled desktop:w-[30px] ' +
  'desktop:text-[12px]';

export const stepperValue: string =
  'flex flex-1 items-center justify-center border-x border-border bg-surface text-md ' +
  'leading-none font-bold text-text desktop:text-[11px]';

export const stepperValueLocked: string = 'text-text-disabled';

export const countBadge: string =
  'inline-flex h-[34px] min-w-[132px] shrink-0 items-center justify-center rounded-[17px] ' +
  'px-[12px] text-lg leading-none font-black text-surface uppercase desktop:h-[27px] ' +
  'desktop:min-w-[106px] desktop:rounded-[14px] desktop:px-[10px] desktop:text-[14px]';

export const countTone = {
  open: 'bg-primary-sky',
  full: 'bg-secondary-deep',
};
