package game

import (
	"errors"
	"fmt"
	"testing"
)

func newTestGame() *Game {
	game := &Game{
		GameID: 5000,
		board: &Board{
			startingTeam: TeamRed,
		},
		currentTurn: CurrentTurn{
			Team:  TeamRed,
			Phase: PhaseWaitingForClue,
		},
	}
	for i := range game.board.cards {
		color := CardColorAssassin

		if i >= 0 && i < 9 {
			color = CardColorRed
		} else if i >= 9 && i < 17 {
			color = CardColorBlue
		} else if i >= 17 && i < 24 {
			color = CardColorNeutral
		} else {
			color = CardColorAssassin
		}
		game.board.cards[i] = card{
			cardID: i + 1,
			word:   fmt.Sprintf("word%d", i+1),
			color:  color,
		}
	}
	return game
}

func TestGameFlow(t *testing.T) {
	game := newTestGame()
	PlayerRedSpy := &Player{UserID: 1, Team: TeamRed, Role: RoleSpymaster}
	PlayerRedOpr := &Player{UserID: 2, Team: TeamRed, Role: RoleOperative}
	PlayerBlueSpy := &Player{UserID: 3, Team: TeamBlue, Role: RoleSpymaster}
	PlayerBlueOpr := &Player{UserID: 4, Team: TeamBlue, Role: RoleOperative}

	turn1, err := game.GiveClue(PlayerRedSpy, &Clue{Word: "hint", Number: 2})
	if err != nil {
		t.Fatalf("First GiveClue: %v", err)
	}
	if turn1.Phase != PhaseGuessing ||
		turn1.GuessesRemaining == nil || *turn1.GuessesRemaining != 3 {
		t.Fatalf("After GiveClue is wrong, %+v", turn1)
	}
	turn2, err := game.GuessCard(PlayerRedOpr, 2)
	if err != nil {
		t.Fatalf("First GuessCard: %v", err)
	}
	if turn2.CurrentTurn.Phase != PhaseGuessing ||
		turn2.CurrentTurn.GuessesRemaining == nil || *turn2.CurrentTurn.GuessesRemaining != 2 ||
		turn2.CurrentTurn.Team != TeamRed || turn2.IsCorrectGuess != true ||
		turn2.ChangeReason != nil || turn2.EndReason != nil {
		if turn2.CurrentTurn.Clue != nil {
			t.Logf("clue: %+v", turn2.CurrentTurn.Clue)
		}
		if turn2.CurrentTurn.GuessesRemaining != nil {
			t.Logf("GuessRemaining: %d", *turn2.CurrentTurn.GuessesRemaining)
		}
		t.Fatalf("After GuessCard is wrong, %+v", turn2)
	}
	turn3, err := game.PassTurn(PlayerRedOpr)
	if err != nil {
		t.Fatalf("After PassTurn is wrong, %+v", turn3)
	}
	if turn3.CurrentTurn.Team != TeamBlue ||
		turn3.CurrentTurn.Phase != PhaseWaitingForClue ||
		turn3.CurrentTurn.Clue != nil ||
		turn3.CurrentTurn.GuessesRemaining != nil {
		t.Fatalf("pass sonrası beklenmeyen tur: %+v", turn3.CurrentTurn)
	}

	before := cloneTestGame(game)
	turn4, err := game.GiveClue(PlayerRedSpy, &Clue{Word: "word1", Number: 1})
	if err == nil {
		t.Fatalf("Wrong Team GiveClue (RedTeam) should be give an error, %+v", turn4)
	}
	checkGameUnchanged(t, before, game)

	before = cloneTestGame(game)
	turn5, err := game.GiveClue(PlayerBlueSpy, &Clue{Word: "word1", Number: 1})
	if err == nil {
		t.Fatalf("Second GiveClue (BlueTeam) should be give an error, %+v", turn5)
	}
	checkGameUnchanged(t, before, game)

	turn6, err := game.GiveClue(PlayerBlueSpy, &Clue{Word: "hint", Number: 1})
	if err != nil {
		t.Fatalf("Second GiveClue (BlueTeam) is wrong, %+v", turn6)
	}
	turn7, err := game.GuessCard(PlayerBlueOpr, 25)
	if err != nil {
		t.Fatalf("First GuessCard (Assassin): %v", err)
	}
	if turn7.CurrentTurn.Phase != PhaseGameOver ||
		turn7.CurrentTurn.GuessesRemaining != nil ||
		turn7.IsCorrectGuess != false ||
		turn7.ChangeReason != nil || turn7.EndReason == nil ||
		*turn7.EndReason != EndReasonAssassinRevealed {

		t.Fatalf("After GuessCard (BlueTeam Assassin Card) is wrong, %+v", turn2)
	}

	before = cloneTestGame(game)
	_, err = game.GiveClue(PlayerRedSpy, &Clue{Word: "hint", Number: 1})
	if !errors.Is(err, ErrGameAlreadyFinished) {
		t.Fatalf("After game - clue: %v", err)
	}
	checkGameUnchanged(t, before, game)

	before = cloneTestGame(game)
	_, err = game.GuessCard(PlayerBlueOpr, 10)
	if !errors.Is(err, ErrGameAlreadyFinished) {
		t.Fatalf("After game - guess: %v", err)
	}
	checkGameUnchanged(t, before, game)

	before = cloneTestGame(game)
	_, err = game.PassTurn(PlayerBlueOpr)
	if !errors.Is(err, ErrGameAlreadyFinished) {
		t.Fatalf("After game - pass: %v", err)
	}
	checkGameUnchanged(t, before, game)
}
