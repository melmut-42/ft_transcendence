import { cn } from '@shared/utils';
import { Icon, type IconName } from '@shared/ui/Icon';
import type { CardColor } from '@shared/types';

import {
  cardBase,
  hiddenStyles,
  hintStyles,
  interactiveStyles,
  revealedStyles,
  ringStyles,
  selectedStyles,
} from './WordCard.styles';

export interface WordCardProps {
  word: string;
  /** `null` while the card's affiliation is hidden from this player. */
  color?: CardColor | null;
  revealed?: boolean;
  /** The card the player is about to guess. */
  selected?: boolean;
  /** No pick is possible: not this player's turn, not their role, or the game is over. */
  disabled?: boolean;
  onSelect?: () => void;
  className?: string;
}

const glyphs: Record<CardColor, IconName> = {
  BLUE: 'droplet',
  RED: 'streak',
  NEUTRAL: 'remove',
  ASSASSIN: 'warning',
};

/**
 * One board tile.
 *
 * A revealed card paints its affiliation. An unrevealed card paints the spymaster's tint
 * when the server sent a color and stays neutral otherwise — the component never derives
 * an affiliation of its own.
 */
export function WordCard({
  word,
  color = null,
  revealed = false,
  selected = false,
  disabled = false,
  onSelect,
  className,
}: WordCardProps) {
  const interactive = Boolean(onSelect) && !revealed && !disabled;
  const ringTone = revealed ? (color ?? 'NEUTRAL') : 'HIDDEN';

  return (
    <button
      type="button"
      disabled={!interactive}
      aria-pressed={interactive ? selected : undefined}
      onClick={onSelect}
      className={cn(
        cardBase,
        revealed
          ? revealedStyles[color ?? 'NEUTRAL']
          : cn(hiddenStyles, color && hintStyles[color]),
        interactive && interactiveStyles,
        selected && !revealed && selectedStyles,
        disabled && !revealed && 'cursor-not-allowed opacity-55',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-1.5 rounded-md border-(length:--stroke-strong)',
          ringStyles[ringTone],
        )}
      />

      {revealed && color && (
        <Icon
          name={glyphs[color]}
          className="absolute top-2 left-2 text-md opacity-90 sm:text-lg"
        />
      )}

      <span className="relative text-lg sm:text-2xl lg:text-3xl">{word}</span>
    </button>
  );
}
