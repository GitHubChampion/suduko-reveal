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
const HINTS_STORAGE_KEY = "sudokuReveal.hints.v1";

const WORDS = ["WILL", "YOU", "BE", "MY", "VALENTINE"]; // One word per puzzle.

// Difficulty levels based on empty cells: Easy (45-50), Medium (51-56), Hard (57-62), Expert (63+)
const getDifficulty = (grid: Grid): "Easy" | "Medium" | "Hard" | "Expert" => {
  const emptyCells = grid.flat().filter((v) => v === 0).length;
  if (emptyCells <= 50) return "Easy";
  if (emptyCells <= 56) return "Medium";
  if (emptyCells <= 62) return "Hard";
  return "Expert";
};

const getDifficultyColor = (difficulty: string): string => {
  switch (difficulty) {
    case "Easy":
      return "#10b981"; // green
    case "Medium":
      return "#f59e0b"; // amber
    case "Hard":
      return "#ef4444"; // red
    case "Expert":
      return "#8b5cf6"; // purple
    default:
      return "#6b7280";
  }
};

// Get border opacity based on difficulty (more transparent for harder puzzles)
const getBorderOpacity = (difficulty: string): number => {
  switch (difficulty) {
    case "Easy":
      return 1; // fully opaque
    case "Medium":
      return 0.7; // 70% opaque
    case "Hard":
      return 0.5; // 50% opaque
    case "Expert":
      return 0.3; // 30% opaque
    default:
      return 1;
  }
};

