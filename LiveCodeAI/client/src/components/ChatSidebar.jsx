import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useStore } from '../store/useStore';
import { 
  FaRobot, 
  FaCode, 
  FaUser, 
  FaPlay, 
  FaSpinner, 
  FaCheckCircle, 
  FaTimesCircle,
  FaClipboard,
  FaSearch,
  FaCog,
  FaLaptopCode,
  FaMagic,
  FaPencilAlt,
  FaBookOpen,
  FaFileCode
} from 'react-icons/fa';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-python';

const SidebarContainer = styled.div`
  width: 350px;
  height: 100%;
  background: #1e1e1e;
  border-left: 1px solid #333;
  display: flex;
  flex-direction: column;
`;

const ChatHeader = styled.div`
  padding: 1rem;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ChatTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SettingsButton = styled.button`
  background: transparent;
  border: none;
  color: #888;
  cursor: pointer;
  
  &:hover {
    color: #ccc;
  }
`;

const GenerateFilesButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: #2d2d2d;
  border: none;
  border-radius: 4px;
  color: #ccc;
  font-size: 12px;
  padding: 4px 8px;
  cursor: pointer;
  
  &:hover {
    background: #3d3d3d;
    color: #fff;
  }
`;

const ChatMessages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: #2d2d2d;
  }
`;

const Message = styled.div`
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: ${props => props.isAI ? '#2d2d2d' : 'rgba(0, 122, 204, 0.15)'};
  border-radius: 8px;
  border-left: 3px solid ${props => props.isAI ? '#888' : '#007acc'};
  overflow-x: auto;
  
  pre {
    margin: 0.5rem 0;
    padding: 0.75rem;
    border-radius: 4px;
    background: #252525 !important;
    overflow-x: auto;
  }
  
  code {
    font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
    font-size: 13px;
  }
`;

const MessageHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
  
  svg {
    margin-right: 0.5rem;
  }
  
  span {
    font-weight: 500;
    color: ${props => props.isAI ? '#ccc' : '#fff'};
  }
`;

const CodeActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  justify-content: flex-end;
`;

const ActionButton = styled.button`
  background: #3a3a3a;
  border: none;
  border-radius: 4px;
  color: #ccc;
  padding: 0.25rem 0.5rem;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  
  &:hover {
    background: #4a4a4a;
    color: #fff;
  }
  
  &:disabled {
    background: #333;
    color: #666;
    cursor: not-allowed;
  }
`;

const InputContainer = styled.div`
  padding: 1rem;
  border-top: 1px solid #333;
`;

const InputForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Input = styled.textarea`
  width: 100%;
  min-height: 60px;
  max-height: 150px;
  padding: 0.5rem;
  background: #2d2d2d;
  border: 1px solid #333;
  border-radius: 4px;
  color: white;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: #007acc;
  }
`;

const InputActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SendButton = styled.button`
  background: #007acc;
  border: none;
  border-radius: 4px;
  color: white;
  padding: 0.5rem 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    background: #0069b3;
  }
  
  &:disabled {
    background: #004977;
    cursor: not-allowed;
  }
`;

const ContextStatus = styled.div`
  font-size: 12px;
  color: #888;
`;

const StatusIndicator = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.isActive ? '#3c9' : '#999'};
  margin-right: 0.25rem;
`;

// Function to extract code blocks from a message
const extractCodeBlocks = (text) => {
  const codeBlockRegex = /```([a-zA-Z]*)\n([\s\S]*?)```/g;
  const blocks = [];
  let lastIndex = 0;
  let match;
  
  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({
        type: 'text',
        content: text.slice(lastIndex, match.index)
      });
    }
    
    blocks.push({
      type: 'code',
      language: match[1] || 'javascript',
      content: match[2]
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < text.length) {
    blocks.push({
      type: 'text',
      content: text.slice(lastIndex)
    });
  }
  
  return blocks;
};

const PairProgrammingContainer = styled.div`
  margin-top: 1rem;
  padding: 0.75rem;
  background: #2d2d2d;
  border-radius: 8px;
  border-left: 3px solid #007acc;
`;

const PairProgrammingHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const PairProgrammingTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: #fff;
`;

const PairProgrammingToggle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
  margin-left: 0.5rem;
  
  input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  span {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #555;
    transition: .4s;
    border-radius: 20px;
    
    &:before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 2px;
      bottom: 2px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }
  }
  
  input:checked + span {
    background-color: #007acc;
  }
  
  input:checked + span:before {
    transform: translateX(20px);
  }
`;

const ModeSelector = styled.div`
  display: flex;
  margin-top: 0.5rem;
  background: #222;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #444;
`;

const ModeButton = styled.button`
  flex: 1;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: ${props => props.active ? '#007acc' : 'transparent'};
  color: ${props => props.active ? '#fff' : '#ccc'};
  border: none;
  cursor: pointer;
  gap: 0.25rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.active ? '#007acc' : '#333'};
  }
  
  svg {
    font-size: 1rem;
  }
  
  span {
    font-size: 0.75rem;
  }
`;

const ChatSidebar = () => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gatheringContext, setGatheringContext] = useState(false);
  const messagesEndRef = useRef(null);
  const { 
    aiResponses, 
    requestAIHelp, 
    currentFile, 
    updateFile, 
    files,
    addFile,
    pairProgramming,
    enablePairProgramming,
    setPairProgrammingMode
  } = useStore();
  
  // Add state for tracking if generator should be open
  const [showGenerator, setShowGenerator] = useState(false);

  // Syntax highlighting on message updates
  useEffect(() => {
    Prism.highlightAll();
  }, [aiResponses]);
  
  // Auto-scroll to the bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiResponses]);
  
  // Initialize with a welcome message
  useEffect(() => {
    if (aiResponses.length === 0) {
      aiResponses.push({
        id: Date.now(),
        sender: 'ai',
        content: "Hi, I'm your AI coding assistant! I can help you with code suggestions, refactoring, or explanations. What would you like me to help you with today?",
        timestamp: new Date().toISOString()
      });
    }
  }, []);

  // Gather workspace context
  const gatherWorkspaceContext = () => {
    setGatheringContext(true);
    
    // Get information about all files
    const fileStructure = files.map(file => {
      if (file.type === 'folder') {
        return `📁 ${file.name} (ID: ${file.id}, Parent: ${file.parentId || 'root'})`;
      } else {
        return `📄 ${file.name} (ID: ${file.id}, Parent: ${file.parentId || 'root'})`;
      }
    }).join('\n');
    
    // Get content of current file
    const currentFileContent = currentFile 
      ? `Current file: ${currentFile.name}\n\`\`\`${getLanguageFromFileName(currentFile.name)}\n${currentFile.content}\n\`\`\``
      : 'No file is currently open';
    
    const context = `
# Workspace Context
## File Structure
${fileStructure}

## Current File
${currentFileContent}
    `;
    
    setGatheringContext(false);
    return context;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    
    // Add user message to chat
    requestAIHelp(null, null, null); // This just adds the message to state
    
    // Get current workspace context
    const context = gatherWorkspaceContext();
      
    try {
      // Include pair programming info in the AI request
      await requestAIHelp(
        currentFile?.content || '',
        message,
        {
          ...context,
          pairProgramming: pairProgramming.enabled ? {
            mode: pairProgramming.mode
          } : null
        }
      );
    } catch (err) {
      console.error('Failed to get AI response:', err);
    } finally {
      setIsSubmitting(false);
      setMessage('');
    }
  };
  
  const getLanguageFromFileName = (fileName) => {
    if (!fileName) return 'javascript';
    
    const extension = fileName.split('.').pop().toLowerCase();
    const languageMap = {
      js: 'javascript',
      jsx: 'jsx',
      ts: 'typescript',
      tsx: 'tsx',
      py: 'python',
      html: 'html',
      css: 'css',
      json: 'json',
      md: 'markdown',
    };
    
    return languageMap[extension] || 'javascript';
  };
  
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
  };
  
  const handleImplementCode = async (code, messageId) => {
    if (!currentFile) {
      aiResponses.push({
        id: Date.now(),
        sender: 'ai',
        content: 'No file is open to apply code to',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    aiResponses.push({
      id: Date.now(),
      sender: 'ai',
      content: 'Implementing code...',
      timestamp: new Date().toISOString()
    });
    
    try {
      // Update the current file with the code
      await updateFile(currentFile.id, { content: code });
      
      aiResponses.push({
        id: Date.now(),
        sender: 'ai',
        content: 'Code implemented successfully!',
        timestamp: new Date().toISOString()
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        aiResponses.push({
          id: Date.now(),
          sender: 'ai',
          content: null,
          timestamp: new Date().toISOString()
        });
      }, 3000);
    } catch (error) {
      aiResponses.push({
        id: Date.now(),
        sender: 'ai',
        content: 'Failed to implement code',
        timestamp: new Date().toISOString()
      });
    }
  };
  
  const handleCreateNewFile = async (code, messageId) => {
    // Prompt for filename
    const fileName = prompt('Enter a filename for the new file:', 'newFile.js');
    if (!fileName) return;
    
    aiResponses.push({
      id: Date.now(),
      sender: 'ai',
      content: 'Creating new file...',
      timestamp: new Date().toISOString()
    });
    
    try {
      // Create a new file with the code
      const newFile = {
        name: fileName,
        content: code,
        type: 'file'
      };
      
      const createdFile = addFile(newFile);
      
      aiResponses.push({
        id: Date.now(),
        sender: 'ai',
        content: `File "${fileName}" created successfully!`,
        timestamp: new Date().toISOString()
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        aiResponses.push({
          id: Date.now(),
          sender: 'ai',
          content: null,
          timestamp: new Date().toISOString()
        });
      }, 3000);
    } catch (error) {
      aiResponses.push({
        id: Date.now(),
        sender: 'ai',
        content: 'Failed to create new file',
        timestamp: new Date().toISOString()
      });
    }
  };

  const renderMessageContent = (message) => {
    if (message.sender === 'user') {
      return <p>{message.content}</p>;
    }
    
    const blocks = extractCodeBlocks(message.content);
    
    if (blocks.length === 0) {
      return <p>{message.content}</p>;
    }
    
    return (
      <>
        {blocks.map((block, index) => {
          if (block.type === 'text') {
            return <p key={index}>{block.content}</p>;
          } else {
            return (
              <div key={index}>
                <pre>
                  <code className={`language-${block.language}`}>{block.content}</code>
                </pre>
                <CodeActions>
                  <ActionButton 
                    onClick={() => handleCopyCode(block.content)}
                    title="Copy to clipboard"
                  >
                    <FaClipboard size={12} /> Copy
                  </ActionButton>
                  
                  <ActionButton
                    onClick={() => handleImplementCode(block.content, message.id)}
                    disabled={aiResponses[message.id]?.content === 'Implementing code...'}
                    title="Implement this code in the current file"
                  >
                    {aiResponses[message.id]?.content === 'Implementing code...' ? (
                      <><FaSpinner size={12} /> Implementing...</>
                    ) : (
                      <><FaPlay size={12} /> Implement</>
                    )}
                  </ActionButton>
                  
                  <ActionButton
                    onClick={() => handleCreateNewFile(block.content, message.id)}
                    disabled={aiResponses[message.id]?.content === 'Implementing code...'}
                    title="Create a new file with this code"
                  >
                    <FaCode size={12} /> New File
                  </ActionButton>
                </CodeActions>
                
                {aiResponses[message.id]?.content && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: aiResponses[message.id].content === 'Failed to implement code' ? '#e74c3c' : '#2ecc71',
                    marginTop: '0.5rem'
                  }}>
                    {aiResponses[message.id].content === 'Code implemented successfully!' && <FaCheckCircle size={12} />}
                    {aiResponses[message.id].content === 'Failed to implement code' && <FaTimesCircle size={12} />}
                    {' ' + aiResponses[message.id].content}
                  </div>
                )}
              </div>
            );
          }
        })}
      </>
    );
  };

  // Add the pair programming toggle handlers
  const togglePairProgramming = () => {
    enablePairProgramming(!pairProgramming.enabled);
  };
  
  const setMode = (mode) => {
    setPairProgrammingMode(mode);
  };

  // Add function to handle opening the generator
  const handleOpenGenerator = () => {
    // We'll use App state to control this, so we'll need to emit a custom event
    const event = new CustomEvent('openPromptToFileGenerator');
    window.dispatchEvent(event);
  };

  return (
    <SidebarContainer>
      <ChatHeader>
        <ChatTitle>
          <FaRobot />
          <span>AI Code Assistant</span>
        </ChatTitle>
        <HeaderActions>
          <GenerateFilesButton onClick={handleOpenGenerator}>
            <FaFileCode size={12} /> Generate Files
          </GenerateFilesButton>
        <SettingsButton title="Settings">
          <FaCog size={16} />
        </SettingsButton>
        </HeaderActions>
      </ChatHeader>
      
      <ChatMessages>
        {/* Add pair programming UI at the top */}
        <PairProgrammingContainer>
          <PairProgrammingHeader>
            <PairProgrammingTitle>
              <FaLaptopCode /> Pair Programming Mode
            </PairProgrammingTitle>
            <PairProgrammingToggle>
              <span>{pairProgramming.enabled ? 'On' : 'Off'}</span>
              <ToggleSwitch>
                <input 
                  type="checkbox" 
                  checked={pairProgramming.enabled}
                  onChange={togglePairProgramming}
                />
                <span></span>
              </ToggleSwitch>
            </PairProgrammingToggle>
          </PairProgrammingHeader>
          
          {pairProgramming.enabled && (
            <ModeSelector>
              <ModeButton 
                active={pairProgramming.mode === 'suggest'} 
                onClick={() => setMode('suggest')}
              >
                <FaMagic />
                <span>Suggest</span>
              </ModeButton>
              <ModeButton 
                active={pairProgramming.mode === 'write'} 
                onClick={() => setMode('write')}
              >
                <FaPencilAlt />
                <span>Write</span>
              </ModeButton>
              <ModeButton 
                active={pairProgramming.mode === 'explain'} 
                onClick={() => setMode('explain')}
              >
                <FaBookOpen />
                <span>Explain</span>
              </ModeButton>
            </ModeSelector>
          )}
        </PairProgrammingContainer>
        
        {aiResponses.map((msg) => (
          <Message key={msg.id} isAI={msg.sender === 'ai'}>
            <MessageHeader isAI={msg.sender === 'ai'}>
              {msg.sender === 'ai' ? <FaRobot /> : <FaUser />}
              <span>{msg.sender === 'ai' ? 'AI Assistant' : 'You'}</span>
            </MessageHeader>
            {renderMessageContent(msg)}
          </Message>
        ))}
        
        {isSubmitting && (
          <Message isAI={true}>
            <MessageHeader isAI={true}>
              <FaRobot />
              <span>AI Assistant</span>
            </MessageHeader>
            <div>
              <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> Thinking...
            </div>
          </Message>
        )}
        
        <div ref={messagesEndRef} />
      </ChatMessages>
      
      <InputContainer>
        <InputForm onSubmit={handleSubmit}>
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={pairProgramming.enabled 
              ? `Ask or instruct AI in ${pairProgramming.mode} mode...` 
              : "Ask the AI assistant for help..."
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <InputActions>
            <ContextStatus>
              <StatusIndicator isActive={currentFile !== null} />
              {currentFile ? `Context: ${currentFile.name}` : 'No file context'}
            </ContextStatus>
            <SendButton type="submit" disabled={!message.trim() || isSubmitting}>
              {isSubmitting ? <FaSpinner /> : <FaPlay />}
              Send
            </SendButton>
          </InputActions>
        </InputForm>
      </InputContainer>
      
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </SidebarContainer>
  );
};

export default ChatSidebar; 