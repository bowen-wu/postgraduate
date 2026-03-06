export function reduceSession(state, action) {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.payload };
    case 'SET_CURRENT_INDEX':
      return { ...state, currentIndex: action.payload };
    case 'TOGGLE_AUTOPLAY':
      return { ...state, autoPlay: !state.autoPlay };
    default:
      return state;
  }
}
