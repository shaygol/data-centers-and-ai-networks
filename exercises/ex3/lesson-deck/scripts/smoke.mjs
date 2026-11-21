// Opens both builds in Chromium with the network off, visits every tab and guided experiment,
// and fails on any console error, page error, failed request, or sideways page scroll.
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { build, outFor } from './build.mjs';

const EDITION = process.argv.includes('--edition') ? process.argv[process.argv.indexOf('--edition') + 1] : 'v1';
const OUT = outFor(EDITION);
const HOME_TEXT = { v1: 'how centralized should a datacenter’s control be?', v2: 'A decade of Clos topologies' }[EDITION];
// Deep links are checked by jumping from this tab and coming back to it.
const ORIGIN = { v1: 'passages', v2: 'start' }[EDITION];

const VIEWPORTS = [
  { name: 'projector', width: 1920, height: 1080 },
  { name: 'laptop', width: 1280, height: 720 },
  { name: 'narrow', width: 400, height: 800 },
];

const problems = [];
let experiments = 0;
let tabCount = 0;
let stops = 0;

async function checkTab(page, tab, where) {
  await page.locator(`[data-tab-link="${tab}"]`).click();
  const section = page.locator(`[data-tab="${tab}"]`);
  await section.waitFor({ state: 'visible' });
  const stub = (await section.getAttribute('data-stub')) === 'true';
  if (!stub && (await section.locator('.lab-source').count()) > 0) {
    if ((await section.locator('[data-illustration]').count()) === 0) {
      problems.push(`${where} ${tab}: lab has no illustration label`);
    }
  }
  checkNoStrayValue(await section.innerText(), `${where} ${tab}`);
  await checkNoSideScroll(page, `${where} ${tab}`);
  const buttons = section.locator('[data-experiment]');
  for (let i = 0; i < (await buttons.count()); i += 1) {
    const button = buttons.nth(i);
    const id = await button.getAttribute('data-experiment');
    await button.click();
    experiments += 1;
    if ((await button.getAttribute('aria-pressed')) !== 'true') {
      problems.push(`${where} ${tab}/${id}: button is not marked as active`);
    }
    await checkNoSideScroll(page, `${where} ${tab}/${id}`);
    await checkDeepLink(page, tab, id, where);
  }
}

// A stop opens a guided experiment by route and comes back the same way.
async function checkDeepLink(page, tab, experiment, where) {
  const label = `${where} jump to ${tab}/${experiment}`;
  await page.locator(`[data-tab-link="${ORIGIN}"]`).click();
  await page.evaluate((hash) => { location.hash = hash; }, `#${tab}~${experiment}~from~${ORIGIN}`);
  const button = page.locator(`[data-tab="${tab}"] [data-experiment="${experiment}"]`);
  const back = page.locator('#back-link');
  try {
    await button.waitFor({ state: 'visible', timeout: 3000 });
    await back.waitFor({ state: 'visible', timeout: 3000 });
  } catch {
    problems.push(`${label}: experiment or way back did not appear`);
    return;
  }
  if ((await button.getAttribute('aria-pressed')) !== 'true') problems.push(`${label}: experiment did not load`);
  await back.click();
  await page.locator(`[data-tab="${ORIGIN}"]`).waitFor({ state: 'visible' });
  await page.locator(`[data-tab-link="${tab}"]`).click();
}

// Guess, then click (Spec). Where a lab poses a question, its landing must leave that question open,
// including text below the fold, and the presenter's click must then bring the held-back copy into view.
const LANDINGS = [
  { hash: 'clos~healthy', tab: 'clos', edition: 'all', silent: ['shifts load unevenly', 'one is 25%', 'computes'] },
  {
    hash: 'generations~firehose-1.0',
    tab: 'generations',
    edition: 'v2',
    silent: ['PCI boards', 'landmark effort', 'never carried production traffic'],
    clicks: [{ selector: '#st-reveal', shows: ['PCI boards', 'landmark effort', 'never carried production traffic'] }],
  },
  {
    hash: 'firepath~link-failure',
    tab: 'firepath',
    silent: ['Not centralized', 'computes its own', 'computes no forwarding', 'computation of forwarding', 'computed by that switch'],
    clicks: [
      { selector: '#fp-forward', silent: ['Not centralized', 'computes no forwarding'] },
      { selector: '#fp-step-5', shows: ['is the next step centralized?'], silent: ['Not centralized', 'computes no forwarding'] },
      { selector: '#fp-step-6', shows: ['Not centralized', 'computes its own', 'computes no forwarding', 'computation of forwarding'] },
    ],
  },
];

