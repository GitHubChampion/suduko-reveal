# How "Saved. Come back anytime" Works

## Save Mechanism (localStorage)

Your progress is saved automatically using **browser localStorage**, which is a built-in web storage system that persists data on your device.

### Where It's Saved
- **Location**: Your device's browser storage (not on any server)
- **Key**: `sudokuReveal.valentine.v1` (stored locally in your browser)
- **Format**: JSON object containing:
  - Current puzzle index (which puzzle you're on)
  - The grid state (which cells you've filled)
  - Your notes (pencil marks)
  - Which puzzles have been revealed

### When It's Saved
```tsx
// Auto-save happens on these changes:
1. When you move to a different puzzle
2. When you reveal a new word
3. Every time you manually click "Save"
4. Uses useEffect to watch puzzleIndex and revealed state
```

### How You Load It Back
When you return to this page in the **same browser, same device**:
1. The page checks for saved data on load
2. If found, it restores: current puzzle, grid, notes, revealed words
3. You see "Welcome back. Progress loaded." message
4. You can immediately continue where you left off

---

## Multiple Users - The Current Limitation

**Important**: This app currently does **NOT support multiple users** on the same device because localStorage is browser-scoped, not user-scoped.

### What Happens with Multiple Users

| Scenario | Result |
|----------|--------|
| User A plays on Chrome Desktop | ✅ Saved in Chrome's localStorage |
| User B plays on Firefox Desktop | ✅ Saved in Firefox's localStorage (separate) |
| User A plays on same Desktop browser again | ✅ Loads User A's progress |
| User C plays on same Desktop Chrome browser | ❌ **Overwrites** User A's progress |
| User plays on Desktop vs. Mobile | ✅ Separate (different browsers/devices) |

### Why This Happens
localStorage is keyed by:
- Browser type (Chrome ≠ Firefox ≠ Safari)
- Device (Desktop ≠ Mobile)
- Domain (sudoku-reveal.com is separate from localhost:3000)

BUT is **NOT** keyed by user identity (no login system).

---

## Solutions for Multi-User Support

If you wanted multiple users to have separate progress on the same device:

### Option 1: Add User Selection (Simplest)
```tsx
// On first load, prompt: "Who are you?"
// Store selected username in localStorage as well
// Prepend username to STORAGE_KEY

const STORAGE_KEY = `sudokuReveal.valentine.v1.${username}`;
```
**Pros**: Simple, no backend needed  
**Cons**: Can't share progress between users

### Option 2: Cloud Sync (Most Robust)
```tsx
// Send data to a database (Firebase, Supabase, your own API)
// Require login with email/password
// Sync saves to cloud and restore from cloud
```
**Pros**: Works on any device, automatic backup  
**Cons**: Requires backend infrastructure

### Option 3: Export/Import JSON
```tsx
// Add "Export Progress" button → downloads JSON file
// Add "Import Progress" button → uploads JSON file
// Users manually manage their saves
```
**Pros**: No backend, full user control  
**Cons**: Manual and cumbersome

---

## Current Implementation in Code

### Auto-Save (lines 670-679)
```tsx
function saveProgress() {
  const payload = {
    puzzleIndex,
    revealed: Array.from(revealed),
    grid,
    notes: notes.map((row) => row.map((cell) => Array.from(cell).sort((a, b) => a - b))),
  };
  serializeState(payload);
  setStatus("Saved. Come back anytime.");
}
```

### Auto-Restore (lines 708-748)
```tsx
function loadProgressIfAny() {
  const saved = readState();
  if (!saved) return; // No previous save found
  
  // Restore all state from saved data
  setPuzzleIndex(saved.puzzleIndex);
  setGrid(saved.grid);
  setNotes(restored);
  setRevealed(new Set<number>(saved.revealed));
  setStatus("Welcome back. Progress loaded.");
}

// Called on component mount
useEffect(() => {
  loadProgressIfAny();
}, []);
```

### Triggered Auto-Save (lines 750-758)
```tsx
useEffect(() => {
  saveProgress();
}, [puzzleIndex, revealed]); // Auto-save when these change
```

---

## Technical Details

### localStorage Limitations
- **Storage limit**: 5-10MB per domain (enough for thousands of puzzles)
- **Persistence**: Cleared when browser cache is cleared or in private/incognito mode
- **Scope**: Only accessible to same domain, same browser
- **Security**: Readable by any JavaScript on your page (no encryption)

### Browser Privacy Modes
| Mode | localStorage | Result |
|------|-------------|--------|
| Normal browsing | ✅ Persists | ✅ "Come back anytime" works |
| Incognito/Private | ❌ Clears on close | ❌ Progress lost on close |
| Guest browsing | ⚠️ Depends on browser | ⚠️ May not save |

---

## Recommendations

**For a Valentine's Day app**: Current implementation is **perfect** ✨
- One person plays, saves progress locally
- They can close and return anytime in the same browser
- No infrastructure needed
- No privacy concerns (data stays on device)

**If you want multi-user support**:
- Add simple username selection before first puzzle
- Or add cloud sync with user authentication
- Consider the use case: Is this meant for one couple or multiple users?

