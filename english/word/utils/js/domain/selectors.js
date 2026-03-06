export function getLastDisplayIndex(state) {
  return state.displayOrder.length - 1;
}

export function getCurrentCardFromState(state) {
  if (!state.cards.length || !state.displayOrder.length) return null;
  const cardIndex = state.displayOrder[state.currentIndex];
  return state.cards[cardIndex] || null;
}
