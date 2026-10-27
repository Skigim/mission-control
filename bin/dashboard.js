#!/usr/bin/env node

import { storage } from '../server/storage.js';

const args = process.argv.slice(2);
const command = args[0];

function parseFlags(argList) {
  const flags = {};
  for (let i = 0; i < argList.length; i++) {
    const item = argList[i];
    if (item.startsWith('--')) {
      const key = item.substring(2);
      const next = argList[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    }
  }
  return flags;
}

function printHelp() {
  console.log(`
Mission Control CLI — AI-Native Project & Status Manager

USAGE:
  node bin/dashboard.js <command> [arguments] [options]

COMMANDS:
  list                        List all projects & health
  onboard <id|path>           Generate an AI agent onboarding workflow to inspect & populate a project
                              Options: --create (create stub project if path not yet registered),
                                       --name <name>, --category <cat>
  project <id>                Show detailed info, AI guidelines & tasks for a project
  project add <name>          Create a new project
                              Options: --id <id>, --desc <text>, --category <cat>,
                                       --status <planning|active|paused|review|completed>,
                                       --priority <low|medium|high|urgent>, --stack <text>,
                                       --path <dir>, --repo <url>, --tags <t1,t2>, --guidelines <text>
  project update <id>         Update project setup details & metadata
                              Options: --name <text>, --desc <text>, --category <cat>,
                                       --status <status>, --health <health>, --priority <prio>,
                                       --progress <0-100>, --stack <text>, --path <dir>,
                                       --repo <url>, --tags <t1,t2>, --target <YYYY-MM-DD>,
                                       --guidelines <text>
  project delete <id>         Delete a project and its tasks
  status <id> <status>        Update project status (planning|active|paused|review|completed)
                              Options: --health <on-track|at-risk|blocked|completed>
                                       --progress <0-100>
  task list                   List tasks (Options: --project <id>, --ai-status <status>)
  task add <projId> <title>   Create a task
                              Options: --desc <text>, --status <todo|in-progress|review|done>,
                                       --ai-status <ai-ready|agent-in-progress|needs-review|human-only>,
                                       --priority <low|medium|high|urgent>, --due <YYYY-MM-DD>
  task update <taskId>        Update a task
                              Options: --status <todo|in-progress|review|done>,
                                       --ai-status <ai-ready|agent-in-progress|needs-review|human-only|ai-completed>,
                                       --priority <priority>
  context <projectId>         Output LLM-ready prompt context for an AI agent
  log <message>               Append an entry to the dashboard activity log
                              Options: --actor <ai|human>
  help                        Show this help message

GLOBAL OPTIONS:
  --json                      Output raw JSON for script/agent parsing
`);
}

async function run() {
  const flags = parseFlags(args.slice(1));
  const isJson = Boolean(flags.json);

  try {
    switch (command) {
      case 'list': {
        const projects = storage.getProjects();
        if (isJson) {
          console.log(JSON.stringify(projects, null, 2));
        } else {
          console.log('\nPROJECTS OVERVIEW:');
          console.log('-------------------------------------------------------------------------------');
          console.log('ID                      | Status    | Health    | Prog | Priority | Name');
          console.log('-------------------------------------------------------------------------------');
          if (projects.length === 0) {
            console.log('(No projects configured)');
          }
          for (const p of projects) {
            const idCol = p.id.padEnd(23);
            const statusCol = p.status.padEnd(9);
            const healthCol = (p.health || 'on-track').padEnd(9);
            const progCol = `${p.progress}%`.padEnd(4);
            const prioCol = (p.priority || 'medium').padEnd(8);
            console.log(`${idCol} | ${statusCol} | ${healthCol} | ${progCol} | ${prioCol} | ${p.name}`);
          }
          console.log('-------------------------------------------------------------------------------\n');
        }
        break;
      }

      case 'project': {
        const subOrId = args[1];
        if (!subOrId) {
          console.error('Error: Project ID or subcommand required. Usage: node bin/dashboard.js project <id|add|delete>');
          process.exit(1);
        }

        if (subOrId === 'add') {
          const name = args[2];
          if (!name) {
            console.error('Error: Project name required. Usage: node bin/dashboard.js project add <name> [options]');
            process.exit(1);
          }
          const created = storage.createProject({
            id: flags.id,
            name,
            description: flags.desc || '',
            category: flags.category || 'General',
            status: flags.status || 'active',
            health: flags.health || 'on-track',
            priority: flags.priority || 'medium',
            progress: flags.progress !== undefined ? Number(flags.progress) : 0,
            techStack: flags.stack || '',
            localPath: flags.path || '',
            repoUrl: flags.repo || '',
            aiGuidelines: flags.guidelines || '',
            tags: flags.tags ? flags.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
            actor: flags.actor || 'ai'
          });
          if (isJson) {
            console.log(JSON.stringify(created, null, 2));
          } else {
            console.log(`Created project "${created.name}" (${created.id})`);
          }
          break;
        }

        if (subOrId === 'update') {
          const targetId = args[2];
          if (!targetId) {
            console.error('Error: Project ID required. Usage: node bin/dashboard.js project update <id> [options]');
            process.exit(1);
          }
          const updates = { actor: flags.actor || 'ai' };
          if (flags.name !== undefined) updates.name = flags.name;
          if (flags.desc !== undefined) updates.description = flags.desc;
          if (flags.category !== undefined) updates.category = flags.category;
          if (flags.status !== undefined) updates.status = flags.status;
          if (flags.health !== undefined) updates.health = flags.health;
          if (flags.priority !== undefined) updates.priority = flags.priority;
          if (flags.progress !== undefined) updates.progress = Number(flags.progress);
          if (flags.stack !== undefined) updates.techStack = flags.stack;
          if (flags.path !== undefined) updates.localPath = flags.path;
          if (flags.repo !== undefined) updates.repoUrl = flags.repo;
          if (flags.target !== undefined) updates.targetDate = flags.target;
          if (flags.guidelines !== undefined) updates.aiGuidelines = flags.guidelines;
          if (flags.tags !== undefined) {
            updates.tags = String(flags.tags).split(',').map(t => t.trim()).filter(Boolean);
          }

          const updated = storage.updateProject(targetId, updates);
          if (!updated) {
            console.error(`Error: Project "${targetId}" not found.`);
            process.exit(1);
          }
          if (isJson) {
            console.log(JSON.stringify(updated, null, 2));
          } else {
            console.log(`Updated project "${updated.name}" (${updated.id})`);
          }
          break;
        }

        if (subOrId === 'delete') {
          const targetId = args[2];
          if (!targetId) {
            console.error('Error: Project ID required. Usage: node bin/dashboard.js project delete <id>');
            process.exit(1);
          }
          const deleted = storage.deleteProject(targetId);
          if (!deleted) {
            console.error(`Error: Project "${targetId}" not found.`);
            process.exit(1);
          }
          if (isJson) {
            console.log(JSON.stringify({ deleted: true, id: targetId }, null, 2));
          } else {
            console.log(`Deleted project "${targetId}"`);
          }
          break;
        }

        const proj = storage.getProject(subOrId);
        if (!proj) {
          console.error(`Error: Project "${subOrId}" not found.`);
          process.exit(1);
        }
        const tasks = storage.getTasks({ projectId: subOrId });
        if (isJson) {
          console.log(JSON.stringify({ ...proj, tasks }, null, 2));
        } else {
          console.log(`\n${proj.name} [${proj.id}]`);
          console.log(`Status: ${proj.status} | Health: ${proj.health} | Progress: ${proj.progress}% | Priority: ${proj.priority}`);
          console.log(`Category: ${proj.category} | Start: ${proj.startDate} | Target: ${proj.targetDate}`);
          if (proj.techStack) console.log(`Tech Stack: ${proj.techStack}`);
          if (proj.description) console.log(`\nDescription:\n  ${proj.description}`);
          if (proj.aiGuidelines) console.log(`\nAI Guidelines & Rules:\n  ${proj.aiGuidelines.replace(/\n/g, '\n  ')}`);
          console.log(`\nTasks (${tasks.length}):`);
          for (const t of tasks) {
            console.log(`  - [${t.status}] ${t.title} (${t.id}) [AI: ${t.aiStatus || 'none'}, Prio: ${t.priority}]`);
          }
          console.log('');
        }
        break;
      }

      case 'status': {
        const projId = args[1];
        const newStatus = args[2];
        if (!projId || !newStatus) {
          console.error('Error: Usage: node bin/dashboard.js status <projectId> <status> [--health <health>] [--progress <n>]');
          process.exit(1);
        }
        const updates = { status: newStatus, actor: flags.actor || 'ai' };
        if (flags.health) updates.health = flags.health;
        if (flags.progress !== undefined) updates.progress = Number(flags.progress);

        const updated = storage.updateProject(projId, updates);
        if (!updated) {
          console.error(`Project "${projId}" not found.`);
          process.exit(1);
        }
        if (isJson) {
          console.log(JSON.stringify(updated, null, 2));
        } else {
          console.log(`Project "${updated.name}" updated: status=${updated.status}, health=${updated.health}, progress=${updated.progress}%`);
        }
        break;
      }

      case 'task': {
        const sub = args[1];
        if (sub === 'list') {
          const filter = {};
          if (flags.project) filter.projectId = flags.project;
          if (flags['ai-status']) {
            let s = flags['ai-status'];
            if (s === 'human-review' || s === 'needs review') s = 'needs-review';
            filter.aiStatus = s;
          }
          if (flags.status) filter.status = flags.status;

          const tasks = storage.getTasks(filter);
          if (isJson) {
            console.log(JSON.stringify(tasks, null, 2));
          } else {
            console.log(`\nTASKS (${tasks.length}):`);
            for (const t of tasks) {
              console.log(`- [${t.status.toUpperCase()}] ${t.title} (${t.id}) [AI: ${t.aiStatus}, Prio: ${t.priority}] (Project: ${t.projectId})`);
            }
            console.log('');
          }
        } else if (sub === 'add') {
          const projectId = args[2];
          const title = args[3];
          if (!projectId || !title) {
            console.error('Error: Usage: node bin/dashboard.js task add <projectId> <title> [options]');
            process.exit(1);
          }
          let aiStatus = flags['ai-status'] || 'ai-ready';
          if (aiStatus === 'human-review' || aiStatus === 'needs review') {
            aiStatus = 'needs-review';
          }
          const task = storage.createTask({
            projectId,
            title,
            description: flags.desc || '',
            status: flags.status || 'todo',
            aiStatus,
            priority: flags.priority || 'medium',
            dueDate: flags.due || '',
            actor: flags.actor || 'ai'
          });
          if (isJson) {
            console.log(JSON.stringify(task, null, 2));
          } else {
            console.log(`Created task "${task.title}" (${task.id}) for project ${task.projectId}`);
          }
        } else if (sub === 'update') {
          const taskId = args[2];
          if (!taskId) {
            console.error('Error: Usage: node bin/dashboard.js task update <taskId> [options]');
            process.exit(1);
          }
          const updates = { actor: flags.actor || 'ai' };
          if (flags.status) updates.status = flags.status;
          if (flags['ai-status']) {
            let s = flags['ai-status'];
            if (s === 'human-review' || s === 'needs review') s = 'needs-review';
            updates.aiStatus = s;
          }
          if (flags.priority) updates.priority = flags.priority;
          if (flags.title) updates.title = flags.title;

          const updated = storage.updateTask(taskId, updates);
          if (!updated) {
            console.error(`Task "${taskId}" not found.`);
            process.exit(1);
          }
          if (isJson) {
            console.log(JSON.stringify(updated, null, 2));
          } else {
            console.log(`Updated task "${updated.title}" (${updated.id}): status=${updated.status}, aiStatus=${updated.aiStatus}`);
          }
        } else {
          console.error('Unknown task subcommand. Try: node bin/dashboard.js task [list|add|update]');
        }
        break;
      }

      case 'onboard': {
        const targetArg = args[1] && !args[1].startsWith('--') ? args[1] : (flags.path || flags.id || '');
        if (!targetArg) {
          console.error('Error: Project ID or local directory path required. Usage: node bin/dashboard.js onboard <projectId|localPath> [--create]');
          process.exit(1);
        }

        let existingProject = storage.getProject(targetArg);
        let localPath = existingProject ? existingProject.localPath : targetArg;

        if (!existingProject && flags.create) {
          existingProject = storage.createProject({
            name: typeof flags.name === 'string' ? flags.name : '',
            category: typeof flags.category === 'string' ? flags.category : 'General',
            status: 'active',
            health: 'on-track',
            priority: 'medium',
            localPath,
            actor: flags.actor || 'human'
          });
        }

        const workflow = storage.getOnboardingWorkflow({
          projectId: existingProject?.id,
          localPath,
          name: typeof flags.name === 'string' ? flags.name : undefined
        });

        if (isJson) {
          console.log(JSON.stringify(workflow, null, 2));
        } else {
          console.log(workflow.prompt);
        }
        break;
      }

      case 'context': {
        const projId = args[1];
        if (!projId) {
          console.error('Error: Usage: node bin/dashboard.js context <projectId>');
          process.exit(1);
        }
        const ctx = storage.getAIContext(projId);
        if (!ctx) {
          console.error(`Project "${projId}" not found.`);
          process.exit(1);
        }
        console.log(ctx);
        break;
      }

      case 'log': {
        const message = args.slice(1).filter((a, idx, arr) => {
          if (a.startsWith('--')) return false;
          if (idx > 0 && arr[idx - 1].startsWith('--')) return false;
          return true;
        }).join(' ');
        if (!message) {
          console.error('Error: Message required. Usage: node bin/dashboard.js log "message" [--actor ai|human] [--project <id>]');
          process.exit(1);
        }
        const actor = flags.actor || 'ai';
        const projectId = typeof flags.project === 'string' ? flags.project : undefined;
        storage.logActivity(actor, 'Agent Log Entry', message, projectId);
        console.log(`Logged: [${actor}] ${message}`);
        break;
      }

      case 'help':
      case '--help':
      case '-h':
      default:
        printHelp();
        break;
    }
  } catch (err) {
    console.error('Command execution failed:', err);
    process.exit(1);
  }
}

run();
