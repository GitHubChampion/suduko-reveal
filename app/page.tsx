"use client";

import React, { useEffect, useMemo, useState } from "react";

/*
Sudoku Reveal (9x9), mobile friendly, modern interactions.
Phrase reveals one word per completed puzzle.

Features:
- Notes mode (pencil marks)
- Tap a number, then tap cells to place it
- Highlights: selected cell row, column, box, and same numbers
- Live conflict highlighting
- Undo and redo
- Cute reveal modal after each solved puzzle, with Save your place

Setup (Next.js App Router):
- Save as: app/page.tsx
- Put your background image in: public/galaxy-tiger.png
*/

const SIZE = 9;
const SUB = 3;

type Grid = number[][];

type Coord = { r: number; c: number };

type CellNotes = Set<number>;

type NotesGrid = CellNotes[][];

type Action =
  | { kind: "setValue"; r: number; c: number; prev: number; next: number }
  | { kind: "setNotes"; r: number; c: number; prev: number[]; next: number[] };

const STORAGE_KEY = "sudokuReveal.valentine.v1";

const WORDS = ["WILL", "YOU", "BE", "MY", "VALENTINE"]; // One word per puzzle.

const PUZZLES: Array<{ name: string; grid: Grid; solution: Grid }> = [
  {
    name: "Puzzle 1",
    grid: [
      [5, 3, 0, 0, 7, 0, 0, 0, 0],
      [6, 0, 0, 1, 9, 5, 0, 0, 0],
      [0, 9, 8, 0, 0, 0, 0, 6, 0],
      [8, 0, 0, 0, 6, 0, 0, 0, 3],
      [4, 0, 0, 8, 0, 3, 0, 0, 1],
      [7, 0, 0, 0, 2, 0, 0, 0, 6],
      [0, 6, 0, 0, 0, 0, 2, 8, 0],
      [0, 0, 0, 4, 1, 9, 0, 0, 5],
      [0, 0, 0, 0, 8, 0, 0, 7, 9],
    ],
    solution: [
      [5, 3, 4, 6, 7, 8, 9, 1, 2],
      [6, 7, 2, 1, 9, 5, 3, 4, 8],
      [1, 9, 8, 3, 4, 2, 5, 6, 7],
      [8, 5, 9, 7, 6, 1, 4, 2, 3],
      [4, 2, 6, 8, 5, 3, 7, 9, 1],
      [7, 1, 3, 9, 2, 4, 8, 5, 6],
      [9, 6, 1, 5, 3, 7, 2, 8, 4],
      [2, 8, 7, 4, 1, 9, 6, 3, 5],
      [3, 4, 5, 2, 8, 6, 1, 7, 9],
    ],
  },
  {
    name: "Puzzle 2",
    grid: [
      [0, 0, 0, 2, 6, 0, 7, 0, 1],
      [6, 8, 0, 0, 7, 0, 0, 9, 0],
      [1, 9, 0, 0, 0, 4, 5, 0, 0],
      [8, 2, 0, 1, 0, 0, 0, 4, 0],
      [0, 0, 4, 6, 0, 2, 9, 0, 0],
      [0, 5, 0, 0, 0, 3, 0, 2, 8],
      [0, 0, 9, 3, 0, 0, 0, 7, 4],
      [0, 4, 0, 0, 5, 0, 0, 3, 6],
      [7, 0, 3, 0, 1, 8, 0, 0, 0],
    ],
    solution: [
      [4, 3, 5, 2, 6, 9, 7, 8, 1],
      [6, 8, 2, 5, 7, 1, 4, 9, 3],
      [1, 9, 7, 8, 3, 4, 5, 6, 2],
      [8, 2, 6, 1, 9, 5, 3, 4, 7],
      [3, 7, 4, 6, 8, 2, 9, 1, 5],
      [9, 5, 1, 7, 4, 3, 6, 2, 8],
      [5, 1, 9, 3, 2, 6, 8, 7, 4],
      [2, 4, 8, 9, 5, 7, 1, 3, 6],
      [7, 6, 3, 4, 1, 8, 2, 5, 9],
    ],
  },
  {
    name: "Puzzle 3",
    grid: [
      [0, 2, 0, 6, 0, 8, 0, 0, 0],
      [5, 8, 0, 0, 0, 9, 7, 0, 0],
      [0, 0, 0, 0, 4, 0, 0, 0, 0],
      [3, 7, 0, 0, 0, 0, 5, 0, 0],
      [6, 0, 0, 0, 0, 0, 0, 0, 4],
      [0, 0, 8, 0, 0, 0, 0, 1, 3],
      [0, 0, 0, 0, 2, 0, 0, 0, 0],
      [0, 0, 9, 8, 0, 0, 0, 3, 6],
      [0, 0, 0, 3, 0, 6, 0, 9, 0],
    ],
    solution: [
      [1, 2, 3, 6, 7, 8, 9, 4, 5],
      [5, 8, 4, 2, 3, 9, 7, 6, 1],
      [9, 6, 7, 1, 4, 5, 3, 2, 8],
      [3, 7, 2, 4, 6, 1, 5, 8, 9],
      [6, 9, 1, 5, 8, 3, 2, 7, 4],
      [4, 5, 8, 7, 9, 2, 6, 1, 3],
      [8, 3, 6, 9, 2, 4, 1, 5, 7],
      [2, 1, 9, 8, 5, 7, 4, 3, 6],
      [7, 4, 5, 3, 1, 6, 8, 9, 2],
    ],
  },
  {
    name: "Puzzle 4",
    grid: [
      [0, 0, 0, 0, 0, 0, 2, 0, 0],
      [0, 8, 0, 0, 0, 7, 0, 9, 0],
      [6, 0, 2, 0, 0, 0, 5, 0, 0],
      [0, 7, 0, 0, 6, 0, 0, 0, 0],
      [0, 0, 0, 9, 0, 1, 0, 0, 0],
      [0, 0, 0, 0, 2, 0, 0, 4, 0],
      [0, 0, 5, 0, 0, 0, 6, 0, 3],
      [0, 9, 0, 4, 0, 0, 0, 7, 0],
      [0, 0, 6, 0, 0, 0, 0, 0, 0],
    ],
    solution: [
      [9, 5, 7, 6, 1, 3, 2, 8, 4],
      [4, 8, 3, 2, 5, 7, 1, 9, 6],
      [6, 1, 2, 8, 4, 9, 5, 3, 7],
      [1, 7, 8, 3, 6, 4, 9, 5, 2],
      [5, 2, 4, 9, 7, 1, 3, 6, 8],
      [3, 6, 9, 5, 2, 8, 7, 4, 1],
      [8, 4, 5, 7, 9, 2, 6, 1, 3],
      [2, 9, 1, 4, 3, 6, 8, 7, 5],
      [7, 3, 6, 1, 8, 5, 4, 2, 9],
    ],
  },
  {
    name: "Puzzle 5",
    grid: [
      [8, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 3, 6, 0, 0, 0, 0, 0],
      [0, 7, 0, 0, 9, 0, 2, 0, 0],
      [0, 5, 0, 0, 0, 7, 0, 0, 0],
      [0, 0, 0, 0, 4, 5, 7, 0, 0],
      [0, 0, 0, 1, 0, 0, 0, 3, 0],
      [0, 0, 1, 0, 0, 0, 0, 6, 8],
      [0, 0, 8, 5, 0, 0, 0, 1, 0],
      [0, 9, 0, 0, 0, 0, 4, 0, 0],
    ],
    solution: [
      [8, 1, 2, 7, 5, 3, 6, 4, 9],
      [9, 4, 3, 6, 8, 2, 1, 7, 5],
      [6, 7, 5, 4, 9, 1, 2, 8, 3],
      [1, 5, 4, 2, 3, 7, 8, 9, 6],
      [3, 6, 9, 8, 4, 5, 7, 2, 1],
      [2, 8, 7, 1, 6, 9, 5, 3, 4],
      [5, 2, 1, 9, 7, 4, 3, 6, 8],
      [4, 3, 8, 5, 2, 6, 9, 1, 7],
      [7, 9, 6, 3, 1, 8, 4, 5, 2],
    ],
  },
];

