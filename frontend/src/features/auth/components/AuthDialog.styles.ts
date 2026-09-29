import { buttonInteraction } from '@shared/ui';

import type { AuthMode } from './AuthDialog.types';

/**
 * Class recipes for the Log In and Sign Up dialog.
 *
 * Mobile (390px) is the base and `md:` the tablet layout (834px): both fill the screen
 * with the page background and stack the header, the form card and the mode switch.
 * `desktop:` is the 1920×1080 composition, a 645px dialog with its artwork on a warm
 * backdrop. On desktop the two forms have their own geometry — Log In has two roomy
 * fields, Register fits four into the same card — so those recipes are keyed by mode.
 */

// ---- Shell ----

export const backdrop: string =
  'fixed inset-0 z-(--z-modal) flex overflow-y-auto overscroll-contain bg-background ' +
  'motion-safe:animate-fade-in desktop:p-3 ' +
  'desktop:bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,var(--color-disabled)_0%,var(--color-border)_100%)]';

export const dialog: string =
  'relative m-auto flex min-h-full w-full flex-col items-center gap-[14px] bg-background ' +
  'px-3 pt-[20px] pb-4 md:justify-center md:gap-[20px] md:px-6 md:py-5 ' +
  'desktop:min-h-0 desktop:w-[645px] desktop:shrink-0 desktop:gap-0 desktop:overflow-hidden ' +
  'desktop:rounded-2xl desktop:bg-transparent desktop:bg-linear-to-l desktop:from-surface-raised ' +
  'desktop:to-background desktop:px-0 desktop:pt-[88px] desktop:pb-[56px] ' +
  'desktop:shadow-auth-dialog desktop:motion-safe:animate-pop-in';

export const close: string =
  'inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center self-end ' +
  'rounded-pill bg-surface-muted text-xl text-text-slate ' +
  'transition-[scale,background-color,color] duration-100 ease-in hover:bg-surface-sunken ' +
  'hover:text-text-ink motion-safe:hover:scale-105 motion-safe:active:scale-95 ' +
  'desktop:absolute desktop:top-[24px] desktop:right-[18px] desktop:z-10 desktop:h-14 ' +
  'desktop:w-14 desktop:text-[26px]';

export const title: string =
  'w-full text-center text-4xl leading-[1.6] font-black text-text-ink normal-case ' +
  'desktop:ml-[218px] desktop:w-auto desktop:self-start desktop:text-left desktop:text-display ' +
  'desktop:leading-[52px] desktop:tracking-[-1.2px] desktop:text-text';

export const subtitle: string =
  'w-full text-center text-lg leading-[1.6] font-regular text-text-muted ' +
  'desktop:mt-[9px] desktop:ml-[218px] desktop:w-[350px] desktop:self-start desktop:text-left ' +
  'desktop:text-[26px] desktop:leading-[30px] desktop:text-text-ink';

/** Desktop artwork, placed at the design's coordinates on the 645px dialog. */
const artwork: string = 'pointer-events-none absolute hidden max-w-none desktop:block';

export const mascot: string = `${artwork} top-[38px] left-[24px] h-[187px] w-[186px]`;
export const cards: string = `${artwork} top-[124px] left-[526px] h-[101px] w-[98px]`;
export const foxPeek: string = `${artwork} top-[335px] left-[599px] h-[89px] w-[55px]`;
export const alien: string = `${artwork} bottom-[-6px] left-[15px] h-[88px] w-[94px]`;
export const foxCorner: string = `${artwork} bottom-[-2px] left-[570px] h-[74px] w-[75px]`;

// ---- Form card ----

export const card: Record<AuthMode, string> = {
  login: 'desktop:pt-[28px] desktop:pb-[28px]',
  register: 'desktop:pt-[22px] desktop:pb-[26px]',
};

export const cardBase: string =
  'flex w-full flex-col rounded-lg bg-surface p-3 shadow-auth-form-compact md:w-[520px] ' +
  'desktop:mt-[34px] desktop:ml-[51px] desktop:w-[544px] desktop:self-start desktop:rounded-xl ' +
  'desktop:px-[26px] desktop:shadow-auth-form';

