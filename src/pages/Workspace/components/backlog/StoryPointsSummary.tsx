type StoryPointsSummaryProps = {
  cards: Array<{ storyPoints?: number }>
}

export function StoryPointsSummary({ cards }: StoryPointsSummaryProps) {
  const totalPoints = cards.reduce((sum, card) => sum + (card.storyPoints || 0), 0)
  
  if (totalPoints === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Total:</span>
      <span className="font-semibold">{totalPoints} pts</span>
    </div>
  )
}