function cloneGrid(g: Grid): Grid {
  return g.map((row) => row.slice());
}

function makeNotesGrid(): NotesGrid {
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => new Set<number>())
  );
}

function cloneNotesGrid(n: NotesGrid): NotesGrid {
  return n.map((row) => row.map((cell) => new Set<number>(cell)));
}

function cellKey(r: number, c: number): string {
  return `${r}-${c}`;
}

function sameBox(a: Coord, b: Coord): boolean {
  return (
    Math.floor(a.r / SUB) === Math.floor(b.r / SUB) &&
    Math.floor(a.c / SUB) === Math.floor(b.c / SUB)
  );
}

function digitsRow(): number[] {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9];
}

function computeConflicts(grid: Grid): Set<string> {
  const errors = new Set<string>();
  const mark = (r1: number, c1: number, r2: number, c2: number) => {
    errors.add(cellKey(r1, c1));
    errors.add(cellKey(r2, c2));
  };

  // Rows
  for (let r = 0; r < SIZE; r++) {
    const seen = new Map<number, number>();
    for (let c = 0; c < SIZE; c++) {
      const v = grid[r][c];
      if (!v) continue;
      if (seen.has(v)) mark(r, c, r, seen.get(v)!);
      else seen.set(v, c);
    }
  }

  // Columns
  for (let c = 0; c < SIZE; c++) {
    const seen = new Map<number, number>();
    for (let r = 0; r < SIZE; r++) {
      const v = grid[r][c];
      if (!v) continue;
      if (seen.has(v)) mark(r, c, seen.get(v)!, c);
      else seen.set(v, r);
    }
  }

  // Boxes
  for (let br = 0; br < SIZE; br += SUB) {
    for (let bc = 0; bc < SIZE; bc += SUB) {
      const seen = new Map<number, [number, number]>();
      for (let r = br; r < br + SUB; r++) {
        for (let c = bc; c < bc + SUB; c++) {
          const v = grid[r][c];
          if (!v) continue;
          if (seen.has(v)) {
            const [pr, pc] = seen.get(v)!;
            mark(r, c, pr, pc);
          } else {
            seen.set(v, [r, c]);
          }
        }
      }
    }
  }

  return errors;
}

