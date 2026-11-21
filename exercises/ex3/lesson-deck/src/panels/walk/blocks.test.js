import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STOPS } from '../../editions/v2/stops.js';

// markText needs the DOM helper, so check the data it relies on: every mark is an exact,
// non-overlapping phrase of its quote, and every v2 quote carries a caption.
test('v2 quote marks are exact, non-overlapping phrases', () => {
  for (const stop of STOPS) {
    for (const block of stop.blocks.filter((b) => b.type === 'quote')) {
      assert.ok(block.cite?.section, `${stop.id} quote has a caption`);
      const spans = block.marks.map((m) => [block.text.indexOf(m), m]).sort((a, b) => a[0] - b[0]);
      let end = 0;
      for (const [at, m] of spans) {
        assert.ok(at >= 0, `${stop.id}: "${m}" is in the quote`);
        assert.ok(at >= end, `${stop.id}: "${m}" overlaps another mark`);
        end = at + m.length;
      }
    }
  }
});
