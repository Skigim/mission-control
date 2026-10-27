#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { storage } from '../server/storage.js';

const server = new Server(
  {
    name: 'personal-dashboard-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const TOOLS = [
  {
    name: 'dashboard_list_projects',
    description: 'Lists all projects in the personal dashboard with their current status, health, progress percentage, and priorities.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Optional filter by status: planning, active, paused, review, completed',
        },
      },
    },
  },
  {
    name: 'dashboard_get_project_context',
    description: 'Retrieves comprehensive AI context for a project including description, architecture rules, tech stack, and associated tasks.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project to retrieve context for',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'dashboard_create_project',
    description: 'Creates a new project in the personal dashboard.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Optional custom slug ID for the project',
        },
        name: {
          type: 'string',
          description: 'Name of the project',
        },
        description: {
          type: 'string',
          description: 'Project scope and objectives',
        },
        category: {
          type: 'string',
          description: 'Category label (e.g., Infrastructure, Web, AI)',
        },
        status: {
          type: 'string',
          enum: ['planning', 'active', 'paused', 'review', 'completed'],
          default: 'active',
        },
        health: {
          type: 'string',
          enum: ['on-track', 'at-risk', 'blocked', 'completed'],
          default: 'on-track',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          default: 'medium',
        },
        progress: {
          type: 'number',
          description: 'Initial progress percentage (0-100)',
        },
        techStack: {
          type: 'string',
          description: 'Comma-separated tech stack',
        },
        repoUrl: {
          type: 'string',
          description: 'Repository URL or local workspace path',
        },
        aiGuidelines: {
          type: 'string',
          description: 'Markdown guidelines and rules for AI agents working on this project',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Project tags',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'dashboard_onboard_project',
    description: 'Generates a structured Agent Onboarding Workflow for a project ID or local directory path, instructing the agent on how to inspect the directory and populate setup details.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Existing project ID to onboard or audit',
        },
        localPath: {
          type: 'string',
          description: 'Local workspace directory path to inspect and onboard',
        },
        name: {
          type: 'string',
          description: 'Optional project name override',
        },
      },
    },
  },
  {
    name: 'dashboard_update_project',
    description: 'Updates a project\'s setup details, status line/description, health, progress percentage, tech stack, or AI guidelines.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project to update',
        },
        name: {
          type: 'string',
          description: 'Updated project name',
        },
        description: {
          type: 'string',
          description: 'Updated project status line and summary description',
        },
        category: {
          type: 'string',
          description: 'Updated project category',
        },
        status: {
          type: 'string',
          enum: ['planning', 'active', 'paused', 'review', 'completed'],
        },
        health: {
          type: 'string',
          enum: ['on-track', 'at-risk', 'blocked', 'completed'],
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
        },
        progress: {
          type: 'number',
          description: 'Progress percentage between 0 and 100',
        },
        techStack: {
          type: 'string',
          description: 'Comma-separated tech stack',
        },
        localPath: {
          type: 'string',
          description: 'Local filesystem directory path',
        },
        repoUrl: {
          type: 'string',
          description: 'Remote repository or live site URL',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Project tags',
        },
        aiGuidelines: {
          type: 'string',
          description: 'Markdown guidelines and rules for AI agents working on this project',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'dashboard_add_task',
    description: 'Creates a new task associated with a project in the personal dashboard.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the parent project',
        },
        title: {
          type: 'string',
          description: 'Concise title of the task',
        },
        description: {
          type: 'string',
          description: 'Detailed instructions or acceptance criteria',
        },
        status: {
          type: 'string',
          enum: ['backlog', 'todo', 'in-progress', 'review', 'done'],
          default: 'todo',
        },
        aiStatus: {
          type: 'string',
          enum: ['ai-ready', 'agent-in-progress', 'needs-review', 'needs review', 'human-only', 'ai-completed', 'human-review'],
          default: 'ai-ready',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          default: 'medium',
        },
        dueDate: {
          type: 'string',
          description: 'Due date in YYYY-MM-DD format',
        },
      },
      required: ['projectId', 'title'],
    },
  },
  {
    name: 'dashboard_update_task',
    description: 'Updates an existing task\'s title, description, status (column), AI delegation status, priority, or due date.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'The ID of the task to update',
        },
        title: {
          type: 'string',
          description: 'Updated task title',
        },
        description: {
          type: 'string',
          description: 'Updated task description or acceptance criteria',
        },
        dueDate: {
          type: 'string',
          description: 'Updated due date in YYYY-MM-DD format',
        },
        status: {
          type: 'string',
          enum: ['backlog', 'todo', 'in-progress', 'review', 'done'],
        },
        aiStatus: {
          type: 'string',
          enum: ['ai-ready', 'agent-in-progress', 'needs-review', 'needs review', 'human-only', 'ai-completed', 'human-review'],
          description: 'AI delegation status. Default tag for a task completed by an agent is "needs-review".',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
        },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'dashboard_delete_task',
    description: 'Permanently deletes a task from the personal dashboard.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'The ID of the task to delete',
        },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'dashboard_list_milestones',
    description: 'Lists milestones, optionally filtered by project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Optional project ID to filter by',
        },
      },
    },
  },
  {
    name: 'dashboard_add_milestone',
    description: 'Creates a milestone for a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the parent project',
        },
        title: {
          type: 'string',
          description: 'Milestone title',
        },
        targetDate: {
          type: 'string',
          description: 'Target date in YYYY-MM-DD format',
        },
        completed: {
          type: 'boolean',
          description: 'Whether the milestone is already achieved',
        },
      },
      required: ['projectId', 'title'],
    },
  },
  {
    name: 'dashboard_update_milestone',
    description: 'Updates a milestone\'s title, target date, or completion state.',
    inputSchema: {
      type: 'object',
      properties: {
        milestoneId: {
          type: 'string',
          description: 'The ID of the milestone to update',
        },
        title: {
          type: 'string',
          description: 'Updated title',
        },
        targetDate: {
          type: 'string',
          description: 'Updated target date in YYYY-MM-DD format',
        },
        completed: {
          type: 'boolean',
          description: 'Updated completion state',
        },
      },
      required: ['milestoneId'],
    },
  },
  {
    name: 'dashboard_delete_milestone',
    description: 'Permanently deletes a milestone.',
    inputSchema: {
      type: 'object',
      properties: {
        milestoneId: {
          type: 'string',
          description: 'The ID of the milestone to delete',
        },
      },
      required: ['milestoneId'],
    },
  },
  {
    name: 'dashboard_log_activity',
    description: 'Records an activity or milestone achieved by an AI agent into the dashboard activity log.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Short headline of the action taken (e.g., Code Refactored, Unit Tests Added)',
        },
        message: {
          type: 'string',
          description: 'Detailed description of the changes made or findings',
        },
      },
      required: ['action', 'message'],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: toolArgs } = request.params;

  try {
    switch (name) {
      case 'dashboard_list_projects': {
        const projects = storage.getProjects();
        const filtered = toolArgs?.status
          ? projects.filter(p => p.status === toolArgs.status)
          : projects;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(filtered, null, 2),
            },
          ],
        };
      }

      case 'dashboard_get_project_context': {
        const context = storage.getAIContext(toolArgs.projectId);
        if (!context) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Project "${toolArgs.projectId}" was not found.` }],
          };
        }
        return {
          content: [{ type: 'text', text: context }],
        };
      }

      case 'dashboard_create_project': {
        const created = storage.createProject({ ...toolArgs, actor: 'ai' });
        return {
          content: [
            {
              type: 'text',
              text: `Project "${created.name}" (${created.id}) created successfully: ${JSON.stringify(created, null, 2)}`,
            },
          ],
        };
      }

      case 'dashboard_update_project': {
        const { projectId, ...updates } = toolArgs;
        const updated = storage.updateProject(projectId, { ...updates, actor: 'ai' });
        if (!updated) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Project "${projectId}" not found.` }],
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: `Project "${updated.name}" updated successfully: ${JSON.stringify(updated, null, 2)}`,
            },
          ],
        };
      }

      case 'dashboard_add_task': {
        const task = storage.createTask({ ...toolArgs, actor: 'ai' });
        return {
          content: [
            {
              type: 'text',
              text: `Task "${task.title}" (${task.id}) created successfully under project ${task.projectId}.`,
            },
          ],
        };
      }

      case 'dashboard_update_task': {
        const { taskId, title, description, status, aiStatus, priority, dueDate } = toolArgs;
        const updates = Object.fromEntries(Object.entries({ title, description, status, aiStatus, priority, dueDate })
          .filter(([, v]) => v !== undefined));
        const updated = storage.updateTask(taskId, { ...updates, actor: 'ai' });
        if (!updated) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Task "${taskId}" not found.` }],
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: `Task "${updated.title}" (${updated.id}) updated: status=${updated.status}, aiStatus=${updated.aiStatus}.`,
            },
          ],
        };
      }

      case 'dashboard_delete_task': {
        if (!storage.deleteTask(toolArgs.taskId)) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Task "${toolArgs.taskId}" not found.` }],
          };
        }
        return {
          content: [{ type: 'text', text: `Task "${toolArgs.taskId}" deleted.` }],
        };
      }

      case 'dashboard_list_milestones': {
        return {
          content: [
            { type: 'text', text: JSON.stringify(storage.getMilestones(toolArgs?.projectId), null, 2) },
          ],
        };
      }

      case 'dashboard_add_milestone': {
        if (!storage.getProject(toolArgs.projectId)) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Project "${toolArgs.projectId}" not found.` }],
          };
        }
        const { projectId, title, targetDate, completed } = toolArgs;
        const ms = storage.createMilestone({ projectId, title, targetDate, completed });
        return {
          content: [
            { type: 'text', text: `Milestone "${ms.title}" (${ms.id}) created under project ${ms.projectId}.` },
          ],
        };
      }

      case 'dashboard_update_milestone': {
        const { milestoneId, title, targetDate, completed } = toolArgs;
        const updates = {};
        if (title !== undefined) updates.title = title;
        if (targetDate !== undefined) updates.targetDate = targetDate;
        if (completed !== undefined) updates.completed = completed;
        const updated = storage.updateMilestone(milestoneId, updates);
        if (!updated) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Milestone "${milestoneId}" not found.` }],
          };
        }
        return {
          content: [
            { type: 'text', text: `Milestone "${updated.title}" (${updated.id}) updated: completed=${updated.completed}, targetDate=${updated.targetDate || 'none'}.` },
          ],
        };
      }

      case 'dashboard_delete_milestone': {
        if (!storage.deleteMilestone(toolArgs.milestoneId)) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Milestone "${toolArgs.milestoneId}" not found.` }],
          };
        }
        return {
          content: [{ type: 'text', text: `Milestone "${toolArgs.milestoneId}" deleted.` }],
        };
      }

      case 'dashboard_onboard_project': {
        const result = storage.getOnboardingWorkflow({
          projectId: toolArgs?.projectId,
          localPath: toolArgs?.localPath,
          name: toolArgs?.name,
        });
        return {
          content: [
            {
              type: 'text',
              text: result.prompt,
            },
          ],
        };
      }

      case 'dashboard_log_activity': {
        storage.logActivity('ai', toolArgs.action, toolArgs.message);
        return {
          content: [
            {
              type: 'text',
              text: `Activity logged successfully: [${toolArgs.action}] ${toolArgs.message}`,
            },
          ],
        };
      }

      default:
        return {
          isError: true,
          content: [{ type: 'text', text: `Unknown tool "${name}".` }],
        };
    }
  } catch (error) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Error executing tool "${name}": ${error.message}` }],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Personal Dashboard MCP Server running on stdio');
}

main().catch((err) => {
  console.error('Fatal MCP server error:', err);
  process.exit(1);
});
