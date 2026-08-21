const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const onboardingHtml = fs.readFileSync(
  path.join(__dirname, '..', 'onboarding.html'),
  'utf8',
);

test('onboarding page lazy-loads Google Identity Services', () => {
  assert.doesNotMatch(
    onboardingHtml,
    /<script[^>]+accounts\.google\.com\/gsi\/client[^>]*>/,
    'Google Identity Services must not be eagerly loaded by a script tag',
  );
  assert.match(
    onboardingHtml,
    /function loadGoogleIdentityServices\(\)/,
    'the page must define a dynamic Google Identity Services loader',
  );
  assert.match(
    onboardingHtml,
    /google\.addEventListener\('pointerover',renderGoogle/,
    'the loader must be triggered by interaction with the authentication surface',
  );
  assert.match(
    onboardingHtml,
    /google\.addEventListener\('focusin',renderGoogle/,
    'the loader must support keyboard and assistive-technology focus',
  );
});
