import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import Editor from './components/Editor';
import FileTree from './components/FileTree';
import ChatSidebar from './components/ChatSidebar';
import Preview from './components/Preview';
import { useStore } from './store/useStore';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const AppContainer = styled.div`
  display: flex;
  height: 100vh;
  width: 100vw;
`;

const MainContent = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

const EditorContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
`;

const PreviewToggle = styled.button`
  position: absolute;
  top: 5px;
  right: 5px;
  z-index: 10;
  background: #333;
  border: none;
  border-radius: 4px;
  color: #fff;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.7;
  
  &:hover {
    opacity: 1;
    background: #444;
  }
`;

const App = () => {
  const { files, addFolder, addFile } = useStore();
  const [previewVisible, setPreviewVisible] = useState(false);
  
  // Initialize with some sample files and folders
  useEffect(() => {
    if (files.length === 0) {
      console.log('Initializing sample files and folders');
      
      // Clear any existing files to prevent potential issues
      useStore.getState().setFiles([]);
      
      // Create root folders
      const srcFolder = addFolder('src');
      
      // Wait for the state to update before adding nested folders
      setTimeout(() => {
        const componentsFolder = addFolder('components', srcFolder.id);
        const utilsFolder = addFolder('utils', srcFolder.id);
        
        // Create some sample files
        addFile({
          name: 'index.js',
          content: `import React from 'react';\nimport ReactDOM from 'react-dom';\nimport App from './App';\n\nReactDOM.render(<App />, document.getElementById('root'));\n`,
          type: 'file'
        }, srcFolder.id);
        
        addFile({
          name: 'App.jsx',
          content: `import React from 'react';\n\nfunction App() {\n  return (\n    <div className="App">\n      <header className="App-header">\n        <h1>Welcome to LiveCode</h1>\n        <p>Start editing to see some magic happen!</p>\n      </header>\n    </div>\n  );\n}\n\nexport default App;\n`,
          type: 'file'
        }, srcFolder.id);
        
        addFile({
          name: 'Button.jsx',
          content: `import React from 'react';\n\nconst Button = ({ children, onClick, variant = 'primary' }) => {\n  return (\n    <button\n      className={\`btn btn-\${variant}\`}\n      onClick={onClick}\n    >\n      {children}\n    </button>\n  );\n};\n\nexport default Button;\n`,
          type: 'file'
        }, componentsFolder?.id);
        
        addFile({
          name: 'Card.jsx',
          content: `import React from 'react';\n\nconst Card = ({ title, children }) => {\n  return (\n    <div className="card">\n      {title && <div className="card-header">{title}</div>}\n      <div className="card-body">{children}</div>\n    </div>\n  );\n};\n\nexport default Card;\n`,
          type: 'file'
        }, componentsFolder?.id);
        
        addFile({
          name: 'helpers.js',
          content: `// Helper functions\n\nexport const formatDate = (date) => {\n  return new Date(date).toLocaleDateString();\n};\n\nexport const truncateText = (text, maxLength = 100) => {\n  if (text.length <= maxLength) return text;\n  return text.slice(0, maxLength) + '...';\n};\n`,
          type: 'file'
        }, utilsFolder?.id);
        
        // Add a sample HTML file for preview
        addFile({
          name: 'index.html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LiveCode Preview</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      background-color: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      border-bottom: 2px solid #007acc;
      padding-bottom: 10px;
    }
    .highlight {
      background-color: #007acc;
      color: white;
      padding: 2px 5px;
      border-radius: 4px;
    }
    button {
      background-color: #007acc;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s;
    }
    button:hover {
      background-color: #005ca3;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome to LiveCode</h1>
    <p>This is a <span class="highlight">live preview</span> of your HTML file.</p>
    <p>Edit this file to see changes in real-time.</p>
    
    <div id="demo">
      <h2>Real-time Preview Demo</h2>
      <p>Current time: <span id="time"></span></p>
      <button id="changeColor">Change Background</button>
    </div>
  </div>

  <script>
    // Simple interactive script
    document.getElementById('time').textContent = new Date().toLocaleTimeString();
    
    setInterval(() => {
      document.getElementById('time').textContent = new Date().toLocaleTimeString();
    }, 1000);
    
    document.getElementById('changeColor').addEventListener('click', () => {
      const colors = ['#f8f9fa', '#e9ecef', '#dee2e6', '#ced4da', '#adb5bd'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      document.querySelector('.container').style.backgroundColor = randomColor;
    });
  </script>
</body>
</html>`,
          type: 'file'
        });
        
        // Create a README in the root
        addFile({
          name: 'README.md',
          content: `# LiveCode Project

A real-time collaborative code editor with the following features:

- Real-time collaboration
- Code intelligence
- File system navigation
- AI-powered suggestions
- Live preview for HTML/JS/CSS

## Getting Started

1. Create new files in the explorer
2. Edit code with syntax highlighting
3. Collaborate with others in real-time
4. Toggle the preview window for HTML files
5. Ask the AI assistant for help

## Keyboard Shortcuts

- Ctrl+S: Save file
- Ctrl+Z: Undo
- Ctrl+Shift+Z: Redo
`,
          type: 'file'
        });
      }, 200);
    }
  }, [files.length, addFolder, addFile]);

  const togglePreview = () => {
    setPreviewVisible(!previewVisible);
  };

  return (
    <AppContainer>
      <FileTree />
      <MainContent>
        <EditorContainer>
          <PreviewToggle onClick={togglePreview} title={previewVisible ? "Hide Preview" : "Show Preview"}>
            {previewVisible ? <FaEyeSlash /> : <FaEye />}
          </PreviewToggle>
          <Editor />
        </EditorContainer>
        <Preview visible={previewVisible} />
        <ChatSidebar />
      </MainContent>
    </AppContainer>
  );
};

export default App; 