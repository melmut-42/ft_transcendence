#!/usr/bin/env bash
# Create the 20 frontend implementation issues and add them to the Frontend project.
#
# Requires: gh (authenticated with repo + project scopes).
#   brew install gh
#   gh auth login
#   gh auth refresh -s project        # needed for `gh project item-add`
#
# Usage:
#   REPO=melmut-42/ft_transcendence PROJECT_OWNER=melmut-42 PROJECT_NUMBER=<n> \
#     ./create-frontend-issues.sh
#
#   PROJECT_NUMBER is optional. Without it the issues are created but not added to a
#   project. List your projects with:  gh project list --owner <owner>
#
# Safe to inspect first with DRY_RUN=1.

set -euo pipefail

REPO="${REPO:-melmut-42/ft_transcendence}"
PROJECT_OWNER="${PROJECT_OWNER:-}"
PROJECT_NUMBER="${PROJECT_NUMBER:-}"
LABEL="${LABEL:-frontend}"
DRY_RUN="${DRY_RUN:-0}"
STATUS_VALUE="${STATUS_VALUE:-Todo}"

cd "$(dirname "$0")"

label_args=()
if [[ "$DRY_RUN" != "1" ]]; then
  command -v gh >/dev/null || { echo "gh is not installed."; exit 1; }

  # Use the label only if it already exists in the repo; never invent a convention.
  if gh label list --repo "$REPO" --limit 200 --json name --jq '.[].name' 2>/dev/null \
      | grep -qx "$LABEL"; then
    label_args=(--label "$LABEL")
  else
    echo "note: label '$LABEL' does not exist in $REPO; creating issues without it."
  fi
fi

titles=(
  "Implement authentication flow"
  "Implement application routing and route recovery"
  "Implement Lobby page"
  "Implement Create Room flow"
  "Implement Join Room flow"
  "Implement Room Waiting experience"
  "Implement room WebSocket integration"
  "Implement game state integration"
  "Implement Spymaster gameplay"
  "Implement Operative gameplay"
  "Implement game end and results state"
  "Implement reconnect and disconnection UX"
  "Implement profile modal"
  "Implement profile editing and avatar upload"
  "Implement friends experience"
  "Implement chat experience"
  "Implement match history and statistics"
  "Implement Privacy Policy and Terms pages"
  "Apply design system and responsive UI foundations"
  "Final integration and frontend quality pass"
)

bodies=(
  01-auth.md 02-routing.md 03-lobby.md 04-create-room.md 05-join-room.md
  06-room-waiting.md 07-room-websocket.md 08-game-state.md 09-spymaster.md
  10-operative.md 11-results.md 12-reconnect.md 13-profile-modal.md
  14-profile-editing.md 15-friends.md 16-chat.md 17-stats.md 18-legal-pages.md
  19-design-system.md 20-final-pass.md
)

# Dependency edges, by 1-based index into the arrays above. Acyclic by construction.
deps=(
  ""            # 1  auth
  "1"           # 2  routing
  "1 2"         # 3  lobby
  "3"           # 4  create room
  "3"           # 5  join room
  "2 4 5"       # 6  room waiting
  "6"           # 7  room websocket
  "7"           # 8  game state
  "8"           # 9  spymaster
  "8"           # 10 operative
  "8"           # 11 results
  "7"           # 12 reconnect
  "1"           # 13 profile modal
  "13"          # 14 profile editing
  "1 13"        # 15 friends
  "1"           # 16 chat
  "13"          # 17 stats
  ""            # 18 legal pages
  ""            # 19 design system
  "1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19"  # 20 final pass
)

declare -a numbers

for i in "${!titles[@]}"; do
  n=$((i + 1))
  title="${titles[$i]}"
  body_file="${bodies[$i]}"

  # Resolve dependency references to real issue numbers now that earlier ones exist.
  body="$(cat "$body_file")"
  dep_list="${deps[$i]}"
  if [[ -n "$dep_list" ]]; then
    refs=""
    for d in $dep_list; do
      refs+="- #${numbers[$((d - 1))]}"$'\n'
    done
    body+=$'\n\n---\n\n**Blocked by**\n\n'"$refs"
  fi

  if [[ "$DRY_RUN" == "1" ]]; then
    echo "DRY RUN  ${n}. ${title}"
    numbers[$i]="DRY-$n"
    continue
  fi

  url=$(gh issue create --repo "$REPO" --title "$title" --body "$body" "${label_args[@]}")
  num="${url##*/}"
  numbers[$i]="$num"
  echo "created #${num}  ${title}"

  if [[ -n "$PROJECT_NUMBER" && -n "$PROJECT_OWNER" ]]; then
    gh project item-add "$PROJECT_NUMBER" --owner "$PROJECT_OWNER" --url "$url" >/dev/null \
      && echo "        added to project $PROJECT_NUMBER" \
      || echo "        WARNING: could not add to project $PROJECT_NUMBER"
  fi
done

echo
echo "Created ${#numbers[@]} issues in $REPO."
if [[ -n "$PROJECT_NUMBER" ]]; then
  echo "Set the Status field to '$STATUS_VALUE' for the new items in the project board."
  echo "gh project field-list $PROJECT_NUMBER --owner $PROJECT_OWNER   # to inspect fields"
else
  echo "No PROJECT_NUMBER given, so nothing was added to a project."
  echo "gh project list --owner <owner>   # to find the Frontend project number"
fi
