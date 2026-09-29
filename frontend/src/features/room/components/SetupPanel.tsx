import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import operativeArtwork from '@assets/ready-room/role-operative.svg';
import spymasterArtwork from '@assets/ready-room/role-spymaster.svg';
import type { Room, RoomMember, RoomRole, Team } from '@shared/types';
import { Dialog, Icon } from '@shared/ui';
import { cn } from '@shared/utils';

import type { RoomSetup } from '../hooks/useRoomSetup';
import { readyState, setupLocked } from '../model/readyRoom';
import { roleSelection } from '../model/roles';
import * as styles from './SetupPanel.styles';

const TEAMS: Team[] = ['RED', 'BLUE'];
const ROLE_ARTWORK: Record<RoomRole, string> = {
  SPYMASTER: spymasterArtwork,
  OPERATIVE: operativeArtwork,
};

interface SetupProps {
  room: Room;
  me: RoomMember;
  setup: RoomSetup;
}

/**
 * Your Setup: choose a team, then a role. A team comes first, each team has one Spymaster,
 * and changes stop once the countdown starts; the server enforces all three and the panel
 * only explains them. A choice shows as made when the server reports it, never before.
 */
export function SetupPanel({ room, me, setup, className }: SetupProps & { className?: string }) {
  const { t } = useTranslation();
  const teamLabelId = useId();
  const roleLabelId = useId();
  const locked = setupLocked(room);
  const roles = roleSelection(room, me.user_id);
  const busy = setup.pending !== null;

  return (
    <div className={cn(styles.panel, className)}>
      <h3 id={teamLabelId} className={styles.teamHeading}>
        {t('room.ready.chooseTeam')}
      </h3>
      <div role="group" aria-labelledby={teamLabelId} className={styles.teams}>
        {TEAMS.map((team) => {
          const selected = me.team === team;
          return (
            <button
              key={team}
              type="button"
              aria-pressed={selected}
              aria-busy={setup.pending === 'team'}
              disabled={locked}
              onClick={() => !busy && !selected && void setup.selectTeam(team)}
              className={cn(styles.teamButton, styles.teamTone[team])}
            >
              {t(`room.ready.teamButton.${team}`)}
              {selected && (
                <span aria-hidden="true" className={cn(styles.check, styles.checkTone[team])}>
                  <Icon name="check" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <h3 id={roleLabelId} className={styles.roleHeading}>
        {t('room.ready.chooseRole')}
      </h3>
      <div role="group" aria-labelledby={roleLabelId} className={styles.roles}>
        {roles?.options.map((option) => {
          const taken = option.reason === 'SPYMASTER_TAKEN';
          return (
            <button
              key={option.role}
              type="button"
              aria-pressed={option.selected}
              aria-busy={setup.pending === 'role'}
              aria-describedby={option.reason ? `${roleLabelId}-hint` : undefined}
              disabled={!option.available || locked}
              onClick={() => !busy && !option.selected && void setup.selectRole(option.role)}
              className={cn(
                styles.roleCard,
                option.selected && me.team && styles.roleCardSelected,
                option.selected && me.team && styles.roleCardSelectedTone[me.team],
                taken && styles.roleCardUnavailable,
              )}
            >
              <span
                className={cn(
                  styles.roleContent,
                  (!option.available || locked) && !option.selected && styles.roleContentDimmed,
                )}
              >
                <img
                  src={ROLE_ARTWORK[option.role]}
                  alt=""
                  className={styles.roleArtwork[option.role]}
                />
                <span className={styles.roleTitle}>
                  {t(`room.ready.roleCard.${option.role}.title`)}
                </span>
                <span className={styles.roleDescription}>
                  {t(`room.ready.roleCard.${option.role}.description`)}
                </span>
              </span>
              {taken && <span className={styles.takenBadge}>{t('room.ready.taken')}</span>}
              {option.selected && me.team && (
                <span aria-hidden="true" className={cn(styles.check, styles.checkTone[me.team])}>
                  <Icon name="check" />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <RoleHint room={room} me={me} id={`${roleLabelId}-hint`} />
    </div>
  );
}

/** Why the role cards are unavailable, when they are. */
function RoleHint({ room, me, id }: { room: Room; me: RoomMember; id: string }) {
  const { t } = useTranslation();
  const holder = roleSelection(room, me.user_id)?.options[0].occupiedBy;
  let text: string | null = null;
  if (setupLocked(room)) text = t('room.ready.hints.locked');
  else if (!me.team) text = t('room.ready.hints.teamFirst');
  else if (holder) text = t('room.ready.hints.spymasterTaken', { username: holder.username });
  if (!text) return null;
  return (
    <p id={id} className={styles.hint}>
      {text}
    </p>
  );
}

/**
 * READY confirms the chosen team and role, and pressing it again takes it back. It is
 * available once both are chosen; changing either clears it on the server's side.
 */
export function ReadyButton({
  room,
  me,
  setup,
  size = styles.readySidebar,
  className,
}: SetupProps & {
  /** Height, radius and type size; the sidebar's by default. */
  size?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const state = readyState(room, me);
  const hintId = useId();
  const unavailable = state.kind === 'UNAVAILABLE';

  return (
    <>
      <button
        type="button"
        aria-pressed={me.ready}
        aria-busy={setup.pending === 'ready'}
        aria-describedby={unavailable ? hintId : undefined}
        disabled={unavailable}
        onClick={() => setup.pending === null && void setup.setReady(!me.ready)}
        className={cn(
          styles.ready,
          // A ready player stays green while the countdown locks the button.
          styles.readyTone[me.ready ? 'READY' : state.kind],
          size,
          className,
        )}
      >
        {me.ready && (
          <span aria-hidden="true" className={styles.readyMark}>
            <Icon name="check" />
          </span>
        )}
        {t(me.ready ? 'room.ready.readyDone' : 'room.ready.readyAction')}
      </button>
      {unavailable && (
        <span id={hintId} className="sr-only">
          {t(`room.ready.hints.ready.${state.reason}`)}
        </span>
      )}
    </>
  );
}

/** A turned-down command, in words; the controls show the server's state regardless. */
export function SetupFeedback({ setup, className }: { setup: RoomSetup; className?: string }) {
  const { t } = useTranslation();
  return (
    <p role="status" aria-live="polite" className={cn(styles.feedback, className)}>
      {setup.feedback && t(setup.feedback.message)}
    </p>
  );
}

/** "You: Red · Spymaster · Host" and Change, where the setup lives in a dialog. */
export function SetupSummary({
  me,
  onChange,
  disabled,
}: {
  me: RoomMember;
  onChange: () => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const parts = [
    me.team ? t(`room.ready.teamShort.${me.team}`) : t('room.ready.noTeam'),
    me.role ? t(`room.ready.role.${me.role}`) : null,
    me.is_host ? t('room.ready.host') : null,
  ].filter(Boolean);

  return (
    <div className={styles.summary}>
      <p className={styles.summaryText}>{t('room.ready.summary', { setup: parts.join(' · ') })}</p>
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        aria-haspopup="dialog"
        className={styles.summaryChange}
      >
        {t(me.team ? 'room.ready.change' : 'room.ready.choose')}
      </button>
    </div>
  );
}

/** Your Setup over the page, for phones and tablets that have no sidebar. */
export function SetupDialog({ room, me, setup, onClose }: SetupProps & { onClose: () => void }) {
  const { t } = useTranslation();
  const titleId = useId();
  return (
    <Dialog
      labelledBy={titleId}
      closeLabel={t('common.close')}
      onClose={onClose}
      className={styles.dialog}
    >
      <h2 id={titleId} className={styles.dialogTitle}>
        {t('room.ready.setupTitle')}
      </h2>
      <SetupPanel room={room} me={me} setup={setup} />
      <SetupFeedback setup={setup} className="mt-[14px]" />
    </Dialog>
  );
}
