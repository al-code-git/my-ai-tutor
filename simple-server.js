import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import cors from 'cors';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// WebSocket connection
wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('Received:', message.text);

      // Echo back with tutor response
      const response = `You said: "${message.text}". This is a mock response from the AI tutor.`;
      
      ws.send(JSON.stringify({
        type: 'response',
        text: response
      }));
    } catch (error) {
      console.error('Error:', error);
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  });

  ws.on('close', () => console.log('Client disconnected'));
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
