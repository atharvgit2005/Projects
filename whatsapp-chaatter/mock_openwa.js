const http = require('http');

const PORT = 8081;

const server = http.createServer((req, res) => {
  const { method, url } = req;
  
  if (url === '/api-docs' || url === '/docs' || url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      openapi: "3.0.0",
      info: { title: "OpenWA REST API (Mock Server)", version: "1.0.0" },
      paths: {
        "/sendText": {
          post: {
            summary: "Send text message via WhatsApp",
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      args: {
                        type: "object",
                        properties: {
                          to: { type: "string" },
                          content: { type: "string" }
                        }
                      }
                    }
                  }
                }
              }
            },
            responses: { "200": { description: "Message queued" } }
          }
        }
      }
    }, null, 2));
    return;
  }

  if (method === 'POST' && (url === '/sendText' || url === '/api/sendText')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let parsed = {};
      try { parsed = JSON.parse(body); } catch (e) {}
      
      const apiKey = req.headers['api_key'] || req.headers['authorization'];
      const recipient = parsed.args?.to || parsed.to || 'unknown';
      const messageText = parsed.args?.content || parsed.content || parsed.text || '';

      console.log("\n==================================================");
      console.log(" 🟢 [MOCK OPENWA SERVER] OUTBOUND MESSAGE RECEIVED");
      console.log("==================================================");
      console.log(`- API Key Header: ${apiKey || '(none)'}`);
      console.log(`- Recipient (to): ${recipient}`);
      console.log(`- Message Content:\n  "${messageText}"`);
      console.log("==================================================\n");

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: "Mock message sent successfully", id: `mock_msg_${Date.now()}` }));
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: "Not Found" }));
});

server.listen(PORT, () => {
  console.log(`🚀 Mock OpenWA Server listening on http://localhost:${PORT}`);
  console.log(`- Docs/OpenAPI Spec: http://localhost:${PORT}/api-docs`);
  console.log(`- Send Endpoint: POST http://localhost:${PORT}/sendText`);
});
