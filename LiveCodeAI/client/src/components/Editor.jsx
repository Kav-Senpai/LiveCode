import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import styled from 'styled-components';
import { useStore } from '../store/useStore';
import { MonacoBinding } from '../utils/y-monaco';
import { FaCode, FaSave, FaUndo, FaRedo, FaUsers, FaShare, FaLightbulb, FaRobot } from 'react-icons/fa';
import { generateId, getWebSocketUrl } from '../utils/helpers';

const EditorContainer = styled.div`
  flex: 1;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
`;

const EditorHeader = styled.div`
  display: flex;
  background: #1e1e1e;
  border-bottom: 1px solid #333;
  padding: 0.25rem 0.5rem;
  align-items: center;
`;

const FileTabs = styled.div`
  display: flex;
  overflow-x: auto;
  
  &::-webkit-scrollbar {
    height: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #555;
  }
`;

const FileTab = styled.div`
  padding: 0.5rem 1rem;
  background: ${props => props.isActive ? '#1e1e1e' : '#252526'};
  border-right: 1px solid #333;
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  position: relative;
  
  &:hover {
    background: #2d2d2d;
    
    .close {
      opacity: 1;
    }
  }
  
  .icon {
    margin-right: 0.5rem;
    color: ${props => {
      if (props.fileName?.endsWith('.js')) return '#e8d44d';
      if (props.fileName?.endsWith('.css')) return '#563d7c';
      if (props.fileName?.endsWith('.html')) return '#e44d26';
      return '#ccc';
    }};
  }
  
  .close {
    margin-left: 0.5rem;
    opacity: 0.5;
    transition: opacity 0.2s;
    
    &:hover {
      opacity: 1;
      color: #fff;
    }
  }
`;

const EditorToolbar = styled.div`
  display: flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  background: #252526;
  border-bottom: 1px solid #333;
  justify-content: space-between;
`;

const ToolbarGroup = styled.div`
  display: flex;
  align-items: center;
`;

const ToolbarButton = styled.button`
  background: transparent;
  border: none;
  color: #ccc;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  margin-right: 0.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  
  &:hover {
    background: #2d2d2d;
    color: #fff;
  }
  
  svg {
    margin-right: 0.25rem;
  }

  ${props => props.active && `
    background: #0e639c;
    color: white;
    &:hover {
      background: #1177bb;
    }
  `}
`;

const CollaboratorsDisplay = styled.div`
  display: flex;
  align-items: center;
  margin-right: 0.5rem;
`;

const UserAvatar = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: ${props => props.color || '#007acc'};
  color: white;
  font-weight: bold;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -8px;
  border: 2px solid #252526;
  
  &:first-child {
    margin-left: 0;
  }
`;

const SharePanel = styled.div`
  position: absolute;
  top: 100px;
  right: 20px;
  background: #252526;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 1rem;
  z-index: 1000;
  width: 300px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
`;

const ShareInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  background: #3c3c3c;
  border: 1px solid #555;
  border-radius: 4px;
  color: white;
  margin-bottom: 0.5rem;
  
  &:focus {
    outline: none;
    border-color: #007acc;
  }
`;

const ShareButton = styled.button`
  background: #007acc;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  margin-right: 0.5rem;
  
  &:hover {
    background: #006bb3;
  }
`;

const AICommandPanel = styled.div`
  position: absolute;
  top: 100px;
  right: 20px;
  background: #252526;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 1rem;
  z-index: 1000;
  width: 350px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
`;

const AICommandButton = styled.button`
  background: #3c3c3c;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  width: 100%;
  text-align: left;
  margin-bottom: 0.5rem;
  cursor: pointer;
  
  &:hover {
    background: #4c4c4c;
  }
  
  svg {
    margin-right: 0.5rem;
    flex-shrink: 0;
    color: #007acc;
  }
  
  .description {
    font-size: 0.8rem;
    color: #aaa;
    margin-top: 0.25rem;
  }
`;

const EditorContent = styled.div`
  flex: 1;
  position: relative;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
  text-align: center;
  padding: 2rem;
  
  h2 {
    margin-bottom: 1rem;
    font-weight: normal;
  }
  
  .actions {
    margin-top: 2rem;
    display: flex;
    gap: 1rem;
    
    button {
      background: #0e639c;
      border: none;
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      
      &:hover {
        background: #1177bb;
      }
    }
  }
`;

const StatusBar = styled.div`
  background: #007acc;
  color: white;
  padding: 0.25rem 0.5rem;
  font-size: 12px;
  display: flex;
  justify-content: space-between;
`;

