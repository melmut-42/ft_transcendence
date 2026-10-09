package game

import "math/rand/v2"

const (
	BoardSize          int = 25
	StartTeamCardsSize int = 9
	OtherTeamCardsSize int = 8
	NeutralCardsSize   int = 7
	AssassinCardsSize  int = 1
)

type card struct {
	cardID   int
	word     string
	color    CardColor
	revealed bool
}

type Board struct {
	cards        [BoardSize]card
	startingTeam Team
}

func (b *Board) StartingTeam() Team {
	return b.startingTeam
}

func (b *Board) Cards() []card {
	cards := make([]card, BoardSize)
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

func (b *Board) reveal(cardID int) (card, error) {
	if cardID > BoardSize || cardID < 1 {
		return card{}, ErrInvalidCard
	}
	target := &b.cards[cardID-1]
	if target.revealed {
		return card{}, ErrCardAlreadyRevealed
	}
	target.revealed = true
	return *target, nil
}