function isSolved(grid: Grid, solution: Grid): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] !== solution[r][c]) return false;
    }
  }
  return true;
}

function serializeState(payload: any) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

function readState(): any | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function FinalEnvelope({ phrase, onRestart }: { phrase: string; onRestart: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-5">
    <div className="rounded-3xl controls-style p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1 text-xs font-semibold tracking-wide text-amber-900">
              <span className="text-base">✉️</span>
              A gold envelope
            </div>
            <div className="mt-3 text-xl font-semibold text-slate-900">You have earned something I want you to open.</div>
            <div className="mt-1 text-sm text-slate-700">When you are ready, open the envelope.</div>
          </div>

          <button
            type="button"
            onClick={onRestart}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            Restart
          </button>
        </div>

        <div className="mt-5 flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group relative w-full max-w-sm overflow-hidden rounded-3xl border border-amber-200/70 controls-style p-6 shadow-sm"
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-16 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-sky-500/20 blur-3xl" />
              <div className="absolute -top-10 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-amber-400/20 blur-3xl" />
            </div>

            <div className="relative">
              <div className="text-5xl">✉️</div>
              <div className="mt-3 text-base font-semibold text-slate-900">Open when you are ready</div>
              <div className="mt-1 text-sm text-slate-700">Tap to reveal the message.</div>
            </div>
          </button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-md overflow-hidden rounded-[28px] controls-style shadow-2xl">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-sky-500/25 blur-3xl" />
              <div className="absolute -top-16 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-amber-400/20 blur-3xl" />
            </div>

            <div className="p-[1px]">
              <div className="rounded-[27px] controls-style">
                <div className="p-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1 text-xs font-semibold tracking-wide text-amber-900">
                    <span className="text-base">💙</span>
                    The message
                  </div>

                  <div className="mt-4 rounded-2xl controls-style p-5">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Will you be my Valentine?</div>
                    <div className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{phrase}</div>
                  </div>

                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-xl bg-gradient-to-r from-sky-600 to-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
                    >
                      Close
                    </button>
                  </div>  
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function Page() {
  const maxPuzzles = Math.min(PUZZLES.length, WORDS.length);

  const [puzzleIndex, setPuzzleIndex] = useState<number>(0);
  const [grid, setGrid] = useState<Grid>(() => cloneGrid(PUZZLES[0].grid));
  const [notes, setNotes] = useState<NotesGrid>(() => makeNotesGrid());

  const [selected, setSelected] = useState<Coord>({ r: 0, c: 0 });
  const [activeNumber, setActiveNumber] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState<boolean>(false);

  const [undoStack, setUndoStack] = useState<Action[]>([]);
  const [redoStack, setRedoStack] = useState<Action[]>([]);

  const [revealed, setRevealed] = useState<Set<number>>(() => new Set());
  const [status, setStatus] = useState<string>("Tap a number, then tap a square.");

  const [wrong, setWrong] = useState<Set<string>>(() => new Set());

  const [showReveal, setShowReveal] = useState<boolean>(false);
  const [lastUnlockedWord, setLastUnlockedWord] = useState<string>("");

  const fixed = useMemo(() => {
    const f = new Set<string>();
    const base = PUZZLES[puzzleIndex].grid;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (base[r][c] !== 0) f.add(cellKey(r, c));
      }
    }
    return f;
  }, [puzzleIndex]);

  const conflicts = useMemo(() => computeConflicts(grid), [grid]);

  const phrase = useMemo(() => {
    const parts: string[] = [];
    for (let i = 0; i < maxPuzzles; i++) {
      parts.push(revealed.has(i) ? WORDS[i] : "____");
    }
    return parts.join(" ");
  }, [revealed, maxPuzzles]);

  const doneAll = revealed.size >= maxPuzzles;

  const selectedValue = grid[selected.r][selected.c];

  const highlight = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < SIZE; i++) {
      set.add(cellKey(selected.r, i));
      set.add(cellKey(i, selected.c));
    }

    const boxR = Math.floor(selected.r / SUB) * SUB;
    const boxC = Math.floor(selected.c / SUB) * SUB;
    for (let r = boxR; r < boxR + SUB; r++) {
      for (let c = boxC; c < boxC + SUB; c++) {
        set.add(cellKey(r, c));
      }
    }

    if (selectedValue) {
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (grid[r][c] === selectedValue) set.add(cellKey(r, c));
        }
      }
    }

    return set;
  }, [selected, grid, selectedValue]);

  function pushAction(action: Action) {
    setUndoStack((prev) => [...prev, action]);
    setRedoStack([]);
  }

  function applyAction(action: Action, direction: "undo" | "redo") {
    if (action.kind === "setValue") {
      setGrid((prev) => {
        const next = cloneGrid(prev);
        next[action.r][action.c] = direction === "undo" ? action.prev : action.next;
        return next;
      });

      // If a value is set, clear notes in that cell (modern sudoku behavior)
      setNotes((prev) => {
        const next = cloneNotesGrid(prev);
        next[action.r][action.c] = new Set<number>();
        return next;
      });

      setSelected({ r: action.r, c: action.c });
      return;
    }

    if (action.kind === "setNotes") {
      setNotes((prev) => {
        const next = cloneNotesGrid(prev);
        const values = direction === "undo" ? action.prev : action.next;
        next[action.r][action.c] = new Set<number>(values);
        return next;
      });
      setSelected({ r: action.r, c: action.c });
      return;
    }
  }

  function handleUndo() {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const action = prev[prev.length - 1];
      const rest = prev.slice(0, -1);
      applyAction(action, "undo");
      setRedoStack((rprev) => [...rprev, action]);
      return rest;
    });
  }

  function handleRedo() {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const action = prev[prev.length - 1];
      const rest = prev.slice(0, -1);
      applyAction(action, "redo");
      setUndoStack((uprev) => [...uprev, action]);
      return rest;
    });
  }

  function setCellValue(r: number, c: number, v: number) {
    if (fixed.has(cellKey(r, c))) return;

    setGrid((prev) => {
      const next = cloneGrid(prev);
      const prevVal = next[r][c];
      if (prevVal === v) return next;

      pushAction({ kind: "setValue", r, c, prev: prevVal, next: v });
      next[r][c] = v;
      return next;
    });

    // Clear notes for that cell
    setNotes((prev) => {
      const next = cloneNotesGrid(prev);
      next[r][c] = new Set<number>();
      return next;
    });

    setSelected({ r, c });
  }

  function toggleCellNote(r: number, c: number, v: number) {
    if (fixed.has(cellKey(r, c))) return;
    if (grid[r][c]) return;

    setNotes((prev) => {
      const next = cloneNotesGrid(prev);
      const before = Array.from(next[r][c]).sort((a, b) => a - b);
      if (next[r][c].has(v)) next[r][c].delete(v);
      else next[r][c].add(v);
      const after = Array.from(next[r][c]).sort((a, b) => a - b);

      pushAction({ kind: "setNotes", r, c, prev: before, next: after });

      return next;
    });

    setSelected({ r, c });
  }

  function handleCellTap(r: number, c: number) {
    setSelected({ r, c });

    if (activeNumber == null) return;

    if (notesMode) {
      toggleCellNote(r, c, activeNumber);
    } else {
      setCellValue(r, c, activeNumber);
    }
  }

  function handleClearSelected() {
    if (fixed.has(cellKey(selected.r, selected.c))) return;
    if (notesMode) {
      // Clear notes in selected cell
      const before = Array.from(notes[selected.r][selected.c]).sort((a, b) => a - b);
      if (before.length === 0) return;
      pushAction({ kind: "setNotes", r: selected.r, c: selected.c, prev: before, next: [] });
      setNotes((prev) => {
        const next = cloneNotesGrid(prev);
        next[selected.r][selected.c] = new Set<number>();
        return next;
      });
      return;
    }

    const prevVal = grid[selected.r][selected.c];
    if (!prevVal) return;
    pushAction({ kind: "setValue", r: selected.r, c: selected.c, prev: prevVal, next: 0 });
    setGrid((prev) => {
      const next = cloneGrid(prev);
      next[selected.r][selected.c] = 0;
      return next;
    });
  }

  function handleCheck() {
    // Clear previous wrong marks each time we check
    setWrong(new Set());

    if (conflicts.size > 0) {
      setStatus("Conflicts found. Fix the highlighted squares.");
      return;
    }

    const current = PUZZLES[puzzleIndex];

    // Mistake check against the solution.
    // Mark any filled cell that does not match the solution.
    const wrongCells = new Set<string>();
    let wrongCount = 0;

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const v = grid[r][c];
        if (!v) continue;
        if (v !== current.solution[r][c]) {
          wrongCells.add(cellKey(r, c));
          wrongCount++;
        }
      }
    }

    if (wrongCount > 0) {
      setWrong(wrongCells);
      setStatus(`Not quite. ${wrongCount} square${wrongCount === 1 ? " is" : "s are"} incorrect.`);
      return;
    }

    // If no filled squares are wrong, we can still be incomplete.
    if (isSolved(grid, current.solution)) {
      if (!revealed.has(puzzleIndex)) {
        const unlocked = WORDS[puzzleIndex];
        setLastUnlockedWord(unlocked);
        setRevealed((prev) => {
          const next = new Set(prev);
          next.add(puzzleIndex);
          return next;
        });
        setShowReveal(true);
        setStatus("Solved. Nice work.");
      } else {
        setStatus("Already solved. You can move to the next puzzle.");
      }
      return;
    }

    setStatus("So far so good. Keep going.");
  }

  function handleResetPuzzle() {
    setGrid(cloneGrid(PUZZLES[puzzleIndex].grid));
    setNotes(makeNotesGrid());
    setUndoStack([]);
    setRedoStack([]);
    setStatus("Reset. Tap a number, then tap a square.");
  }

  function handleNextPuzzle() {
    const nextIndex = Math.min(puzzleIndex + 1, maxPuzzles - 1);
    setPuzzleIndex(nextIndex);
    setGrid(cloneGrid(PUZZLES[nextIndex].grid));
    setNotes(makeNotesGrid());
    setUndoStack([]);
    setRedoStack([]);
    setSelected({ r: 0, c: 0 });
    setActiveNumber(null);
    setNotesMode(false);
    setStatus("Tap a number, then tap a square.");
  }

  function handleRestartAll() {
    setPuzzleIndex(0);
    setGrid(cloneGrid(PUZZLES[0].grid));
    setNotes(makeNotesGrid());
    setUndoStack([]);
    setRedoStack([]);
    setRevealed(new Set<number>());
    setSelected({ r: 0, c: 0 });
    setActiveNumber(null);
    setNotesMode(false);
    setStatus("Tap a number, then tap a square.");
  }

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

  function loadProgressIfAny() {
    const saved = readState();
    if (!saved) return;

    const idx = typeof saved.puzzleIndex === "number" ? saved.puzzleIndex : 0;
    const revArr = Array.isArray(saved.revealed) ? saved.revealed : [];

    const safeIdx = Math.max(0, Math.min(idx, maxPuzzles - 1));

    setPuzzleIndex(safeIdx);

    // Restore grid only if it is a valid 9x9, otherwise default
    if (Array.isArray(saved.grid) && saved.grid.length === SIZE) {
      setGrid(saved.grid);
    } else {
      setGrid(cloneGrid(PUZZLES[safeIdx].grid));
    }

    // Restore notes
    if (Array.isArray(saved.notes) && saved.notes.length === SIZE) {
      const restored: NotesGrid = saved.notes.map((row: any[]) =>
        row.map((cell: any[]) => new Set<number>((Array.isArray(cell) ? cell : []).filter((n) => typeof n === "number")))
      );
      setNotes(restored);
    } else {
      setNotes(makeNotesGrid());
    }

    setRevealed(new Set<number>(revArr.filter((n: any) => typeof n === "number")));
    setUndoStack([]);
    setRedoStack([]);
    setSelected({ r: 0, c: 0 });
    setActiveNumber(null);
    setNotesMode(false);
    setStatus("Welcome back. Progress loaded.");
  }

  useEffect(() => {
    // Load once on mount
    loadProgressIfAny();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Autosave lightly on meaningful state changes
    saveProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzleIndex, revealed]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Keyboard support for desktop
      if (e.key === "Escape") {
        setActiveNumber(null);
        return;
      }

      const { r, c } = selected;

      if (e.key === "ArrowUp") setSelected({ r: Math.max(0, r - 1), c });
      if (e.key === "ArrowDown") setSelected({ r: Math.min(SIZE - 1, r + 1), c });
      if (e.key === "ArrowLeft") setSelected({ r, c: Math.max(0, c - 1) });
      if (e.key === "ArrowRight") setSelected({ r, c: Math.min(SIZE - 1, c + 1) });

      if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
        handleClearSelected();
        return;
      }

      if (/^[1-9]$/.test(e.key)) {
        const v = parseInt(e.key, 10);
        if (notesMode) toggleCellNote(r, c, v);
        else setCellValue(r, c, v);
        return;
      }

      if (e.key.toLowerCase() === "n") {
        setNotesMode((p) => !p);
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, notesMode, activeNumber, fixed, grid, notes]);

  useEffect(() => {
    // Clear active number highlight on puzzle change
    setActiveNumber(null);
  }, [puzzleIndex]);

  const compactControls = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setNotesMode((p) => !p)}
        className={`rounded-xl px-4 py-2 text-sm font-semibold shadow-sm border ${
          notesMode ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-800 border-slate-200"
        }`}
      >
        Notes
      </button>

      <button
        type="button"
        onClick={handleUndo}
        disabled={undoStack.length === 0}
        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm disabled:opacity-50"
      >
        Undo
      </button>

      <button
        type="button"
        onClick={handleRedo}
        disabled={redoStack.length === 0}
        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm disabled:opacity-50"
      >
        Redo
      </button>

      <button
        type="button"
        onClick={handleCheck}
        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
      >
        Check
      </button>

      <button
        type="button"
        onClick={handleResetPuzzle}
        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
      >
        Reset
      </button>

      <button
        type="button"
        onClick={saveProgress}
        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
      >
        Save
      </button>
    </div>
  );

  return (
    <div
      className="min-h-screen p-4 sm:p-6 relative lg:bg-fixed"
      style={{
        backgroundImage: "url('/galaxy-tiger.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* responsive overlay so tiger shows through on all devices */}
      <div className="absolute inset-0 pointer-events-none overlay" />

      <div className="mx-auto max-w-6xl relative z-10">
        <div className="rounded-3xl controls-style p-4 sm:p-5 shadow-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-block rounded-xl px-3 py-2 controls-style">
                <div className="text-2xl font-semibold text-2xl text-strong lg:text-slate-900">Sudoku Reveal</div>
                <div className="text-sm text-strong lg:text-slate-700">Some obstacles are meant to be solved. Not alone. But together.</div>
              </div>
            </div>

            <div className="rounded-2xl controls-style p-4 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-slate-500">Your words</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{phrase}</div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="rounded-2xl controls-style p-4 sm:p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm text-slate-500">{PUZZLES[puzzleIndex].name}</div>
                  <div className="text-base font-semibold text-slate-900">Tap a number, then tap a square.</div>
                </div>
                <div className="text-sm text-slate-600">Word {puzzleIndex + 1} of {maxPuzzles}</div>
              </div>

              <div className="mt-3 hidden sm:block">{compactControls}</div>

              <div className="mt-4 overflow-auto">
                <div className="inline-block rounded-xl border border-slate-200 controls-style">
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: `repeat(${SIZE}, minmax(0, var(--tile-size)))`,
                    }}
                  >
                    {grid.map((row, r) =>
                      row.map((val, c) => {
                        const key = cellKey(r, c);
                        const isFixed = fixed.has(key);
                        const isSel = selected.r === r && selected.c === c;
                        const isConflict = conflicts.has(key);
                        const isWrong = wrong.has(key);
                        const isHighlighted = highlight.has(key);

                        const thickTop = r % 3 === 0;
                        const thickLeft = c % 3 === 0;
                        const thickBottom = r === SIZE - 1;
                        const thickRight = c === SIZE - 1;

                        const cellNotes = notes[r][c];

                        const showSameNumberAccent =
                          selectedValue && grid[r][c] === selectedValue && (r !== selected.r || c !== selected.c);

                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleCellTap(r, c)}
                            className={`relative h-11 w-11 sm:h-12 sm:w-12 select-none border border-slate-200 transition
                              ${isFixed ? "text-slate-900" : "text-slate-700"}
                              ${isConflict ? "bg-rose-50" : isWrong ? "bg-amber-50" : isSel ? "bg-sky-100" : isHighlighted ? "bg-sky-50" : "bg-white"}
                              ${showSameNumberAccent ? "ring-2 ring-slate-900/10" : ""}
                            `}
                            style={{
                              borderTopWidth: thickTop ? 2 : 1,
                              borderLeftWidth: thickLeft ? 2 : 1,
                              borderBottomWidth: thickBottom ? 2 : 1,
                              borderRightWidth: thickRight ? 2 : 1,
                            }}
                          >
                            {val ? (
                              <span className={`text-lg font-semibold ${isFixed ? "" : ""}`}>{val}</span>
                            ) : (
                              <span className="grid h-full w-full grid-cols-3 grid-rows-3 p-1 text-[9px] text-slate-500">
                                {digitsRow().map((d) => (
                                  <span key={d} className="flex items-center justify-center">
                                    {cellNotes.has(d) ? d : ""}
                                  </span>
                                ))}
                              </span>
                            )}

                            {activeNumber && !val && cellNotes.has(activeNumber) ? (
                              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-slate-900/20" />
                            ) : null}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 text-sm text-slate-700">{status}</div>

              {doneAll ? (
                <FinalEnvelope
                  phrase={WORDS.join(" ")}
                  onRestart={handleRestartAll}
                />
              ) : null}

              <div className="mt-4 hidden sm:block">
                <div className="h-px bg-slate-100" />
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleNextPuzzle}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                  >
                    Next puzzle
                  </button>
                  <button
                    type="button"
                    onClick={handleRestartAll}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                  >
                    Restart all
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSelected}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                  >
                    Clear selected
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl controls-style p-5 shadow-sm">
              <div className="text-base font-semibold text-slate-900">A note, not a spoiler</div>
              <div className="mt-2 text-sm text-slate-700">
                Some obstacles are meant to be solved.
                <br />
                Not alone.
                <br />
                But together.
              </div>

              <div className="mt-4 rounded-2xl controls-style p-5 text-sm text-slate-800">
                <div className="font-semibold text-slate-900">How to play</div>
                <div className="mt-2">Choose a number, then tap squares. Turn on Notes to pencil in possibilities.</div>
              </div>

              <div className="mt-4 rounded-xl bg-slate-50/60 backdrop-blur-md border border-white/20 p-4 text-sm text-slate-700">
                <div className="font-semibold text-slate-900">Controls</div>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Select a number, then tap squares.</li>
                  <li>Turn on Notes to pencil in candidates.</li>
                  <li>Undo and Redo work for values and notes.</li>
                  <li>Save stores progress on this device.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky keypad */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 controls-style p-3 sm:hidden safe-bottom-padding" style={{paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))'}}>
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setNotesMode((p) => !p)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold shadow-sm border ${
                notesMode ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-800 border-slate-200"
              }`}
            >
              Notes
            </button>

            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm disabled:opacity-50"
            >
              Undo
            </button>

            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm disabled:opacity-50"
            >
              Redo
            </button>

            <button
              type="button"
              onClick={handleCheck}
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm"
            >
              Check
            </button>

            <button
              type="button"
              onClick={handleClearSelected}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm"
            >
              Clear
            </button>
          </div>

          <div className="mt-2 grid grid-cols-9 gap-2">
            {digitsRow().map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setActiveNumber((prev) => (prev === d ? null : d))}
                className={`rounded-xl border px-0 py-3 text-lg h-11 font-semibold shadow-sm ${
                  activeNumber === d ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-800 border-slate-200"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleNextPuzzle}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm"
            >
              Next
            </button>
            <button
              type="button"
              onClick={saveProgress}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleRestartAll}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm"
            >
              Restart
            </button>
          </div>

          <div className="mt-2 text-xs text-slate-600">
            Tip: Choose a number first. Then tap squares to place it.
          </div>
        </div>
      </div>

      {/* Desktop number selector */}
      <div className="mx-auto mt-4 hidden max-w-6xl sm:block">
        <div className="rounded-2xl controls-style p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-slate-800 mr-2">Number:</div>
            {digitsRow().map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setActiveNumber((prev) => (prev === d ? null : d))}
                className={`rounded-xl border px-4 py-2 text-base font-semibold shadow-sm ${
                  activeNumber === d ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-800 border-slate-200"
                }`}
                style={{minWidth: 44, minHeight: 44}}
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setActiveNumber(null)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-base font-semibold text-slate-700 shadow-sm"
            >
              None
            </button>
          </div>
        </div>
      </div>

      {/* Reveal modal */}
      {showReveal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-2xl">
            {/* Lux glow */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-28 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-sky-500/25 blur-3xl" />
              <div className="absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-400/20 blur-3xl" />
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-900/5 to-transparent" />
            </div>

            {/* Gold rim */}
            <div className="p-[1px]">
              <div className="rounded-[27px] controls-style">
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1 text-xs font-semibold tracking-wide text-amber-900">
                        <span className="text-base">✨</span>
                        A promise
                      </div>
                      <div className="mt-3 text-2xl font-semibold text-slate-900">I will love you.
                      And I do not say that lightly.</div>
                      <div className="mt-1 text-sm text-slate-700">Love begins with intention.</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowReveal(false)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>

                  <div className="mt-5 rounded-2xl controls-style p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Your new word</div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="text-4xl font-extrabold tracking-tight text-slate-900">{lastUnlockedWord}</div>
                      <div className="rounded-xl controls-style px-3 py-2 shadow-sm border border-slate-100">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500">Message</div>
                        <div className="mt-0.5 text-sm font-semibold text-slate-900">{phrase}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl controls-style p-4">
                    <div className="text-sm font-semibold text-slate-900">Ready to continue our journey?</div>
                    <div className="mt-1 text-sm text-slate-700">If you cannot finish in one sitting, it will be right here when you come back.</div>
                  </div>

                  <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        saveProgress();
                        setShowReveal(false);
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                    >
                      Save for later
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowReveal(false);
                        if (puzzleIndex < maxPuzzles - 1) handleNextPuzzle();
                        else setStatus("All words unlocked.");
                      }}
                      className="rounded-xl bg-gradient-to-r from-sky-600 to-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
                    >
                      Continue
                    </button>
                  </div>

                  <div className="mt-3 text-xs text-slate-500">Your progress will be saved on this device.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