const LiveIndicator = styled.div`
  display: flex;
  align-items: center;
  margin-left: auto;
  padding: 0 10px;
  
  .dot {
    width: 8px;
    height: 8px;
    background-color: #3c9;
    border-radius: 50%;
    margin-right: 6px;
    animation: pulse 2s infinite;
  }
  
  .text {
    font-size: 12px;
    color: #ccc;
  }
  
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.4; }
    100% { opacity: 1; }
  }
`;

const TypingIndicator = styled.div`
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  z-index: 100;
  pointer-events: none;
  transition: opacity 0.3s;
  opacity: ${props => props.visible ? 1 : 0};
`;

// User colors for cursor and selections
const USER_COLORS = [
  '#007acc', // blue
  '#0e9a34', // green
  '#d83131', // red
  '#9e6a03', // orange
  '#6f42c1', // purple
  '#17a2b8', // teal
];

// Generate a random name for this user
const generateUserName = () => {
  const names = ['Alex', 'Blake', 'Casey', 'Dana', 'Ellis', 'Francis', 'Glen', 'Harper'];
  return names[Math.floor(Math.random() * names.length)];
};

const getLanguageForFile = (fileName) => {
  if (!fileName) return 'javascript';
  
  const extension = fileName.split('.').pop().toLowerCase();
  const languageMap = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    html: 'html',
    css: 'css',
    json: 'json',
    md: 'markdown',
  };
  
  return languageMap[extension] || 'javascript';
};