export const tabs: Record<AuthMode, string> = {
  login: 'desktop:h-[62px]',
  register: 'desktop:h-[56px] desktop:rounded-[30px]',
};

export const tabsBase: string =
  'relative grid h-12 w-full shrink-0 grid-cols-2 rounded-[33px] bg-surface-muted p-[2px]';

/** The active pill slides under the selected tab. */
export const tabIndicator: Record<AuthMode, string> = {
  login: '',
  register: 'translate-x-full desktop:rounded-[28px]',
};

export const tabIndicatorBase: string =
  'pointer-events-none absolute top-[2px] bottom-[2px] left-[2px] w-[calc(50%-2px)] ' +
  'rounded-[31px] bg-linear-to-b from-primary-bright to-primary-sky shadow-auth-tab ' +
  'transition-transform duration-200 ease-pop';

export const tab: Record<AuthMode, string> = {
  login: 'desktop:text-3xl desktop:leading-[27px]',
  register: 'desktop:rounded-[28px] desktop:text-[26px] desktop:leading-[26px]',
};

export const tabBase: string =
  'relative cursor-pointer rounded-[31px] text-xl leading-[20px] font-bold text-text-gray ' +
  'transition-colors duration-200 hover:text-text-slate ' +
  'aria-selected:text-surface aria-selected:hover:text-surface';

// ---- Fields ----

export const fields: Record<AuthMode, string> = {
  login: 'desktop:mt-[26px] desktop:gap-[27px]',
  register: 'desktop:mt-[12px] desktop:gap-[10px]',
};

export const fieldsBase: string = 'mt-[10px] flex flex-col gap-[10px]';

export const field: Record<AuthMode, string> = {
  login: 'desktop:gap-[9px]',
  register: 'desktop:gap-[6px]',
};

export const fieldBase: string = 'flex flex-col gap-[10px]';

export const label: Record<AuthMode, string> = {
  login: 'desktop:text-2xl desktop:leading-[23px]',
  register: 'desktop:text-xl desktop:leading-[20px]',
};

export const labelBase: string = 'w-fit text-lg leading-[1.6] font-bold text-text-ink';

export const control: Record<AuthMode, string> = {
  login: 'desktop:h-[66px] desktop:rounded-[23px]',
  register: 'desktop:h-[58px] desktop:rounded-lg',
};

/** Type size of a visible value; a hidden password uses `masked` instead. */
export const controlText: Record<AuthMode, string> = {
  login: 'text-lg font-medium text-text-ink desktop:text-[25px]',
  register: 'text-lg font-medium text-text-ink desktop:text-[22px]',
};

export const controlBase: string =
  'h-12 w-full min-w-0 rounded-lg border bg-surface ' +
  'transition-[border-color,box-shadow,background-color] duration-200 ease-out ' +
  'placeholder:text-text-gray desktop:bg-surface-raised';

export const controlStatus = {
  default:
    'border-border shadow-alert hover:border-primary-deep focus:border-primary ' +
    'desktop:border-(length:--stroke-default)',
  error: 'border-2 border-secondary-dark shadow-input-error',
  success: 'border-2 border-success-soft shadow-alert',
};

export const controlLeading: Record<AuthMode, string> = {
  login: 'pl-11 desktop:pl-[58px]',
  register: 'pl-11 desktop:pl-[54px]',
};

export const controlPlain: string = 'pl-[14px] desktop:pl-[17px]';

export const controlTrailing: string = 'pr-12 desktop:pr-[64px]';

/** A hidden password shows its value as the design's wide slate dots. */
export const masked: Record<AuthMode, string> = {
  login: 'desktop:text-3xl desktop:font-bold',
  register: 'desktop:text-[26px] desktop:font-bold',
};

export const maskedBase: string = 'text-[23px] font-regular tracking-[2px] text-text-slate';

