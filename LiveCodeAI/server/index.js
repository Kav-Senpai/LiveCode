require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { Groq } = require('groq-sdk');
const { setupWSConnection } = require('y-websocket/bin/utils');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Initialize Groq with fallback for development
let groq;
if (process.env.GROQ_API_KEY) {
  groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
  });
  console.log('Groq initialized with API key');
} else {
  console.warn('WARNING: No Groq API key found. AI features will return mock responses.');
  // Mock Groq service for development
  groq = {
    chat: {
      completions: {
        create: async () => ({
          choices: [{ 
            message: { 
              content: 'I\'ve analyzed your code and here are my suggestions:\n\n```javascript\n// This is a mock AI response.\n// Add your Groq API key to enable real responses.\nfunction enhancedFunction() {\n  // Better implementation\n  console.log("Hello from improved code");\n  return { success: true, message: "Operation completed" };\n}\n```\n\nThe improvements include better error handling and a more structured return value.' 
            } 
          }]
        })
      }
    }
  };
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));  // Increase limit for larger code contexts

// AI System prompt template
const getSystemPrompt = () => `
You are an expert AI Coding Assistant with deep knowledge of software development best practices and design patterns.

When responding to user coding questions:
1. Format code blocks properly using Markdown triple backticks with the appropriate language identifier
2. Provide concise explanations outside of code blocks
3. Focus on giving complete, working solutions that can be implemented directly
4. When suggesting code improvements, explain the benefits of your changes
5. If you need to generate multiple files, clearly indicate file names

For example:
\`\`\`javascript
// Improved implementation
function betterFunction() {
  // Your code here
}
\`\`\`

Keep your responses professional, direct, and helpful. Imagine you're a senior developer helping a teammate.
`;

// Function to craft the AI prompt
const createAIPrompt = (code, instruction, context) => {
  // Clean and prepare the context
  const cleanContext = context || 'No additional context provided';
  
  // Create a structured prompt
  return `${getSystemPrompt()}

## WORKSPACE CONTEXT
${cleanContext}

## USER REQUEST
${instruction}

## CURRENT CODE
\`\`\`
${code || 'No code provided'}
\`\`\`

Please provide a solution that addresses the user's request directly. Focus on providing code that can be implemented right away.
`;
};

// REST endpoint for AI requests
app.post('/ai-request', async (req, res) => {
  try {
    console.log('Received AI request');
    const { code, instruction, context } = req.body;
    
    // Create structured prompt
    const prompt = createAIPrompt(code, instruction, context);
    
    console.log('Sending request to Groq API');
    const completion = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        { role: "system", content: getSystemPrompt() },
        { role: "user", content: prompt }
      ],
      temperature: 0.5,  // Lower for more focused responses
      max_tokens: 4000,
    });

    console.log('Received response from Groq API');
    res.json({
      code: completion.choices[0].message.content
    });
  } catch (error) {
    console.error('AI request error:', error);
    res.status(500).json({ 
      message: 'Failed to process AI request',
      error: error.message 
    });
  }
});

// WebSocket setup for Y.js
io.on('connection', (socket) => {
  console.log('New client connected');
  setupWSConnection(socket);
  
  // Handle user presence
  socket.on('user-joined', (userData) => {
    console.log('User joined:', userData);
    socket.broadcast.emit('user-joined', userData);
  });

  // Handle AI requests
  socket.on('ai-request', async (data) => {
    try {
      console.log('Received AI request via WebSocket');
      const { code, instruction, context } = data;
      
      // Create structured prompt
      const prompt = createAIPrompt(code, instruction, context);
      
      console.log('Sending WebSocket request to Groq API');
      const completion = await groq.chat.completions.create({
        model: "llama3-70b-8192",
        messages: [
          { role: "system", content: getSystemPrompt() },
          { role: "user", content: prompt }
        ],
        temperature: 0.5,  // Lower for more focused responses
        max_tokens: 4000,
      });

      console.log('Sending AI response via WebSocket');
      socket.emit('ai-response', {
        code: completion.choices[0].message.content
      });
    } catch (error) {
      console.error('AI request error:', error);
      socket.emit('ai-error', { 
        message: 'Failed to process AI request',
        error: error.message 
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    ai: process.env.GROQ_API_KEY ? 'configured' : 'mock mode' 
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket running at ws://localhost:${PORT}`);
}); 