import fs from 'node:fs/promises';

const inputPaths = process.argv.slice(2);
const outputPath = process.env.LIGHTHOUSE_SUMMARY || 'monitor-results/lighthouse-summary.json';
if (inputPaths.length === 0) throw new Error('At least one Lighthouse JSON report is required');

const reports = await Promise.all(inputPaths.map(async (inputPath) => ({
  inputPath,
  report: JSON.parse(await fs.readFile(inputPath, 'utf8')),
})));

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const getMetrics = ({ report }) => {
  const audits = report.audits;
  return {
    url: report.finalUrl,
    performanceScore: (report.categories.performance.score || 0) * 100,
    firstContentfulPaintMs: audits['first-contentful-paint'].numericValue,
    largestContentfulPaintMs: audits['largest-contentful-paint'].numericValue,
    cumulativeLayoutShift: audits['cumulative-layout-shift'].numericValue,
    totalBlockingTimeMs: audits['total-blocking-time'].numericValue,
    interactionToNextPaintMs: audits['interaction-to-next-paint']?.numericValue ?? null,
    mainThreadWorkMs: audits['mainthread-work-breakdown'].numericValue,
    bootupTimeMs: audits['bootup-time'].numericValue,
    googleIdentityRequests: (audits['network-requests'].details.items || []).filter((item) => item.url.includes('accounts.google.com/gsi/client')).length,
  };
};

const perRun = reports.map(getMetrics);
const metrics = {
  performanceScore: median(perRun.map((run) => run.performanceScore)),
  firstContentfulPaintMs: median(perRun.map((run) => run.firstContentfulPaintMs)),
  largestContentfulPaintMs: median(perRun.map((run) => run.largestContentfulPaintMs)),
  cumulativeLayoutShift: median(perRun.map((run) => run.cumulativeLayoutShift)),
  totalBlockingTimeMs: median(perRun.map((run) => run.totalBlockingTimeMs)),
  interactionToNextPaintMs: perRun.every((run) => run.interactionToNextPaintMs == null) ? null : median(perRun.map((run) => run.interactionToNextPaintMs || 0)),
  mainThreadWorkMs: median(perRun.map((run) => run.mainThreadWorkMs)),
  bootupTimeMs: median(perRun.map((run) => run.bootupTimeMs)),
  googleIdentityRequests: Math.max(...perRun.map((run) => run.googleIdentityRequests)),
};

const thresholds = {
  performanceScoreMin: 90,
  firstContentfulPaintMsMax: 1800,
  largestContentfulPaintMsMax: 2500,
  cumulativeLayoutShiftMax: 0.1,
  totalBlockingTimeMsMax: 200,
  googleIdentityRequestsMax: 0,
};
const failures = [];
if (metrics.performanceScore < thresholds.performanceScoreMin) failures.push(`median performance score ${metrics.performanceScore} < ${thresholds.performanceScoreMin}`);
if (metrics.firstContentfulPaintMs > thresholds.firstContentfulPaintMsMax) failures.push(`median FCP ${metrics.firstContentfulPaintMs}ms > ${thresholds.firstContentfulPaintMsMax}ms`);
if (metrics.largestContentfulPaintMs > thresholds.largestContentfulPaintMsMax) failures.push(`median LCP ${metrics.largestContentfulPaintMs}ms > ${thresholds.largestContentfulPaintMsMax}ms`);
if (metrics.cumulativeLayoutShift > thresholds.cumulativeLayoutShiftMax) failures.push(`median CLS ${metrics.cumulativeLayoutShift} > ${thresholds.cumulativeLayoutShiftMax}`);
if (metrics.totalBlockingTimeMs > thresholds.totalBlockingTimeMsMax) failures.push(`median TBT ${metrics.totalBlockingTimeMs}ms > ${thresholds.totalBlockingTimeMsMax}ms`);
if (metrics.googleIdentityRequests > thresholds.googleIdentityRequestsMax) failures.push(`Google Identity Services requests ${metrics.googleIdentityRequests} > ${thresholds.googleIdentityRequestsMax}`);

const summary = {
  monitor: 'lighthouse-production',
  checkedAt: new Date().toISOString(),
  url: perRun[0].url,
  runCount: perRun.length,
  aggregation: 'median for timing and score metrics; maximum for Google Identity Services request count',
  perRun,
  metrics,
  thresholds,
  passed: failures.length === 0,
  failures,
};
await fs.writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
if (failures.length > 0) process.exitCode = 1;