export const leadingIcon: Record<AuthMode, string> = {
  login: 'desktop:left-[18px] desktop:text-[25px]',
  register: 'desktop:left-[18px] desktop:text-[22px]',
};

export const leadingIconBase: string =
  'pointer-events-none absolute left-[15px] text-lg text-text-slate';

export const visibilityToggle: Record<AuthMode, string> = {
  login: 'desktop:right-[14px] desktop:h-11 desktop:w-11 desktop:text-[25px]',
  register: 'desktop:right-[14px] desktop:h-10 desktop:w-10 desktop:text-[22px]',
};

export const visibilityToggleBase: string =
  'absolute right-[8px] inline-flex h-9 w-9 cursor-pointer items-center justify-center ' +
  'rounded-pill text-lg text-text-slate transition-colors duration-100 ' +
  'hover:bg-surface-muted hover:text-text-ink';

export const message: Record<AuthMode, string> = {
  login: 'desktop:mt-[15px] desktop:text-2xl desktop:leading-[23px]',
  register: 'desktop:text-lg desktop:leading-[20px]',
};

export const messageBase: string =
  'flex items-center gap-2 text-md leading-[1.35] font-regular text-accent-red';

export const messageBadge: Record<AuthMode, string> = {
  login: 'desktop:h-[21px] desktop:w-[21px] desktop:text-[13px]',
  register: 'desktop:h-[18px] desktop:w-[18px] desktop:text-[11px]',
};

export const messageBadgeBase: string =
  'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-pill bg-accent-red ' +
  'text-[10px] text-surface';

// ---- Alert ----

/** On desktop Log In the alert sits 18px under the email field and 10px over the next label. */
export const alertPlacement: Record<AuthMode, string> = {
  login: 'desktop:mt-[9px] desktop:-mb-[17px]',
  register: '',
};

export const alertTone = {
  error: 'bg-secondary-deep',
  success: 'bg-success-deep',
};

export const alertBase: string =
  'flex flex-col gap-[6px] rounded-[10px] px-[18px] py-[10px] text-surface shadow-alert ' +
  'motion-safe:animate-rise-in';

export const alertTitle: string =
  'text-lg leading-[20px] font-bold tracking-[-0.5px] desktop:text-xl';

export const alertBody: string =
  'text-md leading-[18px] font-regular tracking-[-0.35px] desktop:text-lg';

// ---- Actions ----

const primaryButton: string =
  `${buttonInteraction} inline-flex h-[52px] w-full shrink-0 items-center justify-center ` +
  'rounded-lg bg-primary text-2xl leading-tight font-bold whitespace-nowrap text-surface ' +
  'shadow-button-primary not-disabled:hover:bg-primary-bright ' +
  'not-disabled:hover:shadow-button-primary-hover';

export const submit: Record<AuthMode, string> = {
  login: `${primaryButton} desktop:mt-[41px] desktop:h-[61px] desktop:rounded-xl desktop:text-3xl`,
  register:
    `${primaryButton} desktop:mt-[18px] desktop:h-[58px] desktop:rounded-[24px] ` +
    'desktop:text-[26px]',
};

export const submitBase: string = 'mt-[10px]';

/** The loading ellipsis trails the label, as the design system's loading button does. */
export const loadingEllipsis: string = 'motion-safe:animate-pulse';

export const prompt: string =
  'text-center text-md leading-[1.6] font-bold text-text-ink ' +
  'desktop:mt-[29px] desktop:text-2xl desktop:leading-[23px] desktop:font-regular';

export const promptAction: string =
  'cursor-pointer rounded-sm hover:text-primary-sky hover:underline hover:underline-offset-2';

/** The large switch button. Tablet and mobile Register show only the prompt line. */
export const switchButton: Record<AuthMode, string> = {
  login: '',
  register: 'max-desktop:hidden',
};

export const switchButtonBase: string =
  `${primaryButton} md:w-[520px] desktop:mt-[12px] desktop:h-[61px] desktop:w-[504px] ` +
  'desktop:rounded-xl desktop:text-3xl';
