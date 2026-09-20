# Frontend implementation issues

The 20 frontend issues that follow the foundation, written against the current Bruno
contracts. One Markdown file per issue body, plus a script that creates them all on
GitHub with their dependency links.

These files are the source the issues were generated from. Once the issues exist on
GitHub, GitHub is authoritative — edit them there, not here.

## Status

Issues **#7-#26** were created in `melmut-42/ft_transcendence`, labelled `frontend`,
in the order listed below. Re-running the script would duplicate them.

## Labels

Titles carry **no area prefix** — the area lives in the label, matching the existing
backend issues. Following the repository's pattern (`backend` + `request-lifecycle`),
each issue carries the `frontend` area label plus one scope label:

| Scope label | Issues |
| --- | --- |
| `auth-session` | #7 |
| `routing` | #8 |
| `room-lifecycle` | #9, #10, #11, #12 |
| `realtime` | #13, #18 |
| `gameplay` | #14, #15, #16, #17 |
| `social` | #19, #20, #21, #22, #23 |
| `ui-foundation` | #24, #25 |
| `quality` | #26 |

The project's Frontend view filters on `label:frontend`, so the scope labels narrow
within that view rather than changing what appears in it.

All 20 are on project `ft_transcendence` #4 (owner `melmut-42`), under its **Frontend**
view, which filters on `label:frontend`. Each is set to `Status: Todo`. `Priority` is
left unset — no repo convention defines its values.

The board is split by area view: UI/UX, Frontend, Backend, Devops & Security, AI,
Game(s). The design-track draft items live in UI/UX, so they do not collide with these.

Project reference:

- project: `4`, owner `melmut-42`, id `PVT_kwDODM5VOc4BbJDm`
- `Status` field `PVTSSF_lADODM5VOc4BbJDmzhV7tc0`
- `Status` options: `Backlog`, `Todo`, `In Progress`, `Review / Testing`, `Done`

Items are auto-added to the project by a project workflow when an issue is created, but
that workflow leaves `Status` empty. Set it explicitly:

```bash
gh project item-edit --id <item-id> \
  --project-id PVT_kwDODM5VOc4BbJDm \
  --field-id PVTSSF_lADODM5VOc4BbJDmzhV7tc0 \
  --single-select-option-id 671babf5      # Todo
```

## Re-creating them elsewhere

```bash
gh auth refresh -s project          # required for `gh project item-add`

DRY_RUN=1 ./create-frontend-issues.sh          # preview
REPO=<owner>/<repo> PROJECT_OWNER=<owner> PROJECT_NUMBER=<n> ./create-frontend-issues.sh
```

The script adds a `frontend` label only if the repository already has one, and adds
each issue to a project only when `PROJECT_NUMBER` is given. It sets no assignee and
invents no project field values.

## Dependency graph

Issue numbers as created:

```text
 7 Auth
 8 Routing                 <- #7
 9 Lobby                   <- #7, #8
10 Create Room             <- #9
11 Join Room               <- #9
12 Room Waiting            <- #8, #10, #11
13 Room WebSocket          <- #12
14 Game state integration  <- #13
15 Spymaster               <- #14
16 Operative               <- #14
17 Results                 <- #14
18 Reconnect UX            <- #13
19 Profile modal           <- #7
20 Profile editing         <- #19
21 Friends                 <- #7, #19
22 Chat                    <- #7
23 Match history / stats   <- #19
24 Privacy & Terms         <- (none)
25 Design system           <- (none)
26 Final quality pass      <- all
```

Profile, Friends and Chat proceed in parallel once Auth lands. The design system and
the legal pages proceed in parallel with everything.
