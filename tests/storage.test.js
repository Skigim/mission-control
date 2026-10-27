import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { storage } from '../server/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const statusMdPath = path.join(rootDir, 'STATUS.md');

console.log('Starting Storage Engine Tests...');

const snapshot = storage.read();

try {
  // Test 1: Reads data structure
  const data = storage.read();
  assert(Array.isArray(data.projects), 'Projects should be an array');
  assert(Array.isArray(data.tasks), 'Tasks should be an array');
  console.log('PASS: Storage read verified.');

  // Test 2: Create Project
  const testProj = storage.createProject({
    id: 'proj-test-auto',
    name: 'Automated Test Project',
    category: 'Testing',
    status: 'active',
    health: 'on-track',
    priority: 'high',
    progress: 50,
    aiGuidelines: 'Run automated checks.'
  });
  assert.strictEqual(testProj.id, 'proj-test-auto');
  const retrievedProj = storage.getProject('proj-test-auto');
  assert.strictEqual(retrievedProj.name, 'Automated Test Project');
  console.log('PASS: Project creation & retrieval verified.');

  // Test 3: STATUS.md exists and is synchronized
  assert(fs.existsSync(statusMdPath), 'STATUS.md must exist in root');
  const statusContent = fs.readFileSync(statusMdPath, 'utf-8');
  assert(statusContent.includes('Mission Control'), 'STATUS.md should have Mission Control header');
  assert(statusContent.includes('AI Agent Quick Reference'), 'STATUS.md should have AI reference section');
  console.log('PASS: STATUS.md generation verified.');

  // Test 4: Create Task with AI status
  const testTask = storage.createTask({
    projectId: 'proj-test-auto',
    title: 'Automated Test Task',
    status: 'todo',
    aiStatus: 'ai-ready',
    priority: 'urgent',
    actor: 'ai-agent'
  });
  assert.strictEqual(testTask.projectId, 'proj-test-auto');
  assert.strictEqual(testTask.aiStatus, 'ai-ready');
  console.log('PASS: Task creation with AI status verified.');

  // Test 4b: Reorder Tasks & Stage Move
  const testTask2 = storage.createTask({
    projectId: 'proj-test-auto',
    title: 'Second Automated Test Task',
    status: 'todo',
    aiStatus: 'ai-ready',
    priority: 'medium'
  });
  const movedTask = storage.reorderTasks({
    taskId: testTask2.id,
    status: 'in-progress',
    aiStatus: 'agent-in-progress',
    orderedIds: [testTask2.id, testTask.id]
  });
  assert.strictEqual(movedTask.status, 'in-progress');
  assert.strictEqual(movedTask.aiStatus, 'agent-in-progress');
  assert.strictEqual(storage.getTask(testTask2.id).order, 1);
  assert.strictEqual(storage.getTask(testTask.id).order, 2);
  console.log('PASS: Task reordering and stage movement verified.');

  // Test 4c: Agent task completion defaults to needs-review & normalizes human-review
  const completedTask = storage.updateTask(testTask2.id, {
    status: 'done',
    actor: 'ai-agent'
  });
  assert.strictEqual(completedTask.status, 'done');
  assert.strictEqual(completedTask.aiStatus, 'needs-review');
  const legacyNormTask = storage.updateTask(testTask.id, {
    aiStatus: 'human-review'
  });
  assert.strictEqual(legacyNormTask.aiStatus, 'needs-review');
  console.log('PASS: Agent task completion default to needs-review & normalization verified.');

  // Test 5: AI Context Prompt Generation
  const aiContext = storage.getAIContext('proj-test-auto');
  assert(aiContext.includes('Automated Test Project'), 'Context should contain project name');
  assert(aiContext.includes('Run automated checks.'), 'Context should contain guidelines');
  assert(aiContext.includes('Automated Test Task'), 'Context should contain task');
  console.log('PASS: AI Context prompt generation verified.');

  // Test 5b: Storage Paths & Canonical Global Directory
  const paths = storage.getPaths();
  assert(typeof paths.rootDir === 'string' && paths.rootDir.length > 0);
  assert(typeof paths.dataDir === 'string' && paths.dataDir.includes('data'));
  assert(typeof paths.canonicalGlobalDir === 'string' && paths.canonicalGlobalDir.includes('.mission-control'));
  console.log('PASS: Storage paths and canonical global directory verified.');

  // Milestones: CRUD and unknown-ID handling
  const testMs = storage.createMilestone({ projectId: 'proj-test-auto', title: 'Storage Milestone' });
  assert.strictEqual(testMs.completed, false);
  assert.strictEqual(storage.updateMilestone(testMs.id, { completed: true }).completed, true);
  assert.strictEqual(storage.updateMilestone('ms-nope', { completed: true }), null);
  assert.strictEqual(storage.deleteMilestone('ms-nope'), false, 'Unknown milestone delete returns false');
  assert.strictEqual(storage.deleteMilestone(testMs.id), true);
  assert.strictEqual(storage.getMilestones('proj-test-auto').length, 0);
  console.log('PASS: Milestone CRUD & unknown-ID handling verified.');

  // Clean up test project
  storage.deleteProject('proj-test-auto');
  assert(!storage.getProject('proj-test-auto'), 'Test project should be deleted');
  console.log('PASS: Clean up & cascading task delete verified.');

  console.log('All storage tests passed.\n');
} finally {
  storage.write(snapshot);
}
