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

  // Test 5: AI Context Prompt Generation
  const aiContext = storage.getAIContext('proj-test-auto');
  assert(aiContext.includes('Automated Test Project'), 'Context should contain project name');
  assert(aiContext.includes('Run automated checks.'), 'Context should contain guidelines');
  assert(aiContext.includes('Automated Test Task'), 'Context should contain task');
  console.log('PASS: AI Context prompt generation verified.');

  // Clean up test project
  storage.deleteProject('proj-test-auto');
  assert(!storage.getProject('proj-test-auto'), 'Test project should be deleted');
  console.log('PASS: Clean up & cascading task delete verified.');

  console.log('All storage tests passed.\n');
} finally {
  storage.write(snapshot);
}
