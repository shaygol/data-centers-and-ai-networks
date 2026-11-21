// Shared UI helpers for labs and panels. Nothing here touches the DOM at import time,
// so `node --test` can import view.js files.

const SVG_NS = 'http://www.w3.org/2000/svg';

function fill(el, attrs, children) {
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : value);
  }
  el.append(...children.flat().filter((c) => c !== null && c !== undefined && c !== false));
  return el;
}

export const h = (tag, attrs = {}, ...children) => fill(document.createElement(tag), attrs, children);
export const svg = (tag, attrs = {}, ...children) => fill(document.createElementNS(SVG_NS, tag), attrs, children);

// The label every simulated value sits under (Spec, evidence rule).
export const illustrationLabel = (text = 'Values here come from a small live model, not from a paper.') =>
  h('p', { class: 'illustration', 'data-illustration': true }, h('strong', {}, 'Illustration.'), ' ', text);

// Paper evidence or a derived value, shown apart from simulated values, with its source.
export const paperNote = (text, source) =>
  h('p', { class: 'paper-note' }, text, ' ', h('cite', {}, source));

// A labeled value with aligned digits. Returns the element; call .set(value, detail) to update.
export function stat(label, { id } = {}) {
  const value = h('span', { class: 'stat-value', id });
  const detail = h('span', { class: 'stat-detail' });
  const el = h('div', { class: 'stat' }, h('span', { class: 'stat-label' }, label), value, detail);
  const name = el.firstChild;
  el.set = (v, d = '', newLabel = label) => {
    name.textContent = newLabel;
    value.textContent = v;
    detail.textContent = d;
    detail.hidden = !d;
  };
  return el;
}

// A stacked capacity bar. tone is one of own, relay, idle, hot. Text carries the same values as color.
export function loadBar(label) {
  const track = h('div', { class: 'load-track', role: 'img' });
  const legend = h('ul', { class: 'load-legend' });
  const el = h('div', { class: 'load' }, h('span', { class: 'stat-label' }, label), track, legend);
  const name = el.firstChild;
  el.set = (segments, newLabel = label) => {
    name.textContent = newLabel;
    track.setAttribute('aria-label', segments.map((s) => `${s.label} ${pct(s.value)}`).join(', '));
    track.replaceChildren(
      ...segments.map((s) => {
        const seg = h('span', { class: `load-seg tone-${s.tone}` });
        seg.style.width = `${Math.max(0, s.value) * 100}%`;
        return seg;
      }),
    );
    legend.replaceChildren(
      ...segments.map((s) =>
        h('li', {}, h('span', { class: `load-key tone-${s.tone}` }), `${s.label} `, h('b', {}, pct(s.value))),
      ),
    );
  };
  return el;
}

export const pct = (x) => `${Math.round(x * 100)}%`;

// A segmented control with stable ids. onChange gets the chosen value.
export function segmented({ id, legend, options, onChange }) {
  const inputs = options.map((o) => {
    const input = h('input', { type: 'radio', id: `${id}-${o.value}`, name: id, value: o.value });
    input.addEventListener('change', () => onChange(o.value));
    return input;
  });
  const el = h(
    'fieldset',
    { class: 'segmented' },
    h('legend', {}, legend),
    options.map((o, i) => h('label', { for: `${id}-${o.value}` }, inputs[i], h('span', {}, o.label))),
  );
  el.set = (value) => {
    for (const input of inputs) input.checked = input.value === value;
  };
  return el;
}

export function toggle({ id, label, onChange }) {
  const input = h('input', { type: 'checkbox', id });
  input.addEventListener('change', () => onChange(input.checked));
  const el = h('label', { class: 'toggle', for: id }, input, h('span', {}, label));
  el.set = (on) => {
    input.checked = on;
  };
  return el;
}

// Copy that would answer a question in class, kept back until the presenter clicks. Call .set(open)
// when the lab lands again.
export function heldBack({ id, label }, ...content) {
  const box = h('div', { id: `${id}-content`, hidden: true }, ...content);
  const button = h('button', { type: 'button', id, class: 'held-back-button', onclick: () => el.set(true) }, label);
  const el = h('div', { class: 'held-back' }, button, box);
  el.set = (open) => {
    box.hidden = !open;
    button.hidden = open;
  };
  return el;
}

// A range input with its value beside it. Call .set(value, disabled) to update.
export function slider({ id, label, labelClass = '', min, max, step, format, onInput }) {
  const input = h('input', { type: 'range', id, min, max, step });
  const value = h('output', { class: 'slider-value', id: `${id}-value`, for: id });
  input.addEventListener('input', () => onInput(Number(input.value)));
  const el = h('label', { class: 'slider', for: id }, h('span', { class: `slider-name ${labelClass}` }, label), value, input);
  el.set = (v, disabled = false) => {
    input.value = String(v);
    input.disabled = disabled;
    value.textContent = format(v);
    el.classList.toggle('is-disabled', disabled);
  };
  return el;
}

// Makes a drawn element work like a button, by mouse and by keyboard.
export function onActivate(el, fn) {
  el.addEventListener('click', fn);
  el.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fn();
    }
  });
}

// What a lab does when one of its controls moves it off the guided experiment.
export const experimentLeaver = (ctx, state, paint) => () => {
  state.guided = false;
  ctx.clearExperiment();
  paint();
};

// A link id as prose: T2-S3 reads T2–S3.
export const linkName = (id) => id.replace('-', '–');

// A button that opens another tab's guided experiment and offers a way back to this card.
export const jumpButton = (ctx, { tab, arg, returnArg, label }) =>
  h('button', { type: 'button', class: 'jump', 'data-jump': `${tab}~${arg}`, onclick: () => ctx.jump({ tab, arg }, returnArg) }, label);

// One debate box for every page: same markup, same place (top of the page), same look (v2).
export function debateBox(question, reply, replyLabel = 'The paper\'s reply') {
  return h(
    'section',
    { class: 'debate-box' },
    h('p', { class: 'debate-label' }, 'Debate'),
    h('p', { class: 'debate-q' }, question),
    reply ? h('details', { class: 'debate-reply' }, h('summary', {}, replyLabel), h('p', {}, reply)) : null,
  );
}
