# Difficulty Levels & Hints System

## What Was Added

### 1. **Puzzle Difficulty System**

#### Difficulty Calculation
Difficulty is automatically determined by the number of empty cells in each puzzle:

| Empty Cells | Difficulty | Color |
|-------------|-----------|-------|
| ≤ 50 | Easy | 🟢 Green |
| 51-56 | Medium | 🟠 Amber |
| 57-62 | Hard | 🔴 Red |
| 63+ | Expert | 🟣 Purple |

#### Current Puzzle Setup
- **Puzzle 1** (~47 empty) → **Easy** (0 hints)
- **Puzzle 2** (~54 empty) → **Medium** (0 hints)
- **Puzzle 3** (~63 empty) → **Hard** (4 hints)
- **Puzzle 4** (~66 empty) → **Hard** (4 hints)
- **Puzzle 5** (~70 empty) → **Expert** (5 hints)

#### Display
Difficulty badge shown next to puzzle name with:
- Color-coded pill badge
- Text label (Easy/Medium/Hard/Expert)
- 💡 Hint counter (only for Hard/Expert puzzles)

### 2. **Hints System**

#### How Hints Work
- **Hard puzzles**: 4 hints available
- **Expert puzzles**: 5 hints available
- **Easy/Medium puzzles**: No hints (puzzle is manageable)

#### Hint Mechanics
When you tap the "Hint" button:
1. A random empty cell is selected
2. The correct value from the solution is filled in
3. Hint counter decrements
4. Previous hint count is displayed in status message

#### Hints Persist
- Hints used are tracked per puzzle
- Stored in localStorage alongside other progress
- If you leave and return, hint usage is preserved

#### UI Elements
**Desktop/Tablet**: Hint button appears in number selector bar
```
Number: 1 2 3 4 5 6 7 8 9 None   💡 Hint (4)
```

**Mobile**: Hint button in the sticky bottom keypad
```
Next | Save | 💡(4) | Restart
```

**Compact Controls**: Hint button in main controls bar (desktop only)

### 3. **Code Changes**

#### New Functions
```tsx
// Determine difficulty based on empty cells
const getDifficulty = (grid: Grid): "Easy" | "Medium" | "Hard" | "Expert"

// Get color for difficulty badge
const getDifficultyColor = (difficulty: string): string

// Handle hint button press
function handleHint() {
  // Find empty cells
  // Pick random one
  // Fill with correct value
  // Track hint usage
}
```

#### New State
```tsx
const [hintsUsed, setHintsUsed] = useState<Map<number, number>>()
const difficulty = getDifficulty(PUZZLES[puzzleIndex].grid)
const maxHints = difficulty === "Expert" ? 5 : difficulty === "Hard" ? 4 : 0
const currentHintsUsed = hintsUsed.get(puzzleIndex) || 0
const hintsRemaining = Math.max(0, maxHints - currentHintsUsed)
```

#### Storage Integration
```tsx
// Hints saved to localStorage
hintsUsed: Array.from(hintsUsed.entries())

// Hints restored on page load
setHintsUsed(new Map(saved.hintsUsed.filter(...)))
```

---

## User Experience

### Easy Puzzles
✅ No hints needed - straightforward logic  
✅ Difficulty badge shows "Easy" in green  
✅ Users feel confident solving

### Medium Puzzles
✅ Still manageable without hints  
✅ For players who want a gentle challenge  
✅ Builds up to harder content

### Hard Puzzles
💡 4 hints available  
🎯 Requires more logical deduction  
📍 Hints help when stuck on a cell  
🟣 Purple badge signals increased difficulty

### Expert Puzzles
💡💡💡💡💡 5 hints available  
🧠 Maximum challenge - advanced techniques needed  
⭐ Final challenge before completing phrase  
🎉 Feel accomplished when solved

---

## Technical Details

### Difficulty Algorithm
```tsx
const getDifficulty = (grid: Grid) => {
  const emptyCells = grid.flat().filter((v) => v === 0).length
  if (emptyCells <= 50) return "Easy"
  if (emptyCells <= 56) return "Medium"
  if (emptyCells <= 62) return "Hard"
  return "Expert"
}
```

### Hint Selection
- Finds ALL empty cells in current grid
- Randomly picks one (no algorithm preference)
- Fills with solution value
- Automatically deselects and updates grid
- Counts as one hint usage

### Hints Tracking
- Map structure: `puzzleIndex → hintCount`
- Persists across browser sessions
- Scoped per puzzle (can use all 4 hints on Puzzle 3, then get fresh 4 on Puzzle 4)
- Displayed in real-time

---

## UI Placement

### Header (below puzzle name)
```
Puzzle 3
🔴 Hard  💡 2/4 hints
Tap a number, then tap a square.
```

### Desktop Number Selector (right-aligned)
```
Number: 1 2 3 4 5 6 7 8 9 None   💡 Hint (2)
```

### Mobile Bottom Keypad
```
Next | Save | 💡(2) | Restart
1 2 3 4 5 6 7 8 9
```

### Disabled State
- Button shows reduced opacity when `hintsRemaining === 0`
- Status message shows: "No hints remaining for this puzzle."

---

## Future Enhancements (Optional)

If you want to expand the hints system:

1. **Candidate Hints** - Show possible numbers for a cell instead of filling it
2. **Technique Hints** - Explain which sudoku technique to use
3. **Hint Levels** - Different hint types (Easy hint vs. Hard hint)
4. **Achievement System** - Badge for solving without using hints
5. **Difficulty Adjustment** - Let users choose their own difficulty
6. **Hard Puzzle Unlock** - Require Easy/Medium completion before Hard becomes available

---

## Files Modified

| File | Changes |
|------|---------|
| `app/page.tsx` | Added difficulty functions, hints state, hint button, UI badges |
| **No CSS changes needed** | Animations already in place, reused colors |

Total additions: ~120 lines of code (functions + state + UI buttons + handlers)
