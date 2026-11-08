# ex3: Miswire Hunt (Unit 3 home assignment)

A shared, browser-based game about **Neighbor Discovery and centralized configuration** in
*Jupiter Rising* (SIGCOMM 2015, Sections 5.2.1 and 5.3). About 15 minutes per student, no grade.

The class is the control plane of **JR-16**, a 16-switch Clos fabric (4 spine, 4 aggregation in
two blocks, 8 ToR, dual links everywhere). Each student enters an email and gets one switch. They see
only that switch's ND port table: expected peer (cluster config), discovered peer, whether the peer
hears them, PHY state and error rate. They label every port, and the labels paint a shared map that
everyone sees. Five problems are hidden in the fabric. A problem is *confirmed* when switches on two
different sides of it have labeled it correctly. When all five are confirmed the fabric comes up.
Each student also has five *flags* to put on links of the shared map that they suspect, so the class can see where its attention is going. Then each student answers two root-cause questions that need the shared map, because some
problems look identical from one switch.

One student gets the switch whose software crashed. Their console is dark and their job is to find
out why from the map.

| Path | What it is |
|---|---|
| `site/index.html` | Student page |
| `site/instructor.html` | Instructor page: answer key on the map, confirmed faults, answer histograms, reset |
| `site/js/config.js` | Supabase URL and anon key (fill in) |
| `supabase/schema.sql` | Tables and API functions |
| `seed.sql` | **Not in this repo.** Puzzle data, answer key and instructor key. Kept private by the instructors. |

## Privacy and cheating

- Only a SHA-256 hash of each email is stored. There is no login check, so anyone could type
  someone else's email; that is fine for an ungraded game.
- Every table has row level security with no policies. The browser can only call the API
  functions, and they never return the answer key to students. Students see *where* a confirmed fault
  is, not what it was. The explanations are on the instructor page for the class discussion.

## Setup (once, about 15 minutes)

1. **Supabase:** create a free project at supabase.com. In *SQL Editor*, run `supabase/schema.sql`,
   then run the private `seed.sql`.
2. In *Project Settings -> API*, copy the **Project URL** and the **anon public** key into
   `site/js/config.js`. The anon key is meant to be public.
3. **GitHub Pages:** in the repo, *Settings -> Pages -> Source: GitHub Actions*. Merging changes to
   `site/` on `main` runs `.github/workflows/ex3-pages.yml` and publishes the site at
   `https://shaygol.github.io/data-centers-and-ai-networks/`. It can also be run by hand from the *Actions* tab.
4. Open `instructor.html` on the published site, enter the instructor key from `seed.sql`, and press
   **Reset the game** before sending the link to students.

Note: free Supabase projects are paused after a period without activity. Open the site a day before
class to check that it answers.

## In class (suggested)

1. Project `instructor.html`: how far did the class get, and which links are still dotted red?
2. Q1 histogram: why is "T7's software crashed" right and "four cable faults" wrong? (PHY up on every
   T7 port; ND is also the keepalive.)
3. Q2 histogram: SP3 p6 looks exactly like a crashed peer from SP3. What did AG3 see?
4. Bridge to Firepath: this check is possible only because every switch has the same intended
   topology. What would OSPF do with a miswired link? (The paper: a miscabled link can lead to
   forwarding loops.)
