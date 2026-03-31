# Raider Pod Generator

A Kagan-style heterogeneous grouping tool for Regis Jesuit High School teachers — sort students into quartiles, generate pods with shoulder partners two tiers apart, and reshuffle anytime.

**[Launch Raider Pod Generator →](#)**

## How It Works

Students are grouped into pods of 4 (or 3 when class size doesn't divide evenly). Each pod seats students by performance quartile using Kagan's heterogeneous grouping model:

**Pod of 4:**
```
┌──────────┬──────────┐
│ Q1  Top  │ Q2  2nd  │  ← Far from teacher
│  25%     │  25%     │
├─shoulder──┼─shoulder──┤
│ Q3  3rd  │ Q4  Low  │  ← Near teacher
│  25%     │  25%     │
└──────────┴──────────┘
```

- **Shoulder partners** (Q1↕Q3, Q2↕Q4) — two quartiles apart. This is the productive gap.
- **Face partners** (Q1↔Q2, Q3↔Q4) — one quartile apart. Adjacent performance levels.

**Pod of 3** (remainder students):
```
       ┌─────────┐
       │ Q1 Top  │  ← Far from teacher
       └────┬────┘
    ┌───────┴───────┐
    │ Q2 Mid│Q3 Low │  ← Near teacher
    └───────┴───────┘
```

## Input Modes

- **Paste → Drag** — Paste a name list, then drag students from an unsorted pool into Q1–Q4 buckets. Rearrange between quartiles anytime.
- **Paste into Quartiles** — Paste names directly into four separate quartile boxes if you already know your groupings.

Both modes support rearranging students between quartiles after the initial sort. Move a student from Q2 to Q3 mid-semester and regenerate — no need to re-sort the whole class.

## Features

- **Never-Pair Rules** — Flag students who should not be in the same pod. The algorithm swaps within quartiles across pods to resolve conflicts when possible.
- **Lock Students** — Click any student in a pod to lock them in place before reshuffling.
- **Saved Classes** — Save quartile assignments, unsorted students, and never-pair rules by class name. One tap to reload.
- **Copy to Clipboard** — One-click copy of pod assignments for pasting into Teams or Canvas.

## Privacy

- No accounts, no login, no ads, no cookies, no tracking
- No data leaves the browser — everything runs locally
- Saved classes are stored in your browser only
- Nothing is transmitted anywhere, ever

## How to Use

1. Visit the link above and bookmark it
2. Choose an input mode — drag-to-sort or paste-into-quartiles
3. Sort students into Q1 (top 25%) through Q4 (bottom 25%)
4. Optionally add never-pair rules
5. Click **Generate Pods**
6. Reshuffle as needed — quartile assignments are preserved

## Built by

Jason Beyer, Director of Educational Technology — Regis Jesuit High School
