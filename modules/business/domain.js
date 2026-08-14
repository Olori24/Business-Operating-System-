function createBusiness({ id, organizationId, name, slug, description = '' }) {
  if (!id || !organizationId || !name || !slug) {
    throw new TypeError('Business requires id, organizationId, name, and slug');
  }

  return Object.freeze({
    id,
    organizationId,
    name,
    slug,
    description,
    type: 'business',
  });
}

function createProcess({ id, businessId, name, description = '' }) {
  if (!id || !businessId || !name) {
    throw new TypeError('Process requires id, businessId, and name');
  }

  return Object.freeze({
    id,
    businessId,
    name,
    description,
    type: 'process',
  });
}

function createTask({ id, processId, name, status = 'pending' }) {
  const statuses = ['pending', 'in_progress', 'completed'];
  if (!id || !processId || !name) {
    throw new TypeError('Task requires id, processId, and name');
  }
  if (!statuses.includes(status)) {
    throw new TypeError(`Unsupported task status: ${status}`);
  }

  return Object.freeze({
    id,
    processId,
    name,
    status,
    type: 'task',
  });
}

module.exports = {
  createBusiness,
  createProcess,
  createTask,
};
