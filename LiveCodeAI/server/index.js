require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const OpenAI = require('openai');
const { setupWSConnection } = require('y-websocket/bin/utils');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Initialize OpenAI with fallback for development
let openai;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  console.log('OpenAI initialized with API key');
} else {
  console.warn('WARNING: No OpenAI API key found. AI features will return mock responses.');
  // Mock OpenAI service for development
  openai = {
    chat: {
      completions: {
        create: async () => ({
          choices: [{ 
            message: { 
              content: '// This is a mock AI response.\n// Add your OpenAI API key to enable real responses.\nfunction mockFunction() {\n  console.log("Hello from mock AI");\n  return true;\n}' 
            } 
          }]
        })
      }
    }
  };
}

// Middleware
app.use(cors());
app.use(express.json());

// WebSocket setup for Y.js
io.on('connection', (socket) => {
  setupWSConnection(socket);
  
  // Handle user presence
  socket.on('user-joined', (userData) => {
    socket.broadcast.emit('user-joined', userData);
  });

  // Handle AI requests
  socket.on('ai-request', async (data) => {
    try {
      const { code, instruction, context } = data;
      const prompt = `You are a senior software engineer helping refactor and improve code. Here is the context:\n\n${context}\n\nUser Instruction:\n${instruction}\n\nCode:\n${code}\n\nProvide only code output.`;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });

      socket.emit('ai-response', {
        code: completion.choices[0].message.content
      });
    } catch (error) {
      console.error('AI request error:', error);
      socket.emit('ai-error', { message: 'Failed to process AI request' });
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 