package game


const (
	BoardSize          int = 25
	StartTeamCardsSize int = 9
	OtherTeamCardsSize int = 8
	NeutralCardsSize   int = 7
	AssassinCardsSize  int = 1
)

type Word struct {
	Key          string            `json:"key"`
	Translations map[string]string `json:"translations"`
}

type WordPack struct {
	Words []Word `json:"words"`
}

type Card struct {
	CardID   int       `json:"card_id"`
	Word     string    `json:"word"`
	Color    CardColor `json:"color"`
	Revealed bool      `json:"revealed"`
}

type Board struct {
	cards [BoardSize]Card
}

func NewBoard(cards []Card) (*Board, error) {
	if len(cards) != BoardSize {
		return nil, ErrInvalidCard
	}

	board := &Board{}

	for i, card := range cards {
		if card.CardID != i+1 || card.Word == "" {
			return nil, ErrInvalidCard
		}

		board.cards[i] = card
	}

	return board, nil
}

func (b *Board) Cards() []Card {
	cards := make([]Card, BoardSize)
	copy(cards, b.cards[:])

	return cards
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