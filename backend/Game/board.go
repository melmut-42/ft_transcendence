package game

import "math/rand/v2"

const (
	BoardSize          int = 25
	StartTeamCardsSize int = 9
	OtherTeamCardsSize int = 8
	NeutralCardsSize   int = 7
	AssassinCardsSize  int = 1
)

type Card struct {
	CardID   int       `json:"card_id"`
	Word     string    `json:"word"`
	Color    CardColor `json:"color"`
	Revealed bool      `json:"revealed"`
}

type Board struct {
	cards        [BoardSize]Card
	startingTeam Team
}

func (b *Board) StartingTeam() Team {
	return b.startingTeam
}

func (b *Board) Cards() []Card {
	cards := make([]Card, BoardSize)
	copy(cards, b.cards[:])

	return cards
}

func NewBoard(wordPool []Word, language string, r *rand.Rand) (*Board, error) {
	if r == nil {
		return nil, ErrNilRandomSource
	}
	cards, startingTeam, err := generateCards(wordPool, language, r)
	if err != nil {
		return nil, err
	}

	board := &Board{
		startingTeam: startingTeam,
	}
	copy(board.cards[:], cards)

	return board, nil
}

func (b *Board) Reveal(cardID int) (Card, error) {
	if cardID > BoardSize || cardID < 1 {
		return Card{}, ErrInvalidCard
	}
	target := &b.cards[cardID-1]
	if target.Revealed {
		return Card{}, ErrCardAlreadyRevealed
	}
	target.Revealed = true
	return *target, nil
}
