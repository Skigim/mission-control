import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { storage } from './storage.js';
import {
  pickDirectoryDialog,
  inspectLocalDirectory,
  openLocalDirectory
} from './localFs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '..', 'dist');

export const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Server-Sent Events (SSE) connection list
const sseClients = new Set();

storage.on('change', (payload) => {
  const message = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
});

// SSE endpoint for real-time live synchronization
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Full dataset
app.get('/api/data', (req, res) => {
  res.json(storage.read());
});

// Local Filesystem Endpoints
app.post('/api/fs/pick-folder', async (req, res) => {
  try {
    const selectedPath = await pickDirectoryDialog();
    if (!selectedPath) {
      return res.json({ cancelled: true, path: null, inspection: null });
    }
    const inspection = inspectLocalDirectory(selectedPath);
    res.json({ cancelled: false, path: selectedPath, inspection });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fs/inspect', (req, res) => {
  try {
    const { path: targetPath } = req.body;
    const inspection = inspectLocalDirectory(targetPath);
    res.json(inspection);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fs/open', (req, res) => {
  try {
    const { path: targetPath, target } = req.body;
    const result = openLocalDirectory(targetPath, target || 'explorer');
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Projects
app.get('/api/projects', (req, res) => {
  res.json(storage.getProjects());
});

app.get('/api/projects/:id', (req, res) => {
  const proj = storage.getProject(req.params.id);
  if (!proj) return res.status(404).json({ error: 'Project not found' });
  res.json(proj);
});

app.post('/api/projects', (req, res) => {
  try {
    const created = storage.createProject(req.body);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/projects/:id', (req, res) => {
  const updated = storage.updateProject(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Project not found' });
  res.json(updated);
});

app.delete('/api/projects/:id', (req, res) => {
  const deleted = storage.deleteProject(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Project not found' });
  res.json({ success: true });
});

// Tasks
app.get('/api/tasks', (req, res) => {
  const filter = {};
  if (req.query.projectId) filter.projectId = req.query.projectId;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.aiStatus) filter.aiStatus = req.query.aiStatus;
  res.json(storage.getTasks(filter));
});

app.post('/api/tasks', (req, res) => {
  try {
    const created = storage.createTask(req.body);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks/reorder', (req, res) => {
  try {
    const updated = storage.reorderTasks(req.body || {});
    if (!updated) return res.status(404).json({ error: 'Task not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:id', (req, res) => {
  const updated = storage.updateTask(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Task not found' });
  res.json(updated);
});

app.delete('/api/tasks/:id', (req, res) => {
  const deleted = storage.deleteTask(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Task not found' });
  res.json({ success: true });
});

// Milestones
app.get('/api/milestones', (req, res) => {
  res.json(storage.getMilestones(req.query.projectId));
});

app.post('/api/milestones', (req, res) => {
  try {
    const created = storage.createMilestone(req.body);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/milestones/:id', (req, res) => {
  const updated = storage.updateMilestone(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Milestone not found' });
  res.json(updated);
});

app.delete('/api/milestones/:id', (req, res) => {
  const deleted = storage.deleteMilestone(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Milestone not found' });
  res.json({ success: true });
});

// AI Context Generator
app.get('/api/ai-context/:projectId', (req, res) => {
  const prompt = storage.getAIContext(req.params.projectId);
  if (!prompt) return res.status(404).json({ error: 'Project not found' });
  res.json({ prompt });
});

// Agent Onboarding Workflow Generator
app.get('/api/onboarding/:projectId', (req, res) => {
  const proj = storage.getProject(req.params.projectId);
  if (!proj) return res.status(404).json({ error: 'Project not found' });
  const result = storage.getOnboardingWorkflow({ projectId: req.params.projectId });
  res.json(result);
});

app.post('/api/onboarding/preview', (req, res) => {
  const { projectId, localPath, name } = req.body || {};
  const result = storage.getOnboardingWorkflow({ projectId, localPath, name });
  res.json(result);
});

// Activity Log
app.post('/api/log', (req, res) => {
  const { actor, action, message, projectId } = req.body;
  if (!action || !message) {
    return res.status(400).json({ error: 'action and message are required' });
  }
  storage.logActivity(actor || 'human', action, message, projectId);
  res.json({ success: true });
});

// Serve static production frontend when built
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
}

export function startServer(port = PORT) {
  return new Promise((resolve) => {
    const srv = app.listen(port, () => {
      console.log(`Mission Control Server active on http://localhost:${port}`);
      resolve(srv);
    });
    srv.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} already active; attaching to existing server.`);
        resolve(null);
      }
    });
  });
}

// Auto-start when executed directly (`node server/server.js`)
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer(PORT);
}