// Raw puzzle data (will be sorted by difficulty)
const PUZZLE_DATA: Array<{ name: string; grid: Grid; solution: Grid }> = [
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
      [6, 0, 0, 0, 7, 0, 0, 9, 0],
      [0, 0, 0, 0, 0, 4, 5, 0, 0],
      [0, 0, 0, 1, 0, 0, 0, 4, 0],
      [0, 0, 4, 6, 0, 2, 9, 0, 0],
      [0, 5, 0, 0, 0, 3, 0, 2, 8],
      [0, 0, 9, 3, 0, 0, 0, 0, 0],
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
      [9, 0, 3, 6, 0, 0, 0, 0, 0],
      [0, 7, 0, 0, 9, 0, 2, 0, 0],
      [0, 5, 0, 0, 0, 7, 0, 0, 0],
      [0, 0, 0, 0, 4, 5, 7, 0, 0],
      [0, 0, 0, 1, 0, 0, 0, 3, 0],
      [0, 2, 1, 0, 0, 0, 0, 6, 8],
      [0, 0, 8, 5, 0, 0, 0, 1, 0],
      [0, 9, 0, 0, 0, 0, 4, 0, 2],
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

// SECOND SET OF PUZZLES - "Round 2: The Encore"
const PUZZLE_DATA_SET2: Array<{ name: string; grid: Grid; solution: Grid }> = [
  {
    name: "Encore 1",
    grid: [
      [0, 0, 7, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 2, 0, 8, 0, 5],
      [0, 0, 0, 3, 0, 0, 0, 0, 0],
      [0, 9, 0, 0, 0, 2, 0, 8, 0],
      [0, 0, 1, 0, 0, 0, 2, 0, 0],
      [0, 5, 0, 4, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 3, 0, 0, 0],
      [1, 0, 4, 0, 9, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 7, 0, 0],
    ],
    solution: [
      [2, 4, 7, 8, 6, 1, 9, 3, 1],
      [3, 8, 9, 7, 2, 5, 8, 4, 5],
      [6, 1, 5, 3, 4, 9, 7, 2, 8],
      [7, 9, 3, 5, 1, 2, 4, 8, 6],
      [4, 6, 1, 9, 8, 7, 2, 5, 3],
      [8, 5, 2, 4, 3, 6, 5, 1, 9],
      [9, 7, 8, 2, 5, 3, 1, 6, 4],
      [1, 3, 4, 6, 9, 8, 3, 7, 2],
      [5, 2, 6, 1, 7, 4, 7, 9, 8],
    ],
  },
  {
    name: "Encore 2",
    grid: [
      [0, 0, 0, 0, 3, 0, 0, 2, 0],
      [0, 7, 0, 0, 0, 0, 0, 0, 3],
      [0, 0, 5, 0, 0, 0, 4, 0, 0],
      [0, 0, 0, 6, 0, 0, 0, 0, 0],
      [8, 0, 0, 0, 0, 0, 0, 0, 7],
      [0, 0, 0, 0, 0, 5, 0, 0, 0],
      [0, 0, 6, 0, 0, 0, 3, 0, 0],
      [4, 0, 0, 0, 0, 0, 0, 9, 0],
      [0, 9, 0, 0, 1, 0, 0, 0, 0],
    ],
    solution: [
      [1, 4, 9, 7, 3, 8, 5, 2, 6],
      [6, 7, 2, 9, 5, 1, 8, 4, 3],
      [3, 8, 5, 2, 4, 6, 4, 1, 9],
      [7, 2, 4, 6, 9, 3, 1, 8, 5],
      [8, 5, 3, 4, 2, 1, 6, 7, 7],
      [9, 1, 7, 8, 6, 5, 2, 3, 4],
      [5, 3, 6, 1, 7, 9, 3, 8, 2],
      [4, 6, 8, 3, 2, 7, 1, 9, 5],
      [2, 9, 1, 5, 1, 4, 7, 6, 8],
    ],
  },
  {
    name: "Encore 3",
    grid: [
      [0, 0, 0, 0, 0, 8, 0, 0, 0],
      [0, 5, 0, 0, 0, 0, 0, 0, 6],
      [0, 0, 2, 0, 0, 0, 0, 3, 0],
      [0, 0, 0, 0, 5, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 4, 0, 0, 0, 0],
      [0, 8, 0, 0, 0, 0, 1, 0, 0],
      [1, 0, 0, 0, 0, 0, 0, 9, 0],
      [0, 0, 0, 3, 0, 0, 0, 0, 0],
    ],
    solution: [
      [6, 7, 3, 9, 2, 8, 5, 4, 1],
      [4, 5, 9, 7, 1, 3, 2, 8, 6],
      [8, 1, 2, 5, 6, 4, 9, 3, 7],
      [2, 6, 4, 8, 5, 1, 3, 7, 9],
      [9, 3, 7, 2, 8, 6, 4, 1, 5],
      [5, 9, 8, 1, 4, 7, 6, 2, 3],
      [7, 8, 5, 4, 9, 2, 1, 6, 3],
      [1, 4, 6, 2, 3, 5, 8, 9, 7],
      [3, 2, 1, 3, 7, 9, 4, 5, 8],
    ],
  },
  {
    name: "Encore 4",
    grid: [
      [0, 0, 0, 0, 0, 0, 0, 0, 9],
      [0, 0, 6, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 4, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 4, 0],
      [0, 0, 0, 3, 0, 7, 0, 0, 0],
      [0, 3, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 6, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 8, 0, 7, 0, 0],
      [8, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    solution: [
      [1, 7, 3, 2, 5, 6, 8, 9, 9],
      [4, 2, 6, 8, 1, 9, 3, 7, 5],
      [9, 5, 8, 7, 3, 4, 2, 1, 6],
      [6, 9, 5, 1, 2, 8, 3, 4, 7],
      [2, 8, 4, 3, 9, 7, 1, 5, 6],
      [7, 3, 1, 5, 4, 2, 6, 8, 9],
      [3, 1, 9, 6, 7, 5, 4, 2, 8],
      [5, 4, 2, 9, 8, 1, 7, 6, 3],
      [8, 6, 7, 4, 2, 3, 5, 1, 1],
    ],
  },
  {
    name: "Encore 5",
    grid: [
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 4, 0, 9, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 3, 0, 0, 0, 0, 0, 5, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 1, 0, 8, 0, 2, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    solution: [
      [2, 1, 8, 7, 5, 9, 3, 4, 6],
      [3, 5, 7, 8, 4, 2, 9, 1, 8],
      [6, 9, 4, 1, 3, 5, 7, 2, 8],
      [9, 4, 3, 2, 7, 8, 1, 6, 5],
      [7, 3, 6, 4, 1, 9, 8, 5, 2],
      [1, 8, 2, 5, 6, 3, 4, 7, 9],
      [8, 7, 9, 3, 2, 1, 5, 8, 4],
      [4, 6, 1, 9, 8, 7, 2, 3, 7],
      [5, 2, 5, 6, 9, 4, 1, 8, 3],
    ],
  },
];

// Use all puzzles in original order
const PUZZLES = PUZZLE_DATA;

// Sort and select puzzles from Set 2
const PUZZLES_SET2 = (() => {
  const byDifficulty = PUZZLE_DATA_SET2.reduce((acc, puzzle) => {
    const diff = getDifficulty(puzzle.grid);
    if (!acc[diff]) acc[diff] = [];
    acc[diff].push(puzzle);
    return acc;
  }, {} as Record<string, typeof PUZZLE_DATA_SET2>);

  const selected = [
    ...(byDifficulty["Easy"] || []).slice(0, 1),
    ...(byDifficulty["Medium"] || []).slice(0, 2),
    ...(byDifficulty["Hard"] || []).slice(0, 2),
  ];

  return selected;
})();

// Smart hint: Get possible candidates for a cell
function getCandidates(grid: Grid, r: number, c: number, solution: Grid): Set<number> {
  if (grid[r][c] !== 0) return new Set();
  
  const candidates = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  
  // Remove values in same row
  for (let i = 0; i < SIZE; i++) {
    candidates.delete(grid[r][i]);
  }
  
  // Remove values in same column
  for (let i = 0; i < SIZE; i++) {
    candidates.delete(grid[i][c]);
  }
  
  // Remove values in same box
  const boxR = Math.floor(r / SUB) * SUB;
  const boxC = Math.floor(c / SUB) * SUB;
  for (let r2 = boxR; r2 < boxR + SUB; r2++) {
    for (let c2 = boxC; c2 < boxC + SUB; c2++) {
      candidates.delete(grid[r2][c2]);
    }
  }
  
  return candidates;
}

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

function Confetti() {
  const confettiPieces = Array.from({ length: 50 }, (_, i) => {
    const isFlower = Math.random() > 0.6; // 40% flowers, 60% particles
    const flower = isFlower ? (Math.random() > 0.5 ? "🌺" : "🌹") : null; // Hibiscus or Blue Rose
    const particleType = !isFlower ? Math.floor(Math.random() * 3) : -1; // 0: circle, 1: square, 2: diamond
    
    return {
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 1,
      size: 4 + Math.random() * 8,
      opacity: 0.8 + Math.random() * 0.2,
      flower,
      particleType,
    };
  });

  // Blue and pastel color palette
  const colors = [
    "#6b9fd3", // Pastel blue
    "#87ceeb", // Sky blue (pastel)
    "#a2d5f7", // Light pastel blue
    "#b8d4f1", // Very light pastel blue
    "#dbe7f5", // Pale lavender-blue
    "#8db4e2", // Steel blue (pastel)
    "#b3d9e8", // Pastel cyan-blue
  ];

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-confetti flex items-center justify-center text-2xl"
          style={{
            left: `${piece.left}%`,
            top: "-10px",
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            animation: `confetti-fall ${piece.duration}s linear ${piece.delay}s forwards`,
            opacity: piece.opacity,
          }}
        >
          {piece.flower ? (
            <span>{piece.flower}</span>
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: colors[Math.floor(Math.random() * colors.length)],
                borderRadius: piece.particleType === 0 ? "50%" : piece.particleType === 1 ? "0" : "25%",
              }}
            />
          )}
        </div>
      ))}
      <style>{`
        @keyframes confetti-fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

function FinalEnvelope({ phrase, onRestart, onPlayNewSet }: { phrase: string; onRestart: () => void; onPlayNewSet: () => void }) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"envelope" | "letter" | "yes-no" | "reconsidered">("envelope");
  const words = phrase.split(" ");

  const handleOpen = () => {
    setOpen(true);
    setStage("letter");
  };

  const handleYesNo = () => {
    setStage("yes-no");
  };

  const handleReconsider = () => {
    setStage("reconsidered");
  };

  return (
    <div className="mt-5 animate-modal">
      {open && <Confetti />}
      <div className="rounded-3xl controls-style p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-blue-50 px-3 py-1 text-xs font-semibold tracking-wide text-blue-900">
              <span className="text-base">✉️</span>
              A love letter awaits
            </div>
            <div className="mt-3 text-xl font-semibold text-slate-900">You have earned something truly special.</div>
            <div className="mt-1 text-sm text-slate-700">Take a moment. Read it carefully.</div>
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
            onClick={handleOpen}
            className="group relative w-full max-w-sm overflow-hidden rounded-3xl border-2 border-amber-400 controls-style p-8 shadow-lg hover:shadow-2xl transition-all hover:scale-105"
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-16 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-amber-400/20 blur-3xl" />
              <div className="absolute -top-10 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-cyan-300/25 blur-3xl" />
            </div>

            <div className="relative text-center">
              <div className="text-6xl animate-pulse">💌</div>
              <div className="mt-4 text-lg font-semibold text-slate-900">Open the envelope</div>
              <div className="mt-2 text-sm text-slate-600">Tap when you are ready</div>
            </div>
          </button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-lg overflow-hidden rounded-[28px] controls-style shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-400/25 blur-3xl" />
              <div className="absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />
            </div>

            <div className="p-[1px]">
              <div className="rounded-[27px] controls-style">
                <div className="p-8 relative">
                  {/* Letter Header */}
                  <div className="text-center mb-6">
                    <div className="text-5xl mb-3">🌺</div>
                    <div className="text-xl font-serif italic text-blue-600">A Love Letter</div>
                  </div>

                  {/* Main Letter Content */}
                  <div className="space-y-5 text-slate-800 font-serif leading-relaxed">
                    <p className="text-sm">
                      <span className="font-bold">Dearest,</span>
                    </p>

                    <p className="text-sm">
                      You solved five puzzles. With each one, you proved something: that you will persist. That you will think deeply. That you will not give up, even when the path ahead is unclear.
                    </p>

                    <p className="text-sm">
                      That is who you are.
                    </p>

                    <p className="text-sm">
                      And that is why I ask you this.
                    </p>

                    {/* The Five Words with Emphasis */}
                    <div className="my-6 rounded-2xl bg-gradient-to-r from-blue-50 to-cyan-50 p-6 text-center">
                      <div className="text-xs uppercase tracking-widest text-blue-600 font-semibold mb-3">The Promise</div>
                      <div className="grid grid-cols-1 gap-2">
                        {words.map((word, i) => (
                          <div key={i} className="text-2xl font-bold text-slate-900 tracking-wide animate-fade-in" style={{animationDelay: `${i * 0.2}s`}}>
                            {word}
                          </div>
                        ))}
                      </div>
                    </div>

                    <p className="text-sm">
                      Not as a question. As a statement.
                    </p>

                    <p className="text-sm">
                      Because you have already shown me what I needed to know.
                    </p>

                    <p className="text-sm">
                      With devotion,<br />
                      <span className="text-lg">💙</span>
                    </p>
                  </div>

                  {/* Interactive Element */}
                  {stage === "letter" && (
                    <div className="mt-8 flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={handleYesNo}
                        className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-cyan-700 transition-all"
                      >
                        Let me respond
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                      >
                        Close
                      </button>
                    </div>
                  )}

                  {/* Yes/No Response */}
                  {stage === "yes-no" && (
                    <div className="mt-8 space-y-4">
                      <div className="text-center text-slate-700 font-serif text-lg mb-4">
                        Will you be my Valentine?
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={handleReconsider}
                          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                        >
                          Reconsider
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            onRestart();
                          }}
                          className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl"
                        >
                          Yes 💙
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStage("letter")}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                      >
                        Back
                      </button>
                    </div>
                  )}

                  {/* Reconsidered Stage */}
                  {stage === "reconsidered" && (
                    <div className="mt-8 space-y-4">
                      <div className="text-center">
                        <div className="text-5xl mb-3">🤔</div>
                        <div className="text-slate-900 font-serif text-xl mb-2">Now that you've reconsidered...</div>
                        <div className="text-slate-600 text-sm">What would you like to do?</div>
                      </div>
                      <div className="flex flex-col gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(false);
                          }}
                          className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl"
                        >
                          Yes, I do 💙
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            onPlayNewSet();
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                        >
                          Give me 5 new puzzles 🎲
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStage("yes-no")}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                      >
                        Back
                      </button>
                    </div>
                  )}
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
  const [puzzleSet, setPuzzleSet] = useState<1 | 2>(1); // Track which puzzle set (1 or 2)
  const currentPuzzles = puzzleSet === 1 ? PUZZLES : PUZZLES_SET2;
  const maxPuzzles = Math.min(currentPuzzles.length, WORDS.length);
  
  const [puzzleIndex, setPuzzleIndex] = useState<number>(0);
  const [grid, setGrid] = useState<Grid>(() => cloneGrid(currentPuzzles[0].grid));
  const [notes, setNotes] = useState<NotesGrid>(() => makeNotesGrid());

  const [selected, setSelected] = useState<Coord>({ r: 0, c: 0 });
  const [activeNumber, setActiveNumber] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState<boolean>(false);

  const [undoStack, setUndoStack] = useState<Action[]>([]);
  const [redoStack, setRedoStack] = useState<Action[]>([]);

  const [revealed, setRevealed] = useState<Set<number>>(() => new Set());
  const [status, setStatus] = useState<string>("Tap a number, then tap a square.");

  const [wrong, setWrong] = useState<Set<string>>(() => new Set());
  const [hintsUsed, setHintsUsed] = useState<Map<number, number>>(() => new Map()); // puzzleIndex -> hints used

  const [showReveal, setShowReveal] = useState<boolean>(false);
  const [lastUnlockedWord, setLastUnlockedWord] = useState<string>("");
  const [showConfirmRestartAll, setShowConfirmRestartAll] = useState<boolean>(false);
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);
  const [showDebugMenu, setShowDebugMenu] = useState<boolean>(false);
  const debugTapCountRef = React.useRef<number>(0);
  const debugTapTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const difficulty = getDifficulty(currentPuzzles[puzzleIndex].grid);
  const maxHints = difficulty === "Expert" ? 10 : difficulty === "Hard" ? 8 : 0;
  const currentHintsUsed = hintsUsed.get(puzzleIndex) || 0;
  const hintsRemaining = Math.max(0, maxHints - currentHintsUsed);

  const fixed = useMemo(() => {
    const f = new Set<string>();
    const base = currentPuzzles[puzzleIndex].grid;
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
    // Clear wrong highlights when undoing
    setWrong(new Set());
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
    // Clear wrong highlights when redoing
    setWrong(new Set());
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

    // Clear wrong highlights when player makes changes
    setWrong(new Set());

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

  function handleNumberClick(digit: number) {
    // Fill the selected cell with this number, then deselect it (one-shot)
    if (notesMode) {
      toggleCellNote(selected.r, selected.c, digit);
    } else {
      setCellValue(selected.r, selected.c, digit);
    }
    // Auto-deselect after placing
    setActiveNumber(null);
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

    const current = currentPuzzles[puzzleIndex];

    // Mistake check against the solution.
    // Mark any PLAYER-entered cell (not fixed) that does not match the solution.
    const wrongCells = new Set<string>();
    let wrongCount = 0;

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const v = grid[r][c];
        const key = cellKey(r, c);
        if (!v) continue;
        // Only mark non-fixed cells as wrong
        if (!fixed.has(key) && v !== current.solution[r][c]) {
          wrongCells.add(key);
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
    setGrid(cloneGrid(currentPuzzles[puzzleIndex].grid));
    setNotes(makeNotesGrid());
    setUndoStack([]);
    setRedoStack([]);
    setStatus("Reset. Tap a number, then tap a square.");
    saveProgress();
  }

  function handleNextPuzzle() {
    // Check if current puzzle is solved before allowing next
    if (puzzleIndex < maxPuzzles - 1 && !isSolved(grid, currentPuzzles[puzzleIndex].solution)) {
      setStatus("Complete this puzzle first!");
      return;
    }
    
    const nextIndex = Math.min(puzzleIndex + 1, maxPuzzles - 1);
    setPuzzleIndex(nextIndex);
    setGrid(cloneGrid(currentPuzzles[nextIndex].grid));
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
    setGrid(cloneGrid(currentPuzzles[0].grid));
    setNotes(makeNotesGrid());
    setUndoStack([]);
    setRedoStack([]);
    setRevealed(new Set<number>());
    setSelected({ r: 0, c: 0 });
    setActiveNumber(null);
    setNotesMode(false);
    setStatus("Tap a number, then tap a square.");
  }

  function handlePlayNewSet() {
    setPuzzleSet(2);
    setPuzzleIndex(0);
    setGrid(cloneGrid(currentPuzzles[0].grid));
    setNotes(makeNotesGrid());
    setUndoStack([]);
    setRedoStack([]);
    setRevealed(new Set<number>());
    setSelected({ r: 0, c: 0 });
    setActiveNumber(null);
    setNotesMode(false);
    setStatus("Round 2: The Encore! 🎲");
  }

  function handleHint() {
    if (hintsRemaining <= 0) {
      setStatus("No hints remaining for this puzzle.");
      return;
    }

    // Find cells by strategy: fewest candidates first (most constrained = most helpful)
    let bestCell: [number, number] | null = null;
    let bestCandidateCount = 10;
    const solution = currentPuzzles[puzzleIndex].solution;

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (grid[r][c] === 0 && !fixed.has(cellKey(r, c))) {
          const candidates = getCandidates(grid, r, c, solution);
          // Prefer cells with fewest candidates (most constrained)
          if (candidates.size > 0 && candidates.size < bestCandidateCount) {
            bestCell = [r, c];
            bestCandidateCount = candidates.size;
          }
        }
      }
    }

    if (!bestCell) {
      setStatus("No empty cells to hint.");
      return;
    }

    const [hintR, hintC] = bestCell;
    const correctValue = solution[hintR][hintC];

    // Fill it with the correct value
    setCellValue(hintR, hintC, correctValue);

    // Track hint usage
    setHintsUsed((prev) => {
      const next = new Map(prev);
      next.set(puzzleIndex, (next.get(puzzleIndex) || 0) + 1);
      return next;
    });

    setStatus(`Hint used (${bestCandidateCount} option${bestCandidateCount !== 1 ? "s" : ""}). ${Math.max(0, hintsRemaining - 1)} hint${hintsRemaining - 1 !== 1 ? "s" : ""} left.`);
  }


  function saveProgress() {
    const payload = {
      puzzleIndex,
      revealed: Array.from(revealed),
      grid,
      notes: notes.map((row) => row.map((cell) => Array.from(cell).sort((a, b) => a - b))),
      hintsUsed: Array.from(hintsUsed.entries()),
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
      setGrid(cloneGrid(currentPuzzles[safeIdx].grid));
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
    
    // Restore hints used
    if (Array.isArray(saved.hintsUsed)) {
      setHintsUsed(new Map(saved.hintsUsed.filter((entry: any[]) => Array.isArray(entry) && entry.length === 2)));
    }
    
    setUndoStack([]);
    setRedoStack([]);
    setSelected({ r: 0, c: 0 });
    setActiveNumber(null);
    setNotesMode(false);
    setStatus("Welcome back. Progress loaded.");
  }

  function loadLastSave() {
    const saved = readState();
    if (!saved) {
      setStatus("No saved progress found.");
      return;
    }
    // Reuse the existing loader which validates structure and applies state.
    loadProgressIfAny();
    setStatus("Loaded last save.");
  }

  function handleDebugJumpPuzzle(idx: number) {
    setPuzzleIndex(idx);
    setGrid(cloneGrid(currentPuzzles[idx].grid));
    setNotes(makeNotesGrid());
    setUndoStack([]);
    setRedoStack([]);
    setSelected({ r: 0, c: 0 });
    setActiveNumber(null);
    setNotesMode(false);
    setWrong(new Set());
    setShowDebugMenu(false);
    setStatus(`Jumped to Level ${idx + 1}.`);
    saveProgress();
  }

  function handleHeaderTripleTap() {
    if (debugTapTimeoutRef.current) clearTimeout(debugTapTimeoutRef.current);

    debugTapCountRef.current += 1;
    if (debugTapCountRef.current >= 3) {
      setShowDebugMenu((m) => !m);
      debugTapCountRef.current = 0;
    } else {
      // Reset counter after 600ms of inactivity
      debugTapTimeoutRef.current = setTimeout(() => {
        debugTapCountRef.current = 0;
      }, 600);
    }
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

      {maxHints > 0 && (
        <button
          type="button"
          onClick={handleHint}
          disabled={hintsRemaining === 0}
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm hover:bg-amber-100 disabled:opacity-50"
        >
          💡 Hint ({hintsRemaining})
        </button>
      )}
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
      {showConfirmRestartAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfirmRestartAll(false)} />
          <div className="relative rounded-xl bg-white p-5 shadow-lg w-full max-w-md">
            <div className="text-lg font-semibold">Start Over?</div>
            <div className="mt-2 text-sm text-slate-700">This will erase all progress and return you to the first puzzle. Your last saved progress can be restored with the Load button. Proceed?</div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmRestartAll(false)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleRestartAll();
                  setShowConfirmRestartAll(false);
                }}
                className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white shadow-sm"
              >
                Yes, Start Over
              </button>
            </div>
          </div>
        </div>
      )}
      {showConfirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfirmReset(false)} />
          <div className="relative rounded-xl bg-white p-5 shadow-lg w-full max-w-md">
            <div className="text-lg font-semibold">Reset Puzzle?</div>
            <div className="mt-2 text-sm text-slate-700">This will reset only the current puzzle to its starting state. Your last saved progress can be restored with the Load button. Proceed?</div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmReset(false)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleResetPuzzle();
                  setShowConfirmReset(false);
                }}
                className="rounded-xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white shadow-sm"
              >
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}
      {/* responsive overlay so tiger shows through on all devices */}
      <div className="absolute inset-0 pointer-events-none overlay" />

      <div className="mx-auto max-w-6xl relative z-10 pb-48 sm:pb-0">
        <div className="rounded-3xl controls-style p-4 sm:p-5 shadow-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-block rounded-xl px-3 py-2 controls-style cursor-pointer select-none" onClick={handleHeaderTripleTap}>
                <div className="text-2xl font-semibold header-title-mobile">Hey Baby, Help Reveal the Hidden Message by Each Sudoku Reveal</div>
                <div className="text-sm header-subtitle-mobile">Some obstacles are meant to be solved. Not alone. But together.</div>
              </div>
              {showDebugMenu && puzzleSet === 1 && (
                <div className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 shadow-sm">
                  <div className="text-xs font-semibold text-slate-700 mb-2">DEBUG: Jump to Puzzle</div>
                  <div className="flex flex-wrap gap-1">
                    {Array.from({ length: PUZZLES.length }, (_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleDebugJumpPuzzle(i)}
                        className="rounded px-2 py-1 text-xs font-semibold bg-slate-200 text-slate-800 hover:bg-slate-300"
                      >
                        Puzzle {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl controls-style p-4 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-slate-500">Reveal your secret message</div>
              <div className="mt-1 text-lg font-semibold text-blue-600">{phrase}</div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px] mobile-grid-wrapper">
            <div className="rounded-2xl controls-style p-4 sm:p-5 shadow-sm mobile-grid-puzzle">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm text-slate-500">Level {puzzleIndex + 1} - {difficulty}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="px-2 py-1 rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: getDifficultyColor(difficulty) }}
                    >
                      {difficulty}
                    </span>
                    {maxHints > 0 && (
                      <span className="text-xs text-slate-600">
                        💡 {hintsRemaining}/{maxHints} hints
                      </span>
                    )}
                  </div>
                  <div className="text-base font-semibold text-slate-900 mt-2">
                    <span className="hidden sm:inline">Click a square, then click a number.</span>
                    <span className="sm:hidden">Tap a number, then tap a square.</span>
                  </div>
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
                            className={`cell-button relative h-11 w-11 sm:h-12 sm:w-12 select-none transition-all
                              ${isFixed ? "font-bold text-slate-900" : val ? "font-semibold text-blue-600" : "text-slate-400"}
                              ${isConflict ? "bg-rose-100 animate-cell-shake" : isWrong ? "bg-amber-100" : isFixed ? "bg-slate-100" : isSel ? "bg-sky-100 animate-cell-select" : isHighlighted ? "bg-sky-50" : val ? "bg-white" : "bg-slate-50"}
                              ${showSameNumberAccent ? "ring-2 ring-blue-400" : ""}
                            `}
                            style={{
                              borderTopWidth: thickTop ? 3 : 1,
                              borderLeftWidth: thickLeft ? 3 : 1,
                              borderBottomWidth: thickBottom ? 3 : 1,
                              borderRightWidth: thickRight ? 3 : 1,
                              borderColor: (() => {
                                const opacity = getBorderOpacity(difficulty);
                                const thickColor = `rgba(51, 65, 85, ${opacity})`; // dark slate for 3x3 boxes
                                const thinColor = `rgba(203, 213, 225, ${opacity})`; // light slate for cells
                                return (thickTop || thickLeft || thickBottom || thickRight) ? thickColor : thinColor;
                              })(),
                            }}
                          >
                            {val ? (
                              <span className={`text-lg ${isFixed ? "font-extrabold" : "font-bold"}`}>{val}</span>
                            ) : (
                              <span className="grid h-full w-full grid-cols-3 grid-rows-3 p-1 text-[9px] text-slate-400">
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
                  onPlayNewSet={handlePlayNewSet}
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
                     onClick={handleResetPuzzle}
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

            <div className="rounded-2xl controls-style p-5 shadow-sm mobile-grid-sidebar">
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
                onClick={() => handleNumberClick(d)}
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
              onClick={loadLastSave}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm"
            >
              Load
            </button>
            {maxHints > 0 && (
              <button
                type="button"
                onClick={handleHint}
                disabled={hintsRemaining === 0}
                className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 shadow-sm disabled:opacity-50"
              >
                💡({hintsRemaining})
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowConfirmReset(true)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm"
            >
              Restart
            </button>
            <button
              type="button"
              onClick={() => setShowConfirmRestartAll(true)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm text-xs"
            >
              Start Over
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
                onClick={() => handleNumberClick(d)}
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
            {maxHints > 0 && (
              <button
                type="button"
                onClick={handleHint}
                disabled={hintsRemaining === 0}
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-base font-semibold text-amber-900 shadow-sm hover:bg-amber-100 disabled:opacity-50 ml-auto"
              >
                💡 Hint ({hintsRemaining})
              </button>
            )}
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
