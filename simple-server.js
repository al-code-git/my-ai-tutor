import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 5000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Store conversation history per client
const conversationHistory = new Map();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// WebSocket connection
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Initialize conversation history for this client
  const clientId = Math.random().toString(36).substring(7);
  conversationHistory.set(clientId, [
    {
      role: 'system',
      content: 'You are a helpful AI tutor. Provide clear, concise explanations. Keep responses to 1-2 sentences unless asked for more detail.'
    }
  ]);

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      console.log('Received:', message.text);

      // Get conversation history for this client
      const history = conversationHistory.get(clientId);
      
      // Add user message to history
      history.push({
        role: 'user',
        content: message.text
      });

      let response;

      if (GROQ_API_KEY) {
        // Use Grok API
        try {
          const apiResponse = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${GROQ_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'llama-3.1-8b-instant',
              messages: history,
              max_tokens: 200,
              temperature: 0.7
            })
          });

          if (!apiResponse.ok) {
            const error = await apiResponse.text();
            console.error('Grok API error:', error);
            response = 'Sorry, I encountered an error. Please try again.';
          } else {
            const data = await apiResponse.json();
            response = data.choices[0].message.content;
            
            // Add assistant response to history
            history.push({
              role: 'assistant',
              content: response
            });

            // Keep history to last 10 messages for performance
            if (history.length > 12) {
              history.splice(1, 2); // Remove oldest user/assistant pair (keeping system message)
            }
          }
        } catch (error) {
          console.error('API call failed:', error);
          response = 'Sorry, I encountered a connection error. Please try again.';
        }
      } else {
        // Mock response if no API key
        response = `I understand you asked: "${message.text}". How can I help you with that?`;
        history.push({
          role: 'assistant',
          content: response
        });
      }

      ws.send(JSON.stringify({
        type: 'response',
        text: response
      }));
    } catch (error) {
      console.error('Error:', error);
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    conversationHistory.delete(clientId);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Using ${GROQ_API_KEY ? 'Grok API' : 'Mock responses'}`);
});
