const NODE_TYPES = new Set(['trigger', 'condition', 'action', 'approval']);

function validateWorkflow(definition) {
  if (!definition || !definition.id || !Array.isArray(definition.nodes) || !Array.isArray(definition.edges)) {
    throw new Error('INVALID_WORKFLOW_DEFINITION');
  }
  const ids = new Set();
  for (const node of definition.nodes) {
    if (!node.id || ids.has(node.id) || !NODE_TYPES.has(node.type)) throw new Error('INVALID_WORKFLOW_NODE');
    ids.add(node.id);
  }
  for (const edge of definition.edges) {
    if (!edge.from || !edge.to || !ids.has(edge.from) || !ids.has(edge.to)) throw new Error('INVALID_WORKFLOW_EDGE');
    if (edge.from === edge.to) throw new Error('WORKFLOW_SELF_LOOP');
  }
  const incoming = new Set(definition.edges.map((edge) => edge.to));
  if (!definition.nodes.some((node) => node.type === 'trigger' && !incoming.has(node.id))) throw new Error('WORKFLOW_TRIGGER_REQUIRED');
  return structuredClone(definition);
}

module.exports = { NODE_TYPES, validateWorkflow };
