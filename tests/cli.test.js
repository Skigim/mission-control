import assert from 'assert';
import { execSync } from 'child_process';
import { storage } from '../server/storage.js';

console.log('Starting CLI Integration Tests...');

const snapshot = storage.read();

try {
  // Test 1: dashboard project add --json
  const addProjOutput = execSync(
    'node bin/dashboard.js project add "CLI Test Project" --id proj-cli-test --category "Testing" --json',
    { encoding: 'utf-8' }
  );
  const createdProj = JSON.parse(addProjOutput);
  assert.strictEqual(createdProj.id, 'proj-cli-test');
  console.log('PASS: "dashboard project add ... --json" passed.');

  // Test 2: dashboard list --json
  const listOutput = execSync('node bin/dashboard.js list --json', { encoding: 'utf-8' });
  const projects = JSON.parse(listOutput);
  assert(Array.isArray(projects), 'Output should be array of projects');
  assert(projects.some(p => p.id === 'proj-cli-test'), 'Should contain created test project');
  console.log('PASS: "dashboard list --json" passed.');

  // Test 3: dashboard project <id> --json
  const projOutput = execSync(`node bin/dashboard.js project "${createdProj.id}" --json`, { encoding: 'utf-8' });
  const projDetails = JSON.parse(projOutput);
  assert.strictEqual(projDetails.id, createdProj.id);
  assert(Array.isArray(projDetails.tasks), 'Project details should include tasks');
  console.log('PASS: "dashboard project <id> --json" passed.');

  // Test 4: dashboard task add
  const addTaskOutput = execSync(`node bin/dashboard.js task add "${createdProj.id}" "CLI Verification Task" --ai-status ai-ready --json`, { encoding: 'utf-8' });
  const createdTask = JSON.parse(addTaskOutput);
  assert.strictEqual(createdTask.title, 'CLI Verification Task');
  assert.strictEqual(createdTask.aiStatus, 'ai-ready');
  console.log('PASS: "dashboard task add ... --json" passed.');

  // Test 5: dashboard task update (agent completion defaults to needs-review)
  const updateTaskOutput = execSync(`node bin/dashboard.js task update "${createdTask.id}" --status done --json`, { encoding: 'utf-8' });
  const updatedTask = JSON.parse(updateTaskOutput);
  assert.strictEqual(updatedTask.status, 'done');
  assert.strictEqual(updatedTask.aiStatus, 'needs-review');
  console.log('PASS: "dashboard task update ... --json" agent completion default to needs-review passed.');

  // Test 5b: dashboard task update with explicit needs-review and "needs review" flag
  const explicitReviewOutput = execSync(`node bin/dashboard.js task update "${createdTask.id}" --ai-status "needs review" --json`, { encoding: 'utf-8' });
  const explicitTask = JSON.parse(explicitReviewOutput);
  assert.strictEqual(explicitTask.aiStatus, 'needs-review');
  console.log('PASS: "dashboard task update ... --ai-status \'needs review\'" normalization passed.');

  // Test 6: dashboard context
  const contextOutput = execSync(`node bin/dashboard.js context "${createdProj.id}"`, { encoding: 'utf-8' });
  assert(contextOutput.includes('PROJECT CONTEXT:'), 'Context must contain header');
  assert(contextOutput.includes(createdProj.name), 'Context must contain project name');
  console.log('PASS: "dashboard context <id>" passed.');

  // Test 6b: dashboard onboard & project update
  const onboardOutput = execSync(`node bin/dashboard.js onboard "${createdProj.id}"`, { encoding: 'utf-8' });
  assert(onboardOutput.includes('AGENT ONBOARDING WORKFLOW:'), 'Onboard output must contain workflow header');
  assert(onboardOutput.includes(createdProj.id), 'Onboard output must contain project ID');
  const updateProjOutput = execSync(
    `node bin/dashboard.js project update "${createdProj.id}" --desc "Updated via CLI onboarding" --stack "Node.js, TypeScript" --progress 45 --json`,
    { encoding: 'utf-8' }
  );
  const updatedProj = JSON.parse(updateProjOutput);
  assert.strictEqual(updatedProj.description, 'Updated via CLI onboarding');
  assert.strictEqual(updatedProj.techStack, 'Node.js, TypeScript');
  assert.strictEqual(updatedProj.progress, 45);
  console.log('PASS: "dashboard onboard <id>" & "dashboard project update <id>" passed.');

  // Test 7: dashboard project delete
  const delProjOutput = execSync(`node bin/dashboard.js project delete "${createdProj.id}" --json`, { encoding: 'utf-8' });
  const delResult = JSON.parse(delProjOutput);
  assert.strictEqual(delResult.deleted, true);
  console.log('PASS: "dashboard project delete <id> --json" passed.');

  // Test 7b: dashboard info --json
  const infoOutput = execSync('node bin/dashboard.js info --json', { encoding: 'utf-8' });
  const info = JSON.parse(infoOutput);
  assert(typeof info.rootDir === 'string');
  assert(typeof info.canonicalGlobalDir === 'string');
  console.log('PASS: "dashboard info --json" passed.');

  console.log('All CLI integration tests passed.\n');
} finally {
  storage.write(snapshot);
}
