import assert from 'assert';
import { spawn } from 'child_process';
import { storage } from '../server/storage.js';

console.log('Starting API Server Integration Tests...');

const snapshot = storage.read();
const TEST_PORT = 3099;
const serverProcess = spawn('node', ['server/server.js'], {
  env: { ...process.env, PORT: TEST_PORT },
  stdio: 'inherit'
});

// Wait for server to boot
await new Promise(r => setTimeout(r, 1500));

try {
  // Test 1: GET /api/health
  const healthRes = await fetch(`http://localhost:${TEST_PORT}/api/health`);
  assert.strictEqual(healthRes.status, 200);
  const healthData = await healthRes.json();
  assert.strictEqual(healthData.status, 'ok');
  assert(typeof healthData.installDir === 'string');
  assert(typeof healthData.canonicalGlobalDir === 'string');
  console.log('PASS: GET /api/health verified.');

  // Test 2: GET /api/data
  const dataRes = await fetch(`http://localhost:${TEST_PORT}/api/data`);
  assert.strictEqual(dataRes.status, 200);
  const fullData = await dataRes.json();
  assert(Array.isArray(fullData.projects));
  assert(Array.isArray(fullData.tasks));
  assert(typeof fullData.installDir === 'string');
  console.log('PASS: GET /api/data verified.');

  // Test 3: POST /api/projects
  const postProjRes = await fetch(`http://localhost:${TEST_PORT}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'proj-api-test',
      name: 'API Integration Test Project',
      status: 'active',
      health: 'on-track',
      priority: 'high'
    })
  });
  assert.strictEqual(postProjRes.status, 201);
  const testProj = await postProjRes.json();
  assert.strictEqual(testProj.id, 'proj-api-test');
  console.log('PASS: POST /api/projects verified.');

  // Test 4: POST /api/tasks
  const postTaskRes = await fetch(`http://localhost:${TEST_PORT}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: testProj.id,
      title: 'REST API Test Task',
      status: 'in-progress',
      aiStatus: 'agent-in-progress',
      priority: 'high'
    })
  });
  assert.strictEqual(postTaskRes.status, 201);
  const newTask = await postTaskRes.json();
  assert.strictEqual(newTask.title, 'REST API Test Task');
  console.log('PASS: POST /api/tasks verified.');

  // Test 4b: POST /api/tasks/reorder
  const reorderRes = await fetch(`http://localhost:${TEST_PORT}/api/tasks/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      taskId: newTask.id,
      status: 'review',
      aiStatus: 'needs-review',
      orderedIds: [newTask.id]
    })
  });
  assert.strictEqual(reorderRes.status, 200);
  const reorderedTask = await reorderRes.json();
  assert.strictEqual(reorderedTask.status, 'review');
  assert.strictEqual(reorderedTask.aiStatus, 'needs-review');
  console.log('PASS: POST /api/tasks/reorder verified.');

  // Test 5: GET /api/ai-context/:projectId
  const contextRes = await fetch(`http://localhost:${TEST_PORT}/api/ai-context/${testProj.id}`);
  assert.strictEqual(contextRes.status, 200);
  const contextJson = await contextRes.json();
  assert(contextJson.prompt.includes('PROJECT CONTEXT:'));
  console.log('PASS: GET /api/ai-context/:projectId verified.');

  // Test 5b: GET /api/onboarding/:projectId & POST /api/onboarding/preview
  const onboardRes = await fetch(`http://localhost:${TEST_PORT}/api/onboarding/${testProj.id}`);
  assert.strictEqual(onboardRes.status, 200);
  const onboardJson = await onboardRes.json();
  assert(onboardJson.prompt.includes('AGENT ONBOARDING WORKFLOW:'));
  console.log('PASS: GET /api/onboarding/:projectId verified.');

  // Test 5c: Milestones CRUD & 404s
  const msRes = await fetch(`http://localhost:${TEST_PORT}/api/milestones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId: testProj.id, title: 'API Milestone' })
  });
  assert.strictEqual(msRes.status, 201);
  const testMs = await msRes.json();
  const msPut = await fetch(`http://localhost:${TEST_PORT}/api/milestones/${testMs.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed: true })
  });
  assert.strictEqual((await msPut.json()).completed, true);
  const msDel = await fetch(`http://localhost:${TEST_PORT}/api/milestones/${testMs.id}`, { method: 'DELETE' });
  assert.strictEqual(msDel.status, 200);
  const msDelAgain = await fetch(`http://localhost:${TEST_PORT}/api/milestones/${testMs.id}`, { method: 'DELETE' });
  assert.strictEqual(msDelAgain.status, 404);
  console.log('PASS: /api/milestones CRUD & 404 on unknown ID verified.');

  // Test 6: Cleanup task & project
  const delTaskRes = await fetch(`http://localhost:${TEST_PORT}/api/tasks/${newTask.id}`, {
    method: 'DELETE'
  });
  assert.strictEqual(delTaskRes.status, 200);

  const delProjRes = await fetch(`http://localhost:${TEST_PORT}/api/projects/${testProj.id}`, {
    method: 'DELETE'
  });
  assert.strictEqual(delProjRes.status, 200);
  console.log('PASS: DELETE /api/tasks/:id & /api/projects/:id verified.');

  console.log('All API integration tests passed.\n');
} finally {
  serverProcess.kill('SIGTERM');
  await new Promise(r => setTimeout(r, 500));
  storage.write(snapshot);
}
