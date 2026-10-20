# Flows

**The main task, as a sentence:**
I pick a goal and my training days → I see today's workout right away → I log
what I lifted → I come back later, and the app remembers me and tells me what
to train next.

## The three flows

### 1. First visit — useful right away

```mermaid
flowchart TD
    A([Open Ironlog, nothing saved]) --> B["Home: 'What are you training for?'<br/>4 goal tiles"]
    B --> C[Pick a goal]
    C --> D["Pick days per week<br/>(2–6, preselected 4)"]
    D --> E[Tap 'Show my first workout']
    E --> F["Home becomes Today:<br/>workout, sets × reps, and why"]
    F --> G{Ready to lift?}
    G -- Yes --> H[Log a session]
    G -- Not now --> I[Look around: Progress, Plan]
```

No sign-up, no tour, no empty screen — two taps from a cold start to a real
workout.

### 2. The main task — log a session (the form)

```mermaid
flowchart TD
    A[Log: workout prefilled with today's recommendation] --> B[Enter weight and reps per set]
    B --> C[Tap 'Save session']
    C --> D{Valid?}
    D -- "No: reps missing or out of range,<br/>future date, no sets" --> E["Error next to the field,<br/>everything typed is kept"]
    E --> B
    D -- Yes --> F[Saved to this device]
    F --> G["Home: 'Session saved'<br/>+ week progress + next up"]
    F --> H{New personal best?}
    H -- Yes --> I[PR flagged in Progress]
```

### 3. Coming back — it remembers

```mermaid
flowchart TD
    A([Return days later]) --> B[Ironlog reads its saved data]
    B --> C{Anything saved?}
    C -- Nothing --> D[First-visit flow]
    C -- Yes --> E["Welcome back:<br/>X of Y sessions this week"]
    E --> F["Next up: 'Pull day'<br/>because back last trained 5 days ago"]
    F --> G[Last-time weights shown as hints in the log form]
    E --> H["Progress: calendar, week streak, personal bests"]
    F --> I["Log today's session"]
```

## Screens and states (what the agent proposed, and what we kept)

| Screen | Route | States | Errors |
|---|---|---|---|
| Today | `/` | loading, first visit (goal picker), returning, trained today, week target hit | storage unreadable → start fresh, say so |
| Log | `/log` | prefilled, saving, saved | reps required (1–100), weight 0–1000, date not in the future, at least one set |
| Progress | `/progress` | has sessions, plan-only (no sessions yet — never blank) | — |
| Plan | `/plan` | goal, days, units, backup, reset | confirm before reset |

Considered and **cut** for simplicity: accounts and sync (next week's topic),
equipment and experience questions on first visit, editing past sessions
(delete only), rest timer, exercise videos, per-set RPE.
