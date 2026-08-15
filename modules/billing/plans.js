const PLANS = Object.freeze({ starter: { name: 'Starter', monthlyCents: 2900, limits: { executions: 10000, members: 5 } }, growth: { name: 'Growth', monthlyCents: 9900, limits: { executions: 100000, members: 25 } }, enterprise: { name: 'Enterprise', monthlyCents: null, limits: { executions: Infinity, members: Infinity } } });

function plan(name) { if (!PLANS[name]) throw new Error('Unknown plan'); return PLANS[name]; }
function withinLimit(name, resource, usage) { return usage <= plan(name).limits[resource]; }
module.exports = { PLANS, plan, withinLimit };
