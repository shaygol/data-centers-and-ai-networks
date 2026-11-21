# Jupiter Rising Labs

Source of the Unit 3 lesson deck. `npm run build:v2` writes `dist/jupiter-rising-labs-v2.html`; copy it to `../site/public/lesson.html` to publish it on the site.

One self-contained page with a tab per lab. The repo path contains spaces, so quote it. Run everything from `artifact/`, after `npm install` (each worktree needs its own).

| Command | What it does |
|---|---|
| `npm test` | `node --test` over every lab, the shell and the build |
| `npm run build` | Writes `dist/jupiter-rising-labs.html` (local file for class) and `dist/jupiter-rising-labs.fragment.html` (to publish) |
| `npm run smoke` | Builds, then opens both outputs offline in Chromium. Visits every tab, key passage and guided experiment, including its jump and way back, fills in the position split and plays the Part 2 explorer. Fails on a console error or warning, a failed or network request, sideways page scroll, or a built lab with no illustration label |

Playwright is pinned to the version that matches the installed Chromium (chromium-1234).

## Editions

`npm run build:v2` and `npm run smoke:v2` build and check **v2**, the updated lesson (Nov 10): Traffic growth (Figure 1 to today), Generations, Clos failures, Congestion, and two discussion tabs, Theory vs practice and Why OpenFlow. v2 swaps in `src/editions/v2/registry.js` and writes `dist/jupiter-rising-labs-v2.html`; the class copy is `Jupiter Rising Labs v2.html`. v1 (`npm run build`) is unchanged and still has the Firepath lab and Position tab.

## Add a lab

Add the lab's directory under `src/labs/<lab>/`, then add it to `src/labs/index.js` and to a tab group in `src/shell/registry.js`. The build picks up any `.css` in the directory.

1. **`model.js`**: pure logic, no DOM. Write **`model.test.js`** first. Expected values come from the paper, and the source goes in the test name. `src/labs/clos/` is the pattern.
2. **`view.js`**: export this shape. Don't touch the DOM at import time, since tests import this file.

```js
export default {
  id: 'clos',
  number: 2,
  title: 'Clos multipath and failures',
  short: 'Clos failures',    // tab label
  paper: 'Jupiter',
  source: 'Jupiter §1, §5.2',
  hidden: false,             // true removes the lab from the page (the extras' switch)
  idea: 'Key idea or formula, one line.',
  illustration: 'What the simulated values are.',  // optional, replaces the default label text
  defaultExperiment: 'healthy',  // so the lab opens in a working state
  experiments: [{ id: 'healthy', label: 'Healthy fabric', note: 'What to notice.' }],
  mount(body, ctx) {
    // Draw into body, which has the class .lab-<id>. Scope your CSS under it.
    return { run(experimentId) { /* set state and redraw */ } };
  },
};
```

Guess, then click: where a lab poses a question, it must not land on copy that answers it, including below the fold. An experiment can set its own `idea` for that state, and each such landing goes in `LANDINGS` in `scripts/smoke.mjs`.

The shell draws the header, experiment buttons, note and illustration label. When a control moves the lab away from an experiment, call `ctx.clearExperiment()`.

3. **`style.css`** (optional): colors only through the tokens in `src/shell/00-tokens.css`. Wide diagrams go in their own `overflow-x: auto` box.
4. Tick your ticket, then run `npm test` and `npm run smoke`.

Helpers in `src/shell/ui.js`: `h`, `svg`, `stat`, `loadBar`, `segmented`, `toggle`, `slider`, `paperNote` (paper evidence, kept apart from simulated values), `illustrationLabel`, `heldBack` (copy that would answer a question in class, shown after a click), `onActivate` (a drawn element that works like a button), `experimentLeaver`, `linkName`, `jumpButton`, `pct`. `src/shell/store.js` wraps `localStorage` so it's safe when storage throws. It's also on `ctx.store`.

## Jump to a guided experiment, and back

A panel's `mount(body, ctx)` returns `{ show(arg) }`. Key passages live in `src/panels/passages/stops.js`; a stop's `jumps` open labs. To open a lab from code:

```js
jumpButton(ctx, { tab: 'firepath', arg: 'link-failure', returnArg: 'p3', label: 'Open Firepath' });
// or ctx.jump({ tab: 'firepath', arg: 'link-failure' }, 'p3');
```

The lab opens that experiment with a "Back to" button, which returns to the tab and calls `show('expanders')`. These jumps are also links: `#firepath~link-failure~from~passages~p3`. A bare `#firepath` or `#firepath~link-failure` opens the tab or experiment with no way back.

## History

The Jupiter-vs-RNG version (RNG labs, timeline, walkthrough, Scenario explorer) is at git tag `jupiter-vs-rng-design`.
