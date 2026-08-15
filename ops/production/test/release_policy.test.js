const assert = require('node:assert/strict');
const test = require('node:test');
const { releaseGate } = require('../release_policy');

test('requires all production gates', () => { assert.equal(releaseGate({ ciGreen: true, readinessGreen: true, backupFresh: true }), true); assert.equal(releaseGate({ ciGreen: true, readinessGreen: false, backupFresh: true }), false); });
