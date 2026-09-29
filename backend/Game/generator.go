package game

import "math/rand"

func pickWords(pool []Word) ([]Word) {
	indexes := rand.Perm(len(pool))
	selectedWords := make([]Word, BoardSize)

	for i, index := range indexes[:BoardSize] {
		selectedWords[i] = pool[index]
	}

	return selectedWords
}

func randomTeam() Team {
	if rand.Intn(2) == 0 {
		return TeamRed
	}

	return TeamBlue
}

func appendColors(colors []CardColor, color CardColor, count int) []CardColor {
	for i := 0; i < count; i++ {
		colors = append(colors, color)
	}
	return colors
}

func buildColors(startingTeam Team) []CardColor {
	startColor := CardColorRed
	otherColor := CardColorBlue

	if startingTeam == TeamBlue {
		startColor = CardColorBlue
		otherColor = CardColorRed
	}

	colors := make([]CardColor, 0, BoardSize)

	colors = appendColors(colors, startColor, StartTeamCardsSize)
	colors = appendColors(colors, otherColor, OtherTeamCardsSize)
	colors = appendColors(colors, CardColorNeutral, NeutralCardsSize)
	colors = appendColors(colors, CardColorAssassin, AssassinCardsSize)

	rand.Shuffle(len(colors), func(i, j int) {
		colors[i], colors[j] = colors[j], colors[i]
	})

	return colors
}

func GenerateCards(wordPool []Word, language string) ([]Card, Team, error) {
	words := pickWords(wordPool)

	startingTeam := randomTeam()
	colors := buildColors(startingTeam)

	cards := make([]Card, BoardSize)

	for i, word := range words {
		cards[i] = Card{
			CardID:   i + 1,
			Word:     word.Translations[language],
			Color:    colors[i],
			Revealed: false,
		}
	}

	return cards, startingTeam, nil
}
