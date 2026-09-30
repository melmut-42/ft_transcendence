package game

import (
	"encoding/json"
	"os"
	"testing"
)

func loadTestWordPack(t *testing.T) WordPack {
	t.Helper()

	data, err := os.ReadFile("wordpack.json")
	if err != nil {
		t.Fatalf("could not read wordpack.json: %v", err)
	}

	var wordPack WordPack

	if err := json.Unmarshal(data, &wordPack); err != nil {
		t.Fatalf("could not parse wordpack.json: %v", err)
	}

	return wordPack
}

func TestNewBoardWithRealWordPack(t *testing.T) {
	wordPack := loadTestWordPack(t)

	board, err := NewBoard(wordPack.Words, "en")
	if err != nil {
		t.Fatalf("NewBoard returned an error: %v", err)
	}

	cards := board.Cards()

	if len(cards) != BoardSize {
		t.Fatalf("expected %d cards, got %d", BoardSize, len(cards))
	}

	seenWords := make(map[string]bool)
	colorCounts := make(map[CardColor]int)

	for i, card := range cards {
		if card.CardID != i+1 {
			t.Errorf("expected CardID %d, got %d", i+1, card.CardID)
		}

		if card.Revealed {
			t.Errorf("card %d should start unrevealed", card.CardID)
		}

		if seenWords[card.Word] {
			t.Errorf("same word was selected twice: %s", card.Word)
		}

		seenWords[card.Word] = true
		colorCounts[card.Color]++
	}

	startColor := CardColorRed
	otherColor := CardColorBlue

	if board.StartingTeam() == TeamBlue {
		startColor = CardColorBlue
		otherColor = CardColorRed
	}

	if colorCounts[startColor] != StartTeamCardsSize {
		t.Errorf("starting team should have %d cards, got %d",
			StartTeamCardsSize, colorCounts[startColor])
	}

	if colorCounts[otherColor] != OtherTeamCardsSize {
		t.Errorf("other team should have %d cards, got %d",
			OtherTeamCardsSize, colorCounts[otherColor])
	}

	if colorCounts[CardColorNeutral] != NeutralCardsSize {
		t.Errorf("expected %d neutral cards, got %d",
			NeutralCardsSize, colorCounts[CardColorNeutral])
	}

	if colorCounts[CardColorAssassin] != AssassinCardsSize {
		t.Errorf("expected %d assassin card, got %d",
			AssassinCardsSize, colorCounts[CardColorAssassin])
	}

	t.Logf("Starting team: %v", board.StartingTeam())
	for _, card := range cards {
		t.Logf(
			"CardID: %2d | Word: %-15s | Color: %-7v | Revealed: %t",
			card.CardID,
			card.Word,
			card.Color,
			card.Revealed,
		)
	}
}
