const assert = require('node:assert/strict');
const test = require('node:test');
const { health, readiness } = require('../production_readiness');

test('health returns stable operational contract', () => assert.equal(health({ version: '1.2.3', now: 'now' }).status, 'ok'));
test('readiness fails when dependency is unavailable', () => assert.equal(readiness({ dependencies: { database: true, queue: false } }).status, 'not_ready'));
test('readiness succeeds when all dependencies are healthy', () => assert.equal(readiness({ dependencies: { database: true, queue: true } }).status, 'ready'));
