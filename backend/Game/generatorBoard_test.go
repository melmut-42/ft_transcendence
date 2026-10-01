package game

import (
	"encoding/json"
	"errors"
	"math/rand"
	"os"
	"reflect"
	"testing"
)

func loadTestWordPack(t *testing.T, filename string) WordPack {
	t.Helper()

	data, err := os.ReadFile(filename)
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
	wpOriginal := "wordpack.json"
	wordPack := loadTestWordPack(t, wpOriginal)
	r := rand.New(rand.NewSource(42))

	board, err := NewBoard(wordPack.Words, "en", r)
	if err != nil {
		t.Fatalf("NewBoard returned an error: %v", err)
	}

	cards := board.Cards()

	t.Logf("BOARD1\nStarting team: %v", board.StartingTeam())
	for _, card := range cards {
		t.Logf(
			"CardID: %2d | Word: %-15s | Color: %-7v | Revealed: %t",
			card.CardID,
			card.Word,
			card.Color,
			card.Revealed,
		)
	}

	wordPack = loadTestWordPack(t, wpOriginal)
	r = rand.New(rand.NewSource(42))

	board2, err := NewBoard(wordPack.Words, "en", r)
	if err != nil {
		t.Fatalf("NewBoard returned an error: %v", err)
	}

	cards = board2.Cards()

	t.Logf("BOARD2\nStarting team: %v", board2.StartingTeam())
	for _, card := range cards {
		t.Logf(
			"CardID: %2d | Word: %-15s | Color: %-7v | Revealed: %t",
			card.CardID,
			card.Word,
			card.Color,
			card.Revealed,
		)
	}

	if !reflect.DeepEqual(board, board2) {
		t.Errorf("Boards generated with the same seed are not equal")
	}
}

func TestNewBoardWithDuplicateKey(t *testing.T) {
	wpDpKey := "wp_test/wp_duplicateKey.json"

	wordPack := loadTestWordPack(t, wpDpKey)
	r := rand.New(rand.NewSource(42))

	_, err := NewBoard(wordPack.Words, "en", r)
	if err == nil {
		t.Fatal("expected an error, got none")
	}
	if !errors.Is(err, ErrInvalidWordPack) {
		t.Fatalf("\nwrong error: expected %v, got %v\n", ErrInvalidWordPack, err)
	}
	t.Logf("expected error received: %v", err)
}

func TestNewBoardDuplicateText(t *testing.T) {
	wpDpText := "wp_test/wp_duplicateText.json"

	wordPack := loadTestWordPack(t, wpDpText)
	r := rand.New(rand.NewSource(42))

	_, err := NewBoard(wordPack.Words, "en", r)
	if err == nil {
		t.Fatal("expected an error, got none")
	}
	if !errors.Is(err, ErrNotEnoughWords) {
		t.Fatalf("\nwrong error: expected: %v, got: %v\n", ErrNotEnoughWords, err)
	}
	t.Logf("expected error received: %v", err)
}

func TestNewBoardWithNotEnoughWords(t *testing.T) {
	wpShort := "wp_test/wp_notEnoughWords.json"

	wordPack := loadTestWordPack(t, wpShort)
	r := rand.New(rand.NewSource(42))

	_, err := NewBoard(wordPack.Words, "en", r)
	if err == nil {
		t.Fatal("expected an error, got none")
	}
	if !errors.Is(err, ErrNotEnoughWords) {
		t.Fatalf("\nwrong error: expected %v, got %v\n", ErrNotEnoughWords, err)
	}
	t.Logf("\nexpected error received: %v\n", err)
}

func TestNewBoardSkipsDuplicateTexts(t *testing.T) {
	wordPack := loadTestWordPack(t, "wp_test/wp_skipSameText.json")

	for seed := int64(1); seed <= 50; seed++ {
		r := rand.New(rand.NewSource(seed))

		board, err := NewBoard(wordPack.Words, "en", r)
		if err != nil {
			t.Fatalf("seed %d: unexpected error: %v", seed, err)
		}

		cards := board.Cards()
		if len(cards) != BoardSize {
			t.Fatalf("seed %d: expected %d cards, got %d", seed, BoardSize, len(cards))
		}

		seen := make(map[string]struct{}, BoardSize)
		for _, card := range cards {
			if _, exists := seen[card.Word]; exists {
				t.Fatalf("seed %d: duplicate word on board: %s", seed, card.Word)
			}
			seen[card.Word] = struct{}{}
		}
	}
}