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

	err = json.Unmarshal(data, &wordPack)
	if err != nil {
		t.Fatalf("could not parse wordpack.json: %v", err)
	}

	return wordPack
}

func TestGenerateCardsWithRealWordPack(t *testing.T) {
	wordPack := loadTestWordPack(t)

	cards, startingTeam, err := GenerateCards(wordPack.Words, "en")
	if err != nil {
		t.Fatalf("GenerateCards returned an error: %v", err)
	}

	if len(cards) != BoardSize {
		t.Fatalf("expected %d cards, got %d", BoardSize, len(cards))
	}

	seenWords := make(map[string]bool)
	colorCounts := make(map[CardColor]int)

	for _, card := range cards {
		if seenWords[card.Word] {
			t.Errorf("same word was selected twice: %s", card.Word)
		}

		seenWords[card.Word] = true
		colorCounts[card.Color]++
	}

	startColor := CardColorRed
	otherColor := CardColorBlue

	if startingTeam == TeamBlue {
		startColor = CardColorBlue
		otherColor = CardColorRed
	}

	if colorCounts[startColor] != 9 {
		t.Errorf("starting team should have 9 cards, got %d", colorCounts[startColor])
	}

	if colorCounts[otherColor] != 8 {
		t.Errorf("other team should have 8 cards, got %d", colorCounts[otherColor])
	}

	if colorCounts[CardColorNeutral] != 7 {
		t.Errorf("expected 7 neutral cards, got %d", colorCounts[CardColorNeutral])
	}

	if colorCounts[CardColorAssassin] != 1 {
		t.Errorf("expected 1 assassin card, got %d", colorCounts[CardColorAssassin])
	}
	t.Logf("Starting team: %v", startingTeam)

for _, card := range cards {
	t.Logf(
		"CardID: %d | Word key: %s | Color: %v | Revealed: %t",
		card.CardID,
		card.Word,
		card.Color,
		card.Revealed,
	)
}
}