# LiveCodeAI

A real-time collaborative code editor with intelligent AI assistance.

## Features

- Real-time collaborative editing using Y.js and WebSockets
- AI-powered code assistance using GPT-4
- File management system
- Live user presence and cursor tracking
- AI chat sidebar for code-related queries
- Monaco Editor integration (same as VS Code)

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/LiveCodeAI.git
cd LiveCodeAI
```

2. Install dependencies:
```bash
npm run install-all
```

3. Create a `.env` file in the root directory:
```
OPENAI_API_KEY=your_openai_api_key
PORT=5000
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Project Structure

```
/LiveCodeAI
├── /client                 # React frontend
│   ├── /src
│   │   ├── /components    # React components
│   │   ├── /store        # Zustand state management
│   │   └── App.jsx       # Main application component
│   └── package.json
├── /server                # Express backend
│   ├── index.js          # Server entry point
│   └── package.json
└── README.md
```

## AI Features

1. **Inline Suggestions**
   - Trigger with `// ai:` or Cmd+J
   - Select code and choose "Refactor with AI"

2. **AI Chat**
   - Ask questions about code
   - Request optimizations
   - Get explanations

3. **Natural Language to Code**
   - Describe what you want to create
   - AI generates the code

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 