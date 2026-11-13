import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import app from './app';
import { env } from './config/env.config';
import { logger } from './utils/logger';
import { currentSalonConfig } from './config/salon.config';
import { MediaStreamHandler } from './services/twilio/mediaStreamHandler';

const server = http.createServer(app);

// Create WebSocket Server attached to HTTP server
const wss = new WebSocketServer({ noServer: true });

// Handle WebSocket Upgrade on /media-stream route
server.on('upgrade', (request, socket, head) => {
  const urlString = request.url || '';
  const host = request.headers.host || 'localhost:3000';
  
  let pathname = '';
  try {
    const parsedUrl = new URL(urlString, `http://${host}`);
    pathname = parsedUrl.pathname;
  } catch (e) {
    pathname = urlString.split('?')[0];
  }

  logger.info({ pathname, urlString, host }, '⚡ Incoming WebSocket Upgrade Request');

  if (pathname.includes('media-stream')) {
    wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
      wss.emit('connection', ws, request);
    });
  } else {
    logger.warn({ pathname }, 'Unknown WebSocket route. Destroying socket.');
    socket.destroy();
  }
});

// Handle incoming Twilio Media Stream WebSocket connection
wss.on('connection', (ws: WebSocket) => {
  logger.info('⚡ New WebSocket Connection established on /media-stream');
  new MediaStreamHandler(ws);
});

// Start Server
const port = parseInt(env.PORT, 10) || 3000;

server.listen(port, () => {
  logger.info(`=======================================================`);
  logger.info(`🚀 AI Voice Receptionist Platform is running!`);
  logger.info(`📍 Business: ${currentSalonConfig.name} (${currentSalonConfig.location})`);
  logger.info(`🎙️ Voice Agent: ${currentSalonConfig.receptionistName} (Gemini Live API)`);
  logger.info(`🌐 Web Dashboard: http://localhost:${port}`);
  logger.info(`📞 Twilio Voice Webhook: http://localhost:${port}/twilio/voice`);
  logger.info(`⚡ Media Stream WebSocket: ws://localhost:${port}/media-stream`);
  logger.info(`=======================================================`);
});
