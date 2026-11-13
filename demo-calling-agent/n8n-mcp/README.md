# ⚙️ Local n8n Model Context Protocol (MCP) Server

A dedicated MCP server for managing, creating, executing, and monitoring workflows in your local n8n Docker instance (`http://localhost:5678`).

---

## 🛠️ Features & Exposed MCP Tools

1. `n8n_list_workflows`: List all active or inactive workflows in n8n.
2. `n8n_get_workflow`: Fetch full JSON structure of any workflow by ID.
3. `n8n_create_workflow`: Dynamically create new workflows programmatically.
4. `n8n_activate_workflow`: Activate (turn ON) a workflow so its webhooks start listening.
5. `n8n_deactivate_workflow`: Deactivate (turn OFF) a workflow.
6. `n8n_list_executions`: Inspect recent workflow execution logs and statuses.
7. `n8n_import_voice_receptionist_workflow`: One-click utility that imports and activates the Habib's Salon AI Voice Receptionist workflow directly into your local n8n!

---

## 🚀 Quick Setup & Configuration

### 1. Get your n8n API Key
1. Open `http://localhost:5678` in your browser.
2. Go to **Settings** (gear icon in bottom left) -> **n8n API**.
3. Click **Create API Key**.
4. Copy the generated API key.

### 2. Configure Environment Variable
In `n8n-mcp/.env`:

```env
N8N_HOST=http://localhost:5678
N8N_API_KEY=your_copied_n8n_api_key
```

### 3. Add to your MCP Host Config (e.g., Claude Desktop, Antigravity, or Cursor)

Add the following block to your MCP config file (`mcp_config.json` or `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "n8n": {
      "command": "node",
      "args": [
        "/Users/atharvpaharia100/Desktop/Projects/demo-calling-agent/n8n-mcp/dist/index.js"
      ],
      "env": {
        "N8N_HOST": "http://localhost:5678",
        "N8N_API_KEY": "your_copied_n8n_api_key"
      }
    }
  }
}
```

---

## 🧪 Testing n8n MCP Server Manually

```bash
# Run dev mode
npm run dev

# Or run compiled server
npm start
```
