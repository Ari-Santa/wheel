# Spinning Wheel of Fortune - Implementation Prompt

## Overview
Build a wheel of fortune web application with two game modes: Normal and Battle Royale. The interface should feature a dark theme with orange accent colors.

## Features

### Game Modes
1. **Normal Mode**
   - Single player spins
   - Wheel displays random outcomes
   - Results are announced and tracked
   - Can spin multiple times in succession

2. **Battle Royale Mode**
   - Multiple players in a bracket/elimination format
   - Players take turns spinning the wheel
   - Wheel determines outcomes (wins/losses/special events)
   - Players are eliminated or advance based on results
   - Last player standing wins

### Player Management
- Display a list of player names (can be added/removed)
- Show current active player (highlighted)
- Display player status (active, eliminated, winner)
- Support for 2-64 players in battle royale mode

### Wheel of Fortune
- Visual spinning wheel with multiple segments
- Segments display different outcomes/values
- Smooth spinning animation
- Clear indication of result after spin
- Customizable segments for different game modes

### UI/UX Requirements
- **Dark Theme**: Primary background dark (charcoal/dark gray)
- **Orange Accents**: Use orange (#FF8C00 or similar) for:
  - Spin button
  - Active player highlight
  - Wheel segments (alternating with other dark colors)
  - Important UI elements
- **Layout**:
  - Player list on left side or top (scrollable for larger player counts)
  - Large wheel display in center
  - Spin button below wheel
  - Game status/results panel
  - Compact/condensed player list view for 16+ players
- **Responsive**: Works on desktop and tablet

### Game Flow

#### Normal Mode
1. Player enters their name
2. Name appears in player list
3. Click "Spin Wheel" button
4. Wheel spins with animation
5. Result is displayed
6. Add another player or continue spinning

#### Battle Royale Mode
1. Add 2-64 players
2. Click "Start Battle Royale"
3. Current player is highlighted
4. Player clicks "Spin Wheel"
5. Wheel spins and determines outcome:
   - Win: Player advances to next round
   - Loss: Player is eliminated
   - Special: Random event (skip turn, double spin, etc.)
6. Next player's turn or round advances
7. Continue until one player remains (winner)

### Visual Design Details
- **Wheel**: Colorful segments with smooth gradients
- **Animations**: Smooth spinning, fade transitions
- **Color Palette**:
  - Background: #1a1a1a or #2d2d2d
  - Text: #ffffff
  - Accents: #FF8C00 (orange)
  - Secondary: #444444, #555555 (grays)
  - Wheel segments: Mix of orange, purple, blue, green on dark backgrounds
- **Typography**: Modern, clean sans-serif (system fonts or web safe)
- **Spacing**: Clear whitespace, good visual hierarchy

### Technical Stack
- Next.js with App Router
- React components
- TypeScript
- Tailwind CSS for styling
- Client-side state management for game state

### Component Structure
- Main page component
- Wheel component (spinning animation)
- Player list component
- Mode selector component
- Game status/results component
- Button components styled with orange accents

## Outcomes/Segments (Examples)
Normal Mode segments could include:
- Lucky! (+100 points)
- Unlucky (-50 points)
- Spin Again
- Double Points
- Lose Turn
- Bonus Round

Battle Royale segments could include:
- Victory
- Defeat
- Immunity (safe this round)
- Double Elimination (eliminate opponent)
- Sudden Death (final spin for elimination)
- Extra Life (revive one eliminated player)

## Success Criteria
- Smooth, responsive wheel spinning animation
- Clear game state management between modes
- Dark theme with orange accents applied consistently
- Player list updates dynamically
- Results clearly displayed after spin
- Works smoothly on desktop browsers
- Code is maintainable with clear component structure