// Every stop shows, stays inside the page, and its labs open and come back to the same stop.
async function checkWalk(page, tab, where) {
  await page.locator(`[data-tab-link="${tab}"]`).click();
  const section = page.locator(`[data-tab="${tab}"]`);
  const ids = await section.locator('[data-stop-nav]').evaluateAll((els) => els.map((e) => e.dataset.stopNav));
  stops += ids.length;
  for (const id of ids) {
    await section.locator(`[data-stop-nav="${id}"]`).click();
    const stop = section.locator(`[data-stop="${id}"]`);
    if (!(await stop.isVisible())) problems.push(`${where} ${tab}/${id}: stop did not show`);
    checkNoStrayValue(await stop.innerText(), `${where} ${tab}/${id}`);
    await checkNoSideScroll(page, `${where} ${tab}/${id}`);
    if (where.includes('projector')) await checkFits(section, stop, `${where} ${tab}/${id}`);
    const jumps = stop.locator('[data-jump]');
    for (let i = 0; i < (await jumps.count()); i += 1) {
      const [lab, experiment] = (await jumps.nth(i).getAttribute('data-jump')).split('~');
      await jumps.nth(i).click();
      const button = page.locator(`[data-tab="${lab}"] [data-experiment="${experiment}"]`);
      await button.waitFor({ state: 'visible' });
      if ((await button.getAttribute('aria-pressed')) !== 'true') problems.push(`${where} ${tab}/${id}: ${lab}~${experiment} did not load`);
      await page.locator('#back-link').click();
      if (!(await stop.isVisible())) problems.push(`${where} ${tab}/${id}: way back from ${lab} lost the stop`);
    }
  }
  const next = page.locator(`#${tab}-next`);
  if (!(await next.isDisabled())) problems.push(`${where} ${tab}: Next should stop at the last stop`);
}

// A stop's text and drawings, without Table 2 below them, fit one projector screen.
async function checkFits(section, stop, where) {
  const bottom = await stop.evaluate((el) => el.getBoundingClientRect().bottom + window.scrollY);
  const height = await section.evaluate(() => window.innerHeight);
  if (bottom > height) problems.push(`${where}: stop runs ${Math.round(bottom - height)}px below a 1080p screen`);
}

async function checkHomeOpens(page, where) {
  const start = await page.locator('[data-tab="start"]').innerText();
  if (!start.includes(HOME_TEXT)) problems.push(`${where}: the page doesn't open on the opening panel`);
  if (/answers|No split/.test(start)) problems.push(`${where}: the opening shows the split`);
}

// Part 2: the class split takes the show of hands and shows shares, and names an option nobody chose.
async function checkPosition(page, where) {
  await page.locator('[data-tab-link="position"]').click();
  const section = page.locator('[data-tab="position"]');
  const set = (id, value) => section.locator(`#position-${id}`).fill(String(value));
  const expect = async (selector, wanted, what) => {
    const actual = await section.locator(selector).innerText();
    if (actual !== wanted) problems.push(`${where} position ${what}: shows "${actual}", wanted "${wanted}"`);
  };
  await set('a', 3);
  await set('b', 9);
  await set('c', 0);
  await expect('#position-total', '12 answers', 'total');
  await expect('#position-b-share', '75%', 'share of B');
  const prompt = await section.locator('#position-prompt').innerText();
  if (!prompt.includes('Nobody chose C')) problems.push(`${where} position: no prompt for the option nobody chose`);
  checkNoStrayValue(await section.innerText(), `${where} position`);
  await checkNoSideScroll(page, `${where} position`);
  for (const id of ['a', 'b', 'c']) await set(id, '');

  // Part 2's explorer: each tab shows its own facts, and "A link fails" plays the first step.
  const explorer = section.locator('#position-explorer');
  for (const [tab, wanted] of [['C', 'Ready-made flow table entries'], ['A', 'Routing messages'], ['B', 'The link-state database']]) {
    await explorer.locator(`.hv-tabs [data-m="${tab}"]`).click();
    const travels = await explorer.locator('.f-trav').innerText();
    if (!travels.startsWith(wanted)) problems.push(`${where} position explorer ${tab}: shows "${travels}"`);
  }
  await explorer.locator('.hv-go').click();
  await page.waitForTimeout(600);
  if ((await explorer.locator('.hv-steps li.on').count()) !== 1) problems.push(`${where} position explorer: the first step did not light up`);
  if ((await explorer.locator('.hv-link.dead').count()) !== 1) problems.push(`${where} position explorer: no failed link drawn`);
  await explorer.locator('.hv-tabs [data-m="A"]').click();
}

// v2: the deck's Previous / Next bar walks every step from the agenda to the last reserve, in order.
async function checkFlow(page, where) {
  await page.locator('[data-tab-link="start"]').click();
  const label = page.locator('#flow-label');
  const first = await label.innerText();
  const total = Number(first.match(/of (\d+)/)?.[1]);
  if (!first.startsWith('1 of') || !total) problems.push(`${where} flow: starts at "${first}"`);
  for (let i = 2; i <= total; i += 1) {
    await page.locator('#flow-next').click();
    const text = await label.innerText();
    if (!text.startsWith(`${i} of ${total}`)) problems.push(`${where} flow step ${i}: shows "${text}"`);
    const shown = page.locator('[data-tab]:not([hidden])');
    checkNoStrayValue(await shown.innerText(), `${where} flow step ${i}`);
    await checkNoSideScroll(page, `${where} flow step ${i}`);
  }
  if (!(await page.locator('#flow-next').isDisabled())) problems.push(`${where} flow: Next should stop at the last step`);
  // The agenda opens a step directly.
  await page.locator('[data-tab-link="start"]').click();
  await page.locator('.ag-item', { hasText: 'Passage 3' }).click();
  if (!(await page.locator('[data-tab="generations"]').isVisible())) problems.push(`${where} agenda: Passage 3 did not open Generations`);
}

