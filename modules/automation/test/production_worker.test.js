const test=require('node:test');const assert=require('node:assert/strict');const{conditionPass}=require('../production_worker');

test('conditionPass evaluates equality and nested context references',()=>{assert.equal(conditionPass({field:'status',operator:'equals',value:'paid'},{status:'paid'}),true);assert.equal(conditionPass({field:'status',operator:'equals',value:'paid'},{status:'pending'}),false);assert.equal(conditionPass({left:'{{customer.score}}',operator:'gte',right:80},{customer:{score:91}}),true);});

test('conditionPass supports contains and existence',()=>{assert.equal(conditionPass({field:'message',operator:'contains',value:'urgent'},{message:'urgent lead'}),true);assert.equal(conditionPass({field:'missing',operator:'exists'},{message:'x'}),false);});
