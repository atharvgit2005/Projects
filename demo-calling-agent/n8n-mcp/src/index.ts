import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const N8N_HOST = (process.env.N8N_HOST || 'http://localhost:5678').replace(/\/$/, '');
const N8N_API_KEY = process.env.N8N_API_KEY || '';

// Axios client for n8n REST API
const n8nClient: AxiosInstance = axios.create({
  baseURL: `${N8N_HOST}/api/v1`,
  headers: {
    'X-N8N-API-KEY': N8N_API_KEY,
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Tool Definitions
const TOOLS: Tool[] = [
  {
    name: 'n8n_list_workflows',
    description: 'List all workflows configured in the local n8n instance.',
    inputSchema: {
      type: 'object',
      properties: {
        activeOnly: {
          type: 'boolean',
          description: 'If true, returns only active workflows.'
        }
      }
    }
  },
  {
    name: 'n8n_get_workflow',
    description: 'Fetch detailed JSON configuration of a specific n8n workflow by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The unique ID of the workflow in n8n.'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'n8n_create_workflow',
    description: 'Create a new workflow in n8n with nodes, connections, and settings.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the new workflow.'
        },
        nodes: {
          type: 'array',
          description: 'Array of n8n node objects.'
        },
        connections: {
          type: 'object',
          description: 'Connections object linking n8n nodes.'
        },
        settings: {
          type: 'object',
          description: 'Workflow execution settings.'
        }
      },
      required: ['name', 'nodes', 'connections']
    }
  },
  {
    name: 'n8n_activate_workflow',
    description: 'Activate (turn ON) an n8n workflow so its webhook triggers listen for incoming requests.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The workflow ID to activate.'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'n8n_deactivate_workflow',
    description: 'Deactivate (turn OFF) an n8n workflow.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The workflow ID to deactivate.'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'n8n_list_executions',
    description: 'Get recent execution logs for workflows in n8n.',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'Optional workflow ID filter.'
        },
        limit: {
          type: 'number',
          description: 'Max number of executions to return (default 10).'
        }
      }
    }
  },
  {
    name: 'n8n_import_voice_receptionist_workflow',
    description: 'One-click automated import of the Habib\'s Salon AI Voice Receptionist workflow into local n8n.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

// Create MCP Server Instance
const server = new Server(
  {
    name: 'n8n-mcp-server',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Register Tool Handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    if (name === 'n8n_list_workflows') {
      const response = await n8nClient.get('/workflows');
      let workflows = response.data.data || response.data;
      if (args.activeOnly) {
        workflows = workflows.filter((w: any) => w.active);
      }
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, count: workflows.length, workflows }, null, 2) }]
      };
    }

    if (name === 'n8n_get_workflow') {
      const response = await n8nClient.get(`/workflows/${args.id}`);
      return {
        content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }]
      };
    }

    if (name === 'n8n_create_workflow') {
      const response = await n8nClient.post('/workflows', {
        name: args.name,
        nodes: args.nodes,
        connections: args.connections,
        settings: args.settings || { executionOrder: 'v1' }
      });
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, workflow: response.data }, null, 2) }]
      };
    }

    if (name === 'n8n_activate_workflow') {
      const response = await n8nClient.post(`/workflows/${args.id}/activate`);
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, message: `Workflow ${args.id} activated`, data: response.data }, null, 2) }]
      };
    }

    if (name === 'n8n_deactivate_workflow') {
      const response = await n8nClient.post(`/workflows/${args.id}/deactivate`);
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, message: `Workflow ${args.id} deactivated`, data: response.data }, null, 2) }]
      };
    }

    if (name === 'n8n_list_executions') {
      const limit = (args as any).limit || 10;
      const workflowIdFilter = (args as any).workflowId ? `&workflowId=${(args as any).workflowId}` : '';
      const response = await n8nClient.get(`/executions?limit=${limit}${workflowIdFilter}`);
      return {
        content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }]
      };
    }

    if (name === 'n8n_import_voice_receptionist_workflow') {
      const workflowFilePath = path.resolve(__dirname, '../../n8n_workflows/voice_receptionist_n8n_workflow.json');
      if (!fs.existsSync(workflowFilePath)) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: `Workflow file not found at ${workflowFilePath}` }) }]
        };
      }

      const workflowJson = JSON.parse(fs.readFileSync(workflowFilePath, 'utf8'));
      const response = await n8nClient.post('/workflows', workflowJson);
      const createdWorkflow = response.data;

      // Try activating it
      try {
        await n8nClient.post(`/workflows/${createdWorkflow.id}/activate`);
      } catch (e) {
        // Activation warning ok
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: "✅ Voice Receptionist Workflow imported successfully into n8n!",
            workflow_id: createdWorkflow.id,
            workflow_name: createdWorkflow.name
          }, null, 2)
        }]
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.message || String(error);
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: false, error: errorMsg }, null, 2) }],
      isError: true
    };
  }
});

// Start Server over Stdio Transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🚀 n8n MCP Server running over stdio');
}

main().catch((error) => {
  console.error('Fatal error in n8n MCP Server:', error);
  process.exit(1);
});