// v2: each discussion deck opens with every answer hidden, opens one card, then all, then closes.
async function checkDecks(page, where) {
  for (const [tab, first] of [['practice', 'identical'], ['openflow', 'cpu']]) {
    await page.locator(`[data-tab-link="${tab}"]`).click();
    const section = page.locator(`[data-tab="${tab}"]`);
    const open = async () => section.locator('.deck-body:not([hidden])').count();
    if ((await open()) !== 0) problems.push(`${where} ${tab}: a card is open on landing`);
    await section.locator(`#${tab}-${first}-open`).click();
    if ((await open()) !== 1) problems.push(`${where} ${tab}: opening one card did not open exactly one`);
    await section.locator(`#${tab}-all`).click();
    const total = await section.locator('.deck-card').count();
    if ((await open()) !== total) problems.push(`${where} ${tab}: Open all left cards closed`);
    checkNoStrayValue(await section.innerText(), `${where} ${tab}`);
    await checkNoSideScroll(page, `${where} ${tab}`);
    await section.locator(`#${tab}-reset`).click();
    if ((await open()) !== 0) problems.push(`${where} ${tab}: Close all left cards open`);
  }
}

async function checkLandings(context, url, where) {
  for (const { hash, tab, silent, unset = [], clicks = [], edition = 'v1' } of LANDINGS) {
    if (edition !== EDITION && !(edition === 'all')) continue;
    const page = await context.newPage();
    await page.goto(`${url}#${hash}`);
    const section = page.locator(`[data-tab="${tab}"]`);
    await section.waitFor({ state: 'visible' });
    const expectText = async (words, wanted, step) => {
      const text = await section.innerText();
      checkNoStrayValue(text, `${where} ${hash} ${step}`);
      for (const word of words) {
        if (text.includes(word) !== wanted) problems.push(`${where} ${hash} ${step}: ${wanted ? 'should show' : 'gives away'} "${word}"`);
      }
    };
    await expectText(silent, false, 'landing');
    for (const selector of unset) {
      const value = await section.locator(`${selector}`).innerText();
      if (value !== '–') problems.push(`${where} ${hash} landing: ${selector} shows "${value}"`);
    }
    for (const click of clicks) {
      const target = section.locator(click.selector);
      if ((await target.count()) === 0) {
        problems.push(`${where} ${hash}: no ${click.selector} to click`);
        continue;
      }
      await target.click();
      await expectText(click.shows ?? [], true, `after ${click.selector}`);
      await expectText(click.silent ?? [], false, `after ${click.selector}`);
    }
    await page.close();
  }
}

// A null or undefined handed to the DOM renders as a word on the page.
function checkNoStrayValue(text, where) {
  const stray = text.match(/\b(null|undefined|NaN)\b/);
  if (stray) problems.push(`${where}: shows the word "${stray[0]}"`);
}

async function checkNoSideScroll(page, where) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 0) problems.push(`${where}: page scrolls sideways by ${overflow}px`);
}

async function run(browser, url, label, viewport) {
  const where = `[${label} ${viewport.name}]`;
  const context = await browser.newContext({ viewport });
  await context.setOffline(true);
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${where} console ${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`${where} page error: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`${where} failed request: ${r.url()}`));
  page.on('request', (r) => {
    if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) problems.push(`${where} network request: ${r.url()}`);
  });
  await page.goto(url);
  await checkHomeOpens(page, where);
  const tabs = await page.locator('[data-tab-link]').evaluateAll((els) => els.map((e) => e.dataset.tabLink));
  tabCount = tabs.length;
  for (const tab of tabs) await checkTab(page, tab, where);
  if (EDITION === 'v1') {
    await checkWalk(page, 'passages', where);
    await checkPosition(page, where);
  } else {
    await checkFlow(page, where);
    await checkDecks(page, where);
  }
  await checkLandings(context, url, where);
  await context.close();
}

await build({ edition: EDITION });
// The platform adds the document skeleton around the fragment. This stands in for it.
const fragmentHost = join(dirname(OUT.fragment), 'fragment-host.html');
await writeFile(
  fragmentHost,
  `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${await readFile(OUT.fragment, 'utf8')}</body></html>`,
);

const browser = await chromium.launch();
try {
  for (const viewport of VIEWPORTS) {
    await run(browser, pathToFileURL(OUT.standalone).href, 'standalone', viewport);
  }
  await run(browser, pathToFileURL(fragmentHost).href, 'fragment', VIEWPORTS[0]);
} finally {
  await browser.close();
}

const runs = VIEWPORTS.length + 1;
console.log(`${EDITION}: ${tabCount} tabs, ${stops / runs} stops and ${experiments / runs} guided experiments checked in ${runs} runs (standalone at 3 widths, fragment at 1), offline.`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of [...new Set(problems)]) console.error(`  ${p}`);
  process.exit(1);
}
console.log('Smoke test passed.');