const EditorComponent = () => {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const [yDoc] = useState(new Y.Doc());
  const [yText] = useState(yDoc.getText('monaco'));
  const [wsProvider, setWsProvider] = useState(null);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [collaborators, setCollaborators] = useState([]);
  const [userId] = useState(generateId(6));
  const [userName] = useState(generateUserName());
  const [userColor] = useState(USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]);
  const [inviteLink, setInviteLink] = useState('');
  const [editorReady, setEditorReady] = useState(false);
  
  const { 
    files, 
    currentFile, 
    setCurrentFile, 
    addFile,
    updateFile,
    recentFiles,
    requestAIHelp
  } = useStore();
  
  const [openFiles, setOpenFiles] = useState([]);
  const [editorMounted, setEditorMounted] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [typingUsers, setTypingUsers] = useState([]);
  const [lastTypingEvent, setLastTypingEvent] = useState(null);
  const typingTimeoutRef = useRef(null);
  
  // Initialize WebSocket provider
  useEffect(() => {
    try {
      // Create a WebSocket provider
      const roomId = currentFile?.id || 'default-room';
      const provider = new WebsocketProvider(
        getWebSocketUrl(),
        `monaco-${roomId}`,
        yDoc
      );

      provider.on('status', (event) => {
        console.log('WebSocket status:', event.status);
      });
      
      // Set user data for awareness
      provider.awareness.setLocalState({
        userId,
        name: userName,
        color: userColor,
        cursor: { line: 1, column: 1 },
        isTyping: false
      });
      
      // Listen for awareness updates
      provider.awareness.on('update', () => {
        try {
          const states = {};
          const typing = [];
          
          provider.awareness.getStates().forEach((state, clientId) => {
            if (state.userId && state.userId !== userId) {
              states[state.userId] = state;
              
              // Track typing users
              if (state.isTyping) {
                typing.push(state.name);
              }
            }
          });
          
          const activeUsers = Object.values(states);
          setCollaborators(activeUsers);
          setTypingUsers(typing);
        } catch (err) {
          console.error('Error handling awareness update:', err);
        }
      });

      setWsProvider(provider);
      
      // Generate an invite link
      try {
        const protocol = window.location.protocol;
        const host = window.location.host;
        const currentPath = window.location.pathname;
        const inviteUrl = `${protocol}//${host}${currentPath}?room=${roomId}&file=${currentFile?.id || ''}`;
        setInviteLink(inviteUrl);
      } catch (err) {
        console.error('Error generating invite link:', err);
        setInviteLink('');
      }

      return () => {
        try {
          provider.destroy();
        } catch (err) {
          console.error('Error destroying provider:', err);
        }
      };
    } catch (err) {
      console.error('Error initializing WebSocket provider:', err);
    }
  }, [yDoc, currentFile?.id, userId, userName, userColor]);
  
  // Track open files
  useEffect(() => {
    if (currentFile && !openFiles.some(f => f.id === currentFile.id)) {
      setOpenFiles([...openFiles, currentFile]);
    }
  }, [currentFile]);
  
  // Update content when currentFile changes
  useEffect(() => {
    if (editorMounted && currentFile && editorRef.current) {
      // Update editor content with current file
      const model = editorRef.current.getModel();
      if (model) {
        // Only set value if it's different to avoid cursor jumping
        if (model.getValue() !== currentFile.content) {
          model.setValue(currentFile.content || '');
        }
      }
    }
  }, [currentFile, editorMounted]);
  
  // Check URL params for room and file IDs
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room');
    const fileId = params.get('file');
    
    if (roomId && fileId && files.length > 0) {
      console.log('Detected collaboration link with room:', roomId, 'and file:', fileId);
      
      // Try to find the file by ID
      const fileToOpen = files.find(f => f.id === fileId || f.id.toString() === fileId);
      
      if (fileToOpen) {
        console.log('Opening shared file:', fileToOpen.name);
        setCurrentFile(fileToOpen);
      } else {
        console.warn('Could not find file with ID:', fileId);
        
        // If we couldn't find the file, at least set the room ID to ensure collaboration works
        if (currentFile) {
          // Force recreate the WebSocket provider with the correct room ID
          if (wsProvider) {
            wsProvider.destroy();
          }
          
          // Create a new provider with the specified room ID
          const provider = new WebsocketProvider(
            getWebSocketUrl(),
            `monaco-${roomId}`,
            yDoc
          );
          
          provider.on('status', (event) => {
            console.log('WebSocket status:', event.status);
          });
          
          setWsProvider(provider);
        }
      }
    }
  }, [files, yDoc]);
  
  // Update typing status
  useEffect(() => {
    if (!wsProvider || !lastTypingEvent) return;
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set typing status to true
    const awareness = wsProvider.awareness;
    const currentState = awareness.getLocalState();
    
    if (currentState) {
      awareness.setLocalState({
        ...currentState,
        isTyping: true
      });
    }
    
    // After 1.5 seconds of no typing, set to false
    typingTimeoutRef.current = setTimeout(() => {
      const state = awareness.getLocalState();
      if (state) {
        awareness.setLocalState({
          ...state,
          isTyping: false
        });
      }
    }, 1500);
    
  }, [lastTypingEvent, wsProvider]);
  
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setEditorMounted(true);
    setEditorReady(true);
    
    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
      const position = {
        line: e.position.lineNumber,
        column: e.position.column
      };
      
      setCursorPosition(position);
      
      // Update awareness with cursor position
      if (wsProvider) {
        const awareness = wsProvider.awareness;
        const currentState = awareness.getLocalState();
        if (currentState) {
          awareness.setLocalState({
            ...currentState,
            cursor: position
          });
        }
      }
    });
    
    // Track typing events
    editor.onKeyUp(() => {
      setLastTypingEvent(Date.now());
    });
    
    // Add keyboard shortcut for save
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });
    
    // Add keyboard shortcut for AI suggestions
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () => {
      toggleAIPanel();
    });
    
    // Set up Y.js binding when WebSocket provider is ready
    if (wsProvider) {
      // Bind Y.js to Monaco
      const binding = new MonacoBinding(
        yText,
        editorRef.current.getModel(),
        new Set([editorRef.current]),
        wsProvider.awareness
      );
      
      // Decorate remote cursors/selections
      decorateRemoteCursors(monaco, editor, wsProvider.awareness);
    }
    
    // Set up AI code completion provider
    setupAICompletionProvider(monaco);
  };
  
  const decorateRemoteCursors = (monaco, editor, awareness) => {
    try {
      // Track decorations for each user
      const decorations = {};
      
      // Update decorations when awareness changes
      awareness.on('update', () => {
        try {
          const model = editor.getModel();
          if (!model) return;
          
          // Clear existing decorations
          Object.values(decorations).forEach(ids => {
            try {
              editor.deltaDecorations(ids, []);
            } catch (err) {
              console.error('Error clearing decorations:', err);
            }
          });
          
          // Create decorations for each remote user
          awareness.getStates().forEach((state, clientId) => {
            try {
              if (state.userId && state.userId !== userId && state.cursor) {
                const { cursor, color, name } = state;
                
                // Convert cursor position to Monaco position
                const position = {
                  lineNumber: cursor.line,
                  column: cursor.column
                };
                
                // Create cursor decoration
                const cursorDeco = {
                  range: new monaco.Range(
                    position.lineNumber,
                    position.column,
                    position.lineNumber,
                    position.column
                  ),
                  options: {
                    className: `remote-cursor-${clientId}`,
                    hoverMessage: { value: name },
                    zIndex: 2000,
                    beforeContentClassName: 'remote-cursor-content',
                    // Inline CSS for the cursor
                    before: {
                      content: '',
                      inlineClassName: `remote-cursor-${clientId}-before`
                    }
                  }
                };
                
                // Add cursor decoration
                decorations[clientId] = editor.deltaDecorations(
                  decorations[clientId] || [],
                  [cursorDeco]
                );
                
                // Add CSS for the cursor
                const styleId = `remote-cursor-style-${clientId}`;
                let styleElement = document.getElementById(styleId);
                
                if (!styleElement) {
                  styleElement = document.createElement('style');
                  styleElement.id = styleId;
                  document.head.appendChild(styleElement);
                }
                
                styleElement.innerHTML = `
                  .remote-cursor-${clientId}-before {
                    position: absolute;
                    border-left: 2px solid ${color};
                    height: 18px;
                    width: 0;
                  }
                  .remote-cursor-content::after {
                    content: "${name}";
                    position: absolute;
                    top: -24px;
                    left: 0;
                    padding: 2px 8px;
                    border-radius: 10px;
                    background-color: ${color};
                    color: white;
                    font-size: 12px;
                    font-weight: bold;
                    white-space: nowrap;
                    pointer-events: none;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                    animation: pulse-${clientId} 2s infinite;
                  }
                  
                  @keyframes pulse-${clientId} {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                  }
                `;
                
                // Also add a floating avatar near the cursor
                const avatarId = `remote-avatar-${clientId}`;
                let avatarEl = document.getElementById(avatarId);
                
                if (!avatarEl) {
                  avatarEl = document.createElement('div');
                  avatarEl.id = avatarId;
                  avatarEl.className = 'remote-user-avatar';
                  document.body.appendChild(avatarEl);
                }
                
                // Position the avatar near the cursor
                const editorPosition = editor.getScrolledVisiblePosition(position);
                if (editorPosition) {
                  const editorContainer = editor.getDomNode().parentElement;
                  if (editorContainer) {
                    const rect = editorContainer.getBoundingClientRect();
                    
                    avatarEl.style.cssText = `
                      position: absolute;
                      top: ${rect.top + editorPosition.top - 10}px;
                      left: ${rect.left + editorPosition.left + 20}px;
                      width: 28px;
                      height: 28px;
                      border-radius: 50%;
                      background-color: ${color};
                      color: white;
                      font-size: 14px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                      z-index: 3000;
                      transition: all 0.3s ease;
                      border: 2px solid white;
                    `;
                    
                    avatarEl.textContent = name.charAt(0).toUpperCase();
                  }
                }
              }
            } catch (err) {
              console.error('Error creating cursor for user:', err);
            }
          });
        } catch (err) {
          console.error('Error in awareness update handler:', err);
        }
      });
      
      // Add CSS for all remote cursors
      const globalStyleId = 'remote-cursors-global-style';
      let globalStyleEl = document.getElementById(globalStyleId);
      
      if (!globalStyleEl) {
        globalStyleEl = document.createElement('style');
        globalStyleEl.id = globalStyleId;
        document.head.appendChild(globalStyleEl);
        
        globalStyleEl.innerHTML = `
          .remote-user-avatar {
            position: absolute;
            transition: all 0.3s ease;
            animation: bob 3s infinite;
          }
          
          @keyframes bob {
            0% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
            100% { transform: translateY(0); }
          }
        `;
      }
    } catch (err) {
      console.error('Error setting up remote cursors:', err);
    }
  };
  
  const setupAICompletionProvider = (monaco) => {
    // Register a completion item provider for JavaScript/TypeScript
    monaco.languages.registerCompletionItemProvider('javascript', {
      triggerCharacters: ['.', ' '],
      provideCompletionItems: async (model, position) => {
        // Get current line text before cursor position
        const textUntilPosition = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });
        
        // Only provide suggestions if line has some content
        if (!textUntilPosition.trim()) {
          return { suggestions: [] };
        }
        
        // Get surrounding context (few lines before and after)
        const startLine = Math.max(1, position.lineNumber - 5);
        const endLine = Math.min(model.getLineCount(), position.lineNumber + 5);
        
        const context = model.getValueInRange({
          startLineNumber: startLine,
          startColumn: 1,
          endLineNumber: endLine,
          endColumn: model.getLineMaxColumn(endLine),
        });
        
        try {
          // For now, use a simple suggestion system
          // In a real implementation, you would call the AI API here
          const suggestions = getSimpleCompletions(textUntilPosition, context);
          
          return {
            suggestions: suggestions.map((s, i) => ({
              label: s.text,
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: s.text,
              detail: 'AI suggestion',
              sortText: `0${i}`,
            })),
          };
        } catch (error) {
          console.error('Error fetching AI completions:', error);
          return { suggestions: [] };
        }
      },
    });
  };
  
  // Simple completion function - would be replaced with actual AI calls
  const getSimpleCompletions = (text, context) => {
    // This is a placeholder - would connect to your AI in a real implementation
    const commonCompletions = [
      { text: 'function() {\n  \n}' },
      { text: 'const result = ' },
      { text: 'console.log()' },
      { text: 'return ' },
      { text: 'if () {\n  \n}' },
      { text: 'for (let i = 0; i < array.length; i++) {\n  \n}' },
    ];
    
    return commonCompletions;
  };

  const handleEditorChange = (value) => {
    if (currentFile) {
      updateFile(currentFile.id, { content: value });
    }
  };
  
  const handleCloseFile = (fileId, e) => {
    e.stopPropagation();
    setOpenFiles(openFiles.filter(f => f.id !== fileId));
    
    // If we're closing the current file, select another open file
    if (currentFile && currentFile.id === fileId) {
      const nextFile = openFiles.filter(f => f.id !== fileId)[0];
      if (nextFile) {
        setCurrentFile(nextFile);
      } else {
        setCurrentFile(null);
      }
    }
  };
  
  const handleSave = () => {
    // In a real app, you'd save to backend here
    if (currentFile) {
      // Just update the timestamp for now
      updateFile(currentFile.id, { 
        updatedAt: new Date().toISOString() 
      });
      
      // Flash the status bar (in a real app you'd show a proper notification)
      const statusBar = document.getElementById('status-bar');
      if (statusBar) {
        statusBar.style.background = '#3c9';
        setTimeout(() => {
          statusBar.style.background = '#007acc';
        }, 500);
      }
    }
  };
  
  const handleNewFile = () => {
    const newFile = {
      name: 'untitled.js',
      content: '// New file\n',
      type: 'file'
    };
    const createdFile = addFile(newFile);
    setCurrentFile(createdFile);
  };
  
  const toggleSharePanel = () => {
    setShowSharePanel(!showSharePanel);
    setShowAIPanel(false);
  };
  
  const toggleAIPanel = () => {
    setShowAIPanel(!showAIPanel);
    setShowSharePanel(false);
  };
  
  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    // Show success message
    alert('Invite link copied to clipboard!');
  };
  
  const handleExplainCode = async () => {
    // Get selected code
    if (!editorRef.current) return;
    
    const selection = editorRef.current.getSelection();
    const model = editorRef.current.getModel();
    
    if (selection && model) {
      const selectedText = model.getValueInRange(selection);
      
      if (selectedText) {
        try {
          // Request explanation from AI
          const response = await requestAIHelp(
            selectedText,
            'Explain what this code does in detail',
            currentFile?.name || 'code'
          );
          
          // Reset panels
          setShowAIPanel(false);
        } catch (error) {
          console.error('Failed to get code explanation:', error);
        }
      }
    }
  };
  
  const handleGenerateFromPrompt = async () => {
    // Prompt the user for what they want to generate
    const prompt = window.prompt('What would you like to generate?');
    
    if (prompt) {
      try {
        // Request code generation from AI
        const response = await requestAIHelp(
          '',
          prompt,
          `Generating code for: ${prompt}. Current file: ${currentFile?.name || 'untitled'}`
        );
        
        // Reset panels
        setShowAIPanel(false);
      } catch (error) {
        console.error('Failed to generate code:', error);
      }
    }
  };
  
  // Render empty state when no file is open
  if (!currentFile) {
    return (
      <EditorContainer>
        <EmptyState>
          <FaCode size={48} />
          <h2>No file is open</h2>
          <p>Select a file from the explorer or create a new file to start coding.</p>
          <div className="actions">
            <button onClick={handleNewFile}>New File</button>
            {recentFiles.length > 0 && (
              <button onClick={() => setCurrentFile(recentFiles[0])}>
                Open Recent
              </button>
            )}
          </div>
        </EmptyState>
      </EditorContainer>
    );
  }

  return (
    <EditorContainer>
      <EditorHeader>
        <FileTabs>
          {openFiles.map(file => (
            <FileTab 
              key={file.id}
              isActive={currentFile?.id === file.id}
              fileName={file.name}
              onClick={() => setCurrentFile(file)}
            >
              <span className="icon">●</span>
              {file.name}
              <span 
                className="close"
                onClick={(e) => handleCloseFile(file.id, e)}
              >
                ×
              </span>
            </FileTab>
          ))}
        </FileTabs>
        
        <LiveIndicator>
          <div className="dot"></div>
          <div className="text">Live</div>
        </LiveIndicator>
      </EditorHeader>
      
      <EditorToolbar>
        <ToolbarGroup>
          <ToolbarButton onClick={handleSave} title="Save file (Ctrl+S)">
            <FaSave size={14} /> Save
          </ToolbarButton>
          <ToolbarButton onClick={() => editorRef.current?.trigger('undo', 'undo')} title="Undo (Ctrl+Z)">
            <FaUndo size={14} /> Undo
          </ToolbarButton>
          <ToolbarButton onClick={() => editorRef.current?.trigger('redo', 'redo')} title="Redo (Ctrl+Y)">
            <FaRedo size={14} /> Redo
          </ToolbarButton>
          <ToolbarButton 
            onClick={toggleAIPanel} 
            active={showAIPanel} 
            title="AI Tools (Ctrl+I)"
          >
            <FaRobot size={14} /> AI Tools
          </ToolbarButton>
        </ToolbarGroup>
        
        <ToolbarGroup>
          <CollaboratorsDisplay>
            <UserAvatar color={userColor} title={`You (${userName})`}>
              {userName.charAt(0)}
            </UserAvatar>
            {collaborators.map(user => (
              <UserAvatar 
                key={user.userId} 
                color={user.color} 
                title={user.name}
              >
                {user.name.charAt(0)}
              </UserAvatar>
            ))}
          </CollaboratorsDisplay>
          
          <ToolbarButton 
            onClick={toggleSharePanel} 
            active={showSharePanel}
            title="Share and invite collaborators"
          >
            <FaShare size={14} /> Share
          </ToolbarButton>
        </ToolbarGroup>
      </EditorToolbar>
      
      {showSharePanel && (
        <SharePanel>
          <h3>Invite collaborators</h3>
          <p>Share this link with others to collaborate in real-time:</p>
          <ShareInput value={inviteLink} readOnly />
          <ShareButton onClick={copyInviteLink}>Copy Link</ShareButton>
          <ShareButton onClick={toggleSharePanel}>Close</ShareButton>
        </SharePanel>
      )}
      
      {showAIPanel && (
        <AICommandPanel>
          <h3>AI Tools</h3>
          <AICommandButton onClick={handleExplainCode}>
            <FaLightbulb size={16} />
            <div>
              <div>Explain Selected Code</div>
              <div className="description">Get an explanation of what the selected code does</div>
            </div>
          </AICommandButton>
          
          <AICommandButton onClick={handleGenerateFromPrompt}>
            <FaRobot size={16} />
            <div>
              <div>Generate from Prompt</div>
              <div className="description">Create code from a natural language description</div>
            </div>
          </AICommandButton>
          
          <ShareButton onClick={toggleAIPanel}>Close</ShareButton>
        </AICommandPanel>
      )}
      
      <EditorContent>
        <Editor
          height="100%"
          defaultLanguage="javascript"
          language={getLanguageForFile(currentFile?.name)}
          value={currentFile?.content || ''}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            wordWrap: 'on',
            automaticLayout: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            multiCursorModifier: 'alt',
            renderWhitespace: 'selection',
            scrollBeyondLastLine: false,
            renderLineHighlight: 'all',
            bracketPairColorization: {
              enabled: true
            },
            formatOnPaste: true,
            tabSize: 2,
            autoIndent: 'full',
            snippetSuggestions: 'on',
            contextmenu: true,
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
          }}
        />
        
        <TypingIndicator visible={typingUsers.length > 0}>
          {typingUsers.length === 1 ? 
            `${typingUsers[0]} is typing...` : 
            `${typingUsers.length} people are typing...`}
        </TypingIndicator>
      </EditorContent>
      
      <StatusBar id="status-bar">
        <div>
          {getLanguageForFile(currentFile?.name).toUpperCase()} | {collaborators.length + 1} user{collaborators.length ? 's' : ''}
        </div>
        <div>
          Ln {cursorPosition.line}, Col {cursorPosition.column}
        </div>
      </StatusBar>
    </EditorContainer>
  );
};

export default EditorComponent; 