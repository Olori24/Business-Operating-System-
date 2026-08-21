import fs from 'node:fs/promises';

const inputPath = process.argv[2] || 'monitor-results/lighthouse.json';
const outputPath = process.env.LIGHTHOUSE_SUMMARY || 'monitor-results/lighthouse-summary.json';
const report = JSON.parse(await fs.readFile(inputPath, 'utf8'));
const audits = report.audits;
const metrics = {
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

const thresholds = {
  performanceScoreMin: 90,
  firstContentfulPaintMsMax: 1800,
  largestContentfulPaintMsMax: 2500,
  cumulativeLayoutShiftMax: 0.1,
  totalBlockingTimeMsMax: 200,
  googleIdentityRequestsMax: 0,
};
const failures = [];
if (metrics.performanceScore < thresholds.performanceScoreMin) failures.push(`performance score ${metrics.performanceScore} < ${thresholds.performanceScoreMin}`);
if (metrics.firstContentfulPaintMs > thresholds.firstContentfulPaintMsMax) failures.push(`FCP ${metrics.firstContentfulPaintMs}ms > ${thresholds.firstContentfulPaintMsMax}ms`);
if (metrics.largestContentfulPaintMs > thresholds.largestContentfulPaintMsMax) failures.push(`LCP ${metrics.largestContentfulPaintMs}ms > ${thresholds.largestContentfulPaintMsMax}ms`);
if (metrics.cumulativeLayoutShift > thresholds.cumulativeLayoutShiftMax) failures.push(`CLS ${metrics.cumulativeLayoutShift} > ${thresholds.cumulativeLayoutShiftMax}`);
if (metrics.totalBlockingTimeMs > thresholds.totalBlockingTimeMsMax) failures.push(`TBT ${metrics.totalBlockingTimeMs}ms > ${thresholds.totalBlockingTimeMsMax}ms`);
if (metrics.googleIdentityRequests > thresholds.googleIdentityRequestsMax) failures.push(`Google Identity Services requests ${metrics.googleIdentityRequests} > ${thresholds.googleIdentityRequestsMax}`);

const summary = {
  monitor: 'lighthouse-production',
  checkedAt: new Date().toISOString(),
  url: report.finalUrl,
  metrics,
  thresholds,
  passed: failures.length === 0,
  failures,
};
await fs.writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
if (failures.length > 0) process.exitCode = 1;
