const assert = require('node:assert/strict');
const test = require('node:test');
const { plan, withinLimit } = require('../plans');

test('exposes stable plan limits', () => { assert.equal(plan('starter').monthlyCents, 2900); assert.equal(withinLimit('starter', 'members', 5), true); assert.equal(withinLimit('starter', 'members', 6), false); });
test('rejects unknown plans', () => assert.throws(() => plan('unknown'), /Unknown plan/));
