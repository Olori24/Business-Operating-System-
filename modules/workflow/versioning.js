class WorkflowVersionStore {
  constructor() {
    this.versions = new Map();
    this.published = new Map();
  }

  save(definition) {
    if (!definition || !definition.id) throw new Error('INVALID_WORKFLOW');
    const versions = this.versions.get(definition.id) || [];
    const version = versions.length + 1;
    const record = Object.freeze({ ...structuredClone(definition), version, status: 'draft' });
    versions.push(record);
    this.versions.set(definition.id, versions);
    return record;
  }

  publish(workflowId, version) {
    const record = this.get(workflowId, version);
    if (!record) throw new Error('WORKFLOW_VERSION_NOT_FOUND');
    const published = Object.freeze({ ...record, status: 'published' });
    this.published.set(workflowId, published);
    return published;
  }

  get(workflowId, version) {
    return (this.versions.get(workflowId) || []).find((item) => item.version === version) || null;
  }

  current(workflowId) {
    return this.published.get(workflowId) || null;
  }
}

module.exports = { WorkflowVersionStore };
