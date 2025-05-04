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

// Function to craft the AI learning prompt
const createLearningPrompt = (code, difficulty, language) => {
  // Clean and prepare the inputs
  const cleanCode = code || 'No code provided';
  const cleanDifficulty = difficulty || 'beginner';
  const cleanLanguage = language || 'javascript';
  
  // Create a structured prompt for learning content
  return `
You are an expert coding instructor tasked with creating interactive educational content. 
Analyze the following ${cleanLanguage} code and create step-by-step learning material for ${cleanDifficulty} level students.

## CODE TO ANALYZE
\`\`\`${cleanLanguage}
${cleanCode}
\`\`\`

For each learning step, include:
1. A clear title describing the concept
2. A concise explanation in plain language
3. The specific code reference that illustrates this concept
4. A helpful hint for students

Also identify important programming concepts in the code that would benefit from explanation.

Format your response as a JSON object with the following structure:
{
  "steps": [
    {
      "title": "Step title",
      "explanation": "Clear explanation for students",
      "codeReference": "Exact code snippet that illustrates this concept",
      "hint": "Helpful hint for understanding"
    }
  ],
  "concepts": [
    {
      "name": "Concept name",
      "explanation": "What this concept means and why it's important"
    }
  ]
}

Ensure your explanations are appropriate for a ${cleanDifficulty} level student.
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

// Endpoint for generating files from a prompt
app.post('/ai-prompt-to-files', async (req, res) => {
  try {
    console.log('Received file generation request');
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }
    
    // Create a specialized system prompt for file generation
    const fileGenerationPrompt = `
You are an expert AI developer that specializes in generating multiple files from high-level feature descriptions.
Your job is to create multiple files and components based on the user's description of a feature they want to implement.

For each feature request:
1. Determine a sensible name for the feature
2. Identify all necessary files to implement the feature (components, utilities, styles, etc.)
3. Generate complete code for each file
4. Provide a brief description of each file's purpose

Your response must be in the following JSON format:
{
  "feature": {
    "name": "feature-name-as-kebab-case",
    "description": "Brief description of the overall feature"
  },
  "files": [
    {
      "filename": "ComponentName.jsx",
      "content": "Complete file content with all necessary imports, code, and exports",
      "description": "Purpose of this file"
    },
    ...more files
  ]
}

Make sure all files are complete, properly formatted, and ready to use. Include all necessary imports.
Ensure the files work together cohesively. Use modern best practices and patterns.
`;

    console.log('Sending file generation request to Groq API');
    const completion = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        { role: "system", content: fileGenerationPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 8000, // Larger limit for multiple files
    });

    // Parse the response as JSON
    try {
      const responseText = completion.choices[0].message.content;
      // Find JSON content (in case there's text before or after it)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Could not extract JSON from response');
      }
      
      const jsonContent = JSON.parse(jsonMatch[0]);
      console.log('Successfully generated files:', 
        jsonContent.files ? jsonContent.files.length : 0);
      
      res.json(jsonContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      res.status(500).json({
        message: 'Failed to generate files from prompt',
        error: 'The AI response was not in the expected format',
        rawResponse: completion.choices[0].message.content
      });
    }
  } catch (error) {
    console.error('File generation error:', error);
    res.status(500).json({ 
      message: 'Failed to generate files from prompt',
      error: error.message 
    });
  }
});

// Endpoint for generating learning content
app.post('/ai-learning-content', async (req, res) => {
  try {
    console.log('Received learning content request');
    const { code, difficulty, language } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: 'Code is required' });
    }
    
    // Create structured prompt for learning content
    const prompt = createLearningPrompt(code, difficulty, language);
    
    console.log('Sending learning content request to Groq API');
    const completion = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        { role: "user", content: prompt }
      ],
      temperature: 0.2,  // Lower for more consistent educational content
      max_tokens: 4000,
    });

    // Parse the response as JSON
    try {
      const responseText = completion.choices[0].message.content;
      // Find JSON content (in case there's text before or after it)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Could not extract JSON from response');
      }
      
      const jsonContent = JSON.parse(jsonMatch[0]);
      console.log('Successfully generated learning content:', 
        jsonContent.steps ? jsonContent.steps.length : 0, 'steps,',
        jsonContent.concepts ? jsonContent.concepts.length : 0, 'concepts');
      
      res.json(jsonContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      res.status(500).json({
        message: 'Failed to generate learning content',
        error: 'The AI response was not in the expected format',
        rawResponse: completion.choices[0].message.content
      });
    }
  } catch (error) {
    console.error('Learning content generation error:', error);
    res.status(500).json({ 
      message: 'Failed to generate learning content',
      error: error.message 
    });
  }
});

// WebSocket setup for Y.js
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Set up Y.js WebSocket connection
  setupWSConnection(socket);
  console.log('Y.js WebSocket connection established');
  
  // Track active rooms for collaboration reporting
  let activeRooms = new Set();
  
  // Handle WebSocket raw messages for room joining
  socket.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      if (message.type === 'join-room' && message.roomId) {
        console.log(`Client joined room via WebSocket message: ${message.roomId}`);
        socket.join(message.roomId);
        activeRooms.add(message.roomId);
        
        // Notify room about new user joining
        socket.to(message.roomId).emit('user-joined-room', {
          roomId: message.roomId,
          timestamp: new Date().toISOString()
        });
        
        // Broadcast room status
        io.to(message.roomId).emit('room-status', {
          room: message.roomId,
          users: io.sockets.adapter.rooms.get(message.roomId)?.size || 1
        });
      }
    } catch (err) {
      // Not JSON or not a room message
      console.error('Error processing WebSocket message:', err);
    }
  });
  
  // Handle room joining (Socket.IO method)
  socket.on('join-room', (roomId) => {
    console.log(`Client joined room: ${roomId}`);
    socket.join(roomId);
    activeRooms.add(roomId);
    
    // Notify room about new user joining
    socket.to(roomId).emit('user-joined-room', {
      roomId,
      timestamp: new Date().toISOString()
    });
    
    // Broadcast room status
    io.to(roomId).emit('room-status', {
      room: roomId,
      users: io.sockets.adapter.rooms.get(roomId)?.size || 1
    });
  });
  
  // Handle user presence
  socket.on('user-joined', (userData) => {
    console.log('User joined:', userData);
    
    // Add additional information useful for collaboration
    const enhancedUserData = {
      ...userData,
      connectedAt: new Date().toISOString(),
      clientId: socket.id
    };
    
    socket.broadcast.emit('user-joined', enhancedUserData);
  });
  
  // Handle file ownership changes
  socket.on('file-ownership-change', (data) => {
    console.log('File ownership changed:', data);
    
    // Validate the data
    if (!data.fileId || !data.owner || !data.owner.userId) {
      return;
    }
    
    // Broadcast to all other clients
    socket.broadcast.emit('file-ownership-updated', data);
  });
  
  // Handle file ownership release
  socket.on('file-ownership-released', (data) => {
    console.log('File ownership released:', data);
    
    // Validate the data
    if (!data.fileId) {
      return;
    }
    
    // Broadcast to all other clients
    socket.broadcast.emit('file-ownership-removed', data);
  });
  
  // Handle collaborative editing events (already handled by Y.js)

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

  // Handle AI learning content requests
  socket.on('ai-learning-request', async (data) => {
    try {
      console.log('Received AI learning request via WebSocket');
      const { code, difficulty, language } = data;
      
      // Create structured prompt
      const prompt = createLearningPrompt(code, difficulty, language);
      
      console.log('Sending WebSocket learning request to Groq API');
      const completion = await groq.chat.completions.create({
        model: "llama3-70b-8192",
        messages: [
          { role: "user", content: prompt }
        ],
        temperature: 0.2,  // Lower for more consistent educational content
        max_tokens: 4000,
      });

      // Parse the response
      try {
        const responseText = completion.choices[0].message.content;
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
          throw new Error('Could not extract JSON from response');
        }
        
        const jsonContent = JSON.parse(jsonMatch[0]);
        console.log('Sending AI learning content via WebSocket');
        socket.emit('ai-learning-response', jsonContent);
      } catch (parseError) {
        console.error('Failed to parse learning content:', parseError);
        socket.emit('ai-learning-error', {
          message: 'Failed to parse learning content',
          error: parseError.message,
          rawResponse: completion.choices[0].message.content
        });
      }
    } catch (error) {
      console.error('AI learning request error:', error);
      socket.emit('ai-learning-error', { 
        message: 'Failed to process AI learning request',
        error: error.message 
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected');
    
    // Clean up and notify others
    activeRooms.forEach(roomId => {
      socket.to(roomId).emit('user-left-room', {
        roomId,
        timestamp: new Date().toISOString()
      });
      
      // Update room status
      const roomSize = io.sockets.adapter.rooms.get(roomId)?.size || 0;
      io.to(roomId).emit('room-status', {
        room: roomId,
        users: roomSize
      });
    });
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