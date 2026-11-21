// Traffic growth: the paper's Figure 1 and what Google has published since. Pure data and math, no DOM.
// Figure 1 has no units: it is server traffic indexed to Jul 2008 (1x) up to Nov 2014 (50x).
// Google has not published that series since, so after 2014 only fabric capacity is real data.

// A year as a decimal: Jul 2008 is 2008.5.
const ym = (year, month) => year + (month - 1) / 12;

// Figure 1's two labeled ends (Jupiter §2: "Traffic has increased 50x in this time period").
export const TRAFFIC = [
  { t: ym(2008, 7), label: 'Jul 2008', value: 1, source: 'Jupiter Fig. 1' },
  { t: ym(2014, 11), label: 'Nov 2014', value: 50, source: 'Jupiter Fig. 1, §2' },
];

// Largest-fabric bisection bandwidth, in Tb/s. Up to 2012 from Table 2; after that from Google.
// `after` marks values from outside the paper.
export const CAPACITY = [
  { t: 2005, label: 'Firehose 1.0', tbps: 10, source: 'Jupiter Table 2' },
  { t: 2006, label: 'Firehose 1.1', tbps: 10, source: 'Jupiter Table 2' },
  { t: 2008, label: 'Watchtower', tbps: 82, source: 'Jupiter Table 2' },
  { t: 2009, label: 'Saturn', tbps: 207, source: 'Jupiter Table 2' },
  { t: 2012, label: 'Jupiter', tbps: 1300, source: 'Jupiter Table 2' },
  { t: 2022, label: 'Jupiter + OCS', tbps: 6000, more: true, after: true, source: 'Google Cloud blog, Aug 2022 (“over 6 Pb/s”)' },
  { t: 2023, label: 'Jupiter, 400G core', tbps: 13100, after: true, source: 'Google Cloud blog, Oct 2024 (64 blocks × 204.8 Tb/s)' },
];

// Capacity is indexed to Watchtower, the fabric in service when Figure 1 starts (2008 = 1x).
export const CAPACITY_BASE = CAPACITY.find((c) => c.label === 'Watchtower');
export const capacityIndex = (c) => c.tbps / CAPACITY_BASE.tbps;

// The paper gives the rate two ways: "doubling every 12–15 months" (abstract) and "roughly doubling every year" (§2).
export const DOUBLING_MONTHS = { min: 12, max: 15, start: 12 };
export const NOW = ym(2026, 11);

// What-if: Figure 1's last value carried forward at a fixed doubling time. Arithmetic, not data.
export function extrapolate(months, t, from = TRAFFIC[1]) {
  return from.value * 2 ** (((t - from.t) * 12) / months);
}

// Doubling time implied by two points: Figure 1's ends give about 13.6 months.
export const impliedDoublingMonths = (a, b) => ((b.t - a.t) * 12) / Math.log2(b.value / a.value);

// Growth factor between two capacity points, for the "after the paper" comparison.
export const capacityGrowth = (from, to) => to.tbps / from.tbps;

// 38,800 → "38,800x"; 1.3 → "1.3x". Two significant figures above 100.
export function times(x) {
  if (x >= 100) {
    const digits = Math.floor(Math.log10(x)) + 1;
    const step = 10 ** (digits - 2);
    return `${(Math.round(x / step) * step).toLocaleString('en-US')}x`;
  }
  if (x >= 10) return `${Math.round(x)}x`;
  return `${Number(x.toPrecision(2))}x`;
}

export const tbpsText = (tbps) => (tbps >= 1000 ? `${Number((tbps / 1000).toPrecision(3))} Pb/s` : `${tbps} Tb/s`);

// The curve of Figure 1, traced from the paper's picture (about 120 points). It is a tracing, not published data, pinned to the figure's labels: 1x in Jul 2008, 50x in Nov 2014.
export const TRACE = [[2008.526,1.0],[2008.577,0.95],[2008.629,1.06],[2008.68,1.06],[2008.732,1.18],[2008.783,1.35],[2008.835,1.47],[2008.886,1.47],[2008.938,1.47],[2008.989,1.47],[2009.041,1.53],[2009.092,1.59],[2009.144,1.65],[2009.195,1.59],[2009.246,1.76],[2009.298,1.83],[2009.349,1.95],[2009.401,1.88],[2009.452,1.95],[2009.504,2.05],[2009.555,2.05],[2009.607,2.12],[2009.658,2.12],[2009.71,2.12],[2009.761,2.12],[2009.845,2.17],[2009.954,2.29],[2010.006,2.24],[2010.057,2.53],[2010.109,2.7],[2010.16,2.65],[2010.212,2.76],[2010.263,2.88],[2010.315,3.0],[2010.366,2.82],[2010.418,2.82],[2010.469,2.88],[2010.521,3.0],[2010.572,3.11],[2010.624,3.34],[2010.675,3.29],[2010.727,3.41],[2010.778,3.41],[2010.829,3.82],[2010.881,3.99],[2010.932,4.46],[2010.984,3.94],[2011.035,4.05],[2011.087,3.94],[2011.138,3.75],[2011.19,3.94],[2011.241,4.34],[2011.293,4.63],[2011.344,4.58],[2011.396,4.69],[2011.447,4.69],[2011.499,4.99],[2011.55,5.33],[2011.602,5.4],[2011.653,5.86],[2011.705,5.92],[2011.756,6.04],[2011.808,6.5],[2011.859,6.74],[2011.936,6.16],[2011.994,6.91],[2012.046,7.86],[2012.097,8.85],[2012.149,9.38],[2012.2,9.56],[2012.252,9.14],[2012.303,10.9],[2012.355,11.36],[2012.406,12.25],[2012.458,12.6],[2012.509,12.66],[2012.56,12.84],[2012.612,13.77],[2012.663,13.95],[2012.715,15.12],[2012.766,15.06],[2012.818,16.12],[2012.869,17.29],[2012.921,18.16],[2012.972,17.58],[2013.024,19.5],[2013.075,19.92],[2013.127,20.86],[2013.178,21.15],[2013.23,22.03],[2013.288,27.06],[2013.339,25.6],[2013.391,23.61],[2013.442,23.32],[2013.494,22.97],[2013.545,22.61],[2013.597,23.78],[2013.648,24.31],[2013.699,24.72],[2013.751,27.01],[2013.802,28.18],[2013.854,29.46],[2013.905,30.11],[2013.957,30.75],[2014.008,30.46],[2014.06,31.4],[2014.111,32.21],[2014.163,33.98],[2014.214,35.44],[2014.266,38.55],[2014.317,40.42],[2014.369,41.35],[2014.42,42.12],[2014.472,43.58],[2014.523,44.1],[2014.575,44.46],[2014.626,45.57],[2014.678,47.09],[2014.729,49.08],[2014.781,50.14],[2014.832,50.78]];
// Global data center IP traffic from the Cisco Global Cloud Index, indexed so that 2014 equals the paper's 50x. Annual totals, plotted at year end.
// 2014: 3.4 ZB per year (2015 edition). 2016 and 2021: the 2018 edition gives cloud traffic of 6.0 and 19.5 ZB per year, at 88% and 95% of the total, so about 6.8 and 20.5 ZB (our division). 2021 is a forecast.
export const INDUSTRY = [
  { t: 2014.83, label: '2014', zb: 3.4, source: 'Cisco Global Cloud Index 2015 edition: 3.4 ZB per year' },
  { t: 2016.83, label: '2016', zb: 6.8, source: 'Cisco Global Cloud Index 2018 edition: cloud 6.0 ZB per year at 88% of total (our division)' },
  { t: 2021.83, label: '2021 forecast', zb: 20.5, forecast: true, source: 'Cisco Global Cloud Index 2018 edition: cloud 19.5 ZB per year at 95% of total (our division), a forecast' }
].map((d) => ({ ...d, value: d.zb / 3.4 * 50 }));
