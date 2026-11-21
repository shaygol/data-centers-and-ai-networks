import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from './build.mjs';

const { standalone, fragment } = await build({ write: false });

test('the local file is a full document that carries its own CSS and JS (ticket 03)', () => {
  assert.match(standalone, /^<!doctype html>/i);
  assert.match(standalone, /<title>Jupiter Rising Labs<\/title>/);
  assert.match(standalone, /<style>/);
  assert.match(standalone, /<script>/);
});

test('the publish fragment starts with the title and viewport meta, with no document tags (ticket 03)', () => {
  assert.match(fragment, /^<title>Jupiter Rising Labs<\/title>\s*<meta name="claude:viewport-fit-sides" content="cover">\s*<style>/);
  assert.doesNotMatch(fragment, /<!doctype|<html|<head|<body/i);
});

test('neither output loads anything from the network (ticket 03)', () => {
  for (const html of [standalone, fragment]) {
    const urls = (html.match(/https?:\/\/[^\s"'`)]+/g) ?? []).filter((u) => u !== 'http://www.w3.org/2000/svg');
    assert.deepEqual(urls, []);
    assert.doesNotMatch(html, /<link\b|<script\s+src|@import|url\(/i);
  }
});

test('the page contract bans are respected (ticket 03)', () => {
  for (const html of [standalone, fragment]) {
    assert.doesNotMatch(html, /\b(alert|confirm|prompt)\(|window\.print|<a [^>]*download/);
  }
});

test('the side gutter uses the safe-area form on the outer wrapper (ticket 03)', () => {
  assert.match(standalone, /padding-left: max\(16px, env\(safe-area-inset-left, 0px\)\)/);
  assert.match(standalone, /padding-right: max\(16px, env\(safe-area-inset-right, 0px\)\)/);
});
