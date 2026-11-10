# ex3: Miswire Hunt (Unit 3 homework)

A single-player, browser-based homework about **Neighbor Discovery and centralized configuration** in
*Jupiter Rising* (SIGCOMM 2015, Sections 5.2, 5.2.1, 5.2.2 and 5.3.1). About 15-20 minutes for the game and 15 for questions 1-3, no grade.

The intro states the goal (get familiar with SDN through *Jupiter Rising*) and asks students to watch a 5-minute demo
video of the game before starting (`public/wire-hunter.mp4`, shown in a collapsible "Demo Video" part). The page then has three parts and one Submit:

- **A. Read**: four clippings of the paper (about 900 words), cut from the SIGCOMM PDF with our highlights (`public/img/paper-*.png`).
- **B. Play the game**: the student sees **JR-16**, a 16-switch Clos fabric (4 spine, 4 aggregation in two
  blocks, 8 ToR, one link per connected pair) with five hidden faults. A collapsed **How to play** box at the top of Part B (a text version of the demo video) gives the goal, the steps and the rules. Four steps:
  1. **Collect**: the Firepath master gathers link state from every switch over the CPN.
  2. **Inspect**: open a switch, probe its ports (plan from the cluster config vs. what Neighbor
     Discovery heard, PHY state, error rate, whether the peer hears them) and give each port a diagnosis.
  3. **Drain** (opens once every port is diagnosed; a switch on the map carries a tick when all its ports are done,
     or a number for how many are left): take broken links out of routing, recompute, and see what it costs: links and equal-cost
     paths that remain, ToRs left with one uplink or none, and drains that do not match the student's own diagnoses.
  4. **Explain**: two root-cause questions (T7's software crashed; a one-way link).
- **C. Questions 1-3**: place the parts of Firepath on the SDN planes and explain.

The switch T7 is dark (its software crashed), so it has no port table: its neighbours' ports are the clue.
Until `REVEAL_AT` in `public/js/config.js` (by default the deadline) the page gives no hint about what is right.
After it, a **Your results** part appears under Submit: which of the five faults the student found, port by port,
which broken links they left in routing and what each one does to traffic, which working links they drained, and
the two root-cause answers. It is computed in the browser from the work saved there. Questions 1-3 are not checked.
To keep the answers for the class, set `REVEAL_AT` to a later time.

Pressing **Recompute routes** also plays traffic on the map: the master sends the new link state, then one packet
takes each equal-cost path for three ToR pairs, so a drain visibly thins the paths. Before `REVEAL_AT` every packet
follows the plan. After it, a packet that meets a broken link left in routing is dropped there (✕), or bounces
between two switches if the link is miswired (↻). All motion is skipped under `prefers-reduced-motion`.

On a phone the map fits the screen as an overview (**Zoom in** makes it wide and scrollable), and step 2 lists
every switch as a button, so nothing depends on tapping a small box on the map.

| Path | What it is |
|---|---|
| `public/index.html` | The page |
| `public/js/config.js` | Supabase URL, publishable key and the submission deadline |
| `public/js/puzzle.js` | Puzzle data, including the answer key (generated, see below) |
| `public/js/topology.js`, `map.js` | The fabric and its drawing |
| `public/js/student.js` | Game logic and the one Submit |
| `public/js/homework.js`, `homework-form.js` | Part C: the diagram of the Firepath parts and the answer form |
| `public/instructor.html`, `js/instructor.js` | Class results |
| `supabase/submissions.sql`, `homework.sql` | Tables and functions (run once in the Supabase SQL Editor) |
| `public/lesson-map.html` | Lesson map: the plan of the class as bubbles and links (not linked from the game) |
| `supabase/lesson_map.sql` | Tables and functions of the lesson map |
| `tools/gen_puzzle.py` | Generates `puzzle.js` from the cluster model |

The answer key is inside `puzzle.js`, so a student who reads the source can see it. That is fine for an ungraded exercise.

## Publishing

Merging changes to `public/` on `main` runs `.github/workflows/ex3-pages.yml` and publishes the site at
`https://shaygol.github.io/data-centers-and-ai-networks/`. The `dev` branch is published
under `/preview/` for review before merging.

## Saving, deadline and class results

- Work is kept in the browser (`localStorage`) while the student plays and types. One **Submit** at the
  bottom of the page sends the game (`submit_work`) and questions 1-3 (`submit_homework`) together,
  with one name and email, both required (the email is stored in the `nick` column of `submissions`).
- A second Submit replaces the first. The page shows when the last one was sent, and before sending again it
  lists what changed since (fewer diagnoses, an answer that is now empty, a different email) and asks to confirm.
  It compares with the copy kept in this browser, so it cannot warn about a submission made from another device.
- The page keeps the student's **active time** (tab visible and some click, key or scroll in the last
  minute; summed over visits in `localStorage`). It is shown read-only as "Time spent" in the Submit card and
  sent in seconds as `answers.activeSec` of `submit_work`, so there is no database change. `instructor.html`
  shows it in the Students table. It is self-reported, so use it as a hint and not as proof.
- Submit closes at the deadline: **Sunday, Nov 15, 2026, 13:00** (Israel time). The page disables the
  button and both SQL functions refuse later calls. To move the deadline, change `DEADLINE` in
  `public/js/config.js` and the timestamp in both `supabase/*.sql` files, then run the SQL again.
- Run `supabase/submissions.sql` and `supabase/homework.sql` in the Supabase SQL Editor (safe to run again).
- `public/instructor.html` shows class results. It asks for the instructor key stored in `settings`
  (`k = 'instructor_key'`). `submissions.sql` creates that table; set the key once with the `insert` in its comment.
  The page shows summary numbers, how many students found each fault, the Question 1 placements as a heat table
  with an agreement column (low agreement marks a part worth discussing), which parts were named hardest in
  Question 2, and one sortable Students table that matches the game and questions 1-3 by email and downloads as CSV.
  It can reload itself every 30 seconds, and it remembers the key for the open tab only.
- `public/homework.html` only redirects to the game.

## Lesson map

`public/lesson-map.html` is the plan of the class: every note is a bubble, grouped by goal, with links between
related notes and a second view that orders the notes by session. It keeps its data in the same Supabase project.

- Run `supabase/lesson_map.sql` in the Supabase SQL Editor (after `submissions.sql`, safe to run again).
- Anyone with the address can read the map. Editing needs the edit key: the `map_key` row in `settings`
  (set it once with the `insert` in the comment of `lesson_map.sql`). **Unlock editing** on the page asks for it
  and keeps it in that browser until **Lock editing**.
- The page reloads the map every `REFRESH_SECONDS`, so two people editing see each other's changes after a few seconds.
  The last save of a bubble wins.

## In class (suggested)

1. Which faults did people find first, and which took longest?
2. Explain Q1: why is "T7's software crashed" right and "two cable faults" or "lost power" wrong? (PHY up on
   every T7 port; ND is also the keepalive.)
3. Explain Q2: SP3 p3 looks exactly like a crashed peer from SP3. What did AG3 see?
4. Bridge to Firepath: this check is possible only because every switch has the same intended
   topology. What would OSPF do with a miswired link? (The paper: a miscabled link can lead to
   forwarding loops.)
