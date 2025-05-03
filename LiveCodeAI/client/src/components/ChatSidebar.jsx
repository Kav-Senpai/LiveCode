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
  FaCog
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

const SettingsButton = styled.button`
  background: transparent;
  border: none;
  color: #888;
  cursor: pointer;
  
  &:hover {
    color: #ccc;
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

const ChatSidebar = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState({});
  const [gatheringContext, setGatheringContext] = useState(false);
  const messagesEndRef = useRef(null);
  const { 
    files, 
    currentFile, 
    requestAIHelp, 
    updateFile, 
    addFile 
  } = useStore();

  // Syntax highlighting on message updates
  useEffect(() => {
    Prism.highlightAll();
  }, [messages]);
  
  // Auto-scroll to the bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Initialize with a welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        text: "Hi, I'm your AI coding assistant! I can help you with code suggestions, refactoring, or explanations. What would you like me to help you with today?",
        isAI: true
      }]);
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
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = { text: message, isAI: false };
    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);

    try {
      // Gather additional context from the workspace
      const workspaceContext = gatherWorkspaceContext();
      
      const response = await requestAIHelp(
        currentFile?.content || '',
        message,
        workspaceContext
      );

      setMessages(prev => [...prev, { text: response.code, isAI: true, id: Date.now() }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        text: 'Sorry, I encountered an error processing your request. Please try again.', 
        isAI: true,
        id: Date.now()
      }]);
    } finally {
      setIsLoading(false);
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
      setActionStatus({
        ...actionStatus,
        [messageId]: { status: 'error', message: 'No file is open to apply code to' }
      });
      return;
    }
    
    setActionStatus({
      ...actionStatus,
      [messageId]: { status: 'loading', message: 'Implementing code...' }
    });
    
    try {
      // Update the current file with the code
      await updateFile(currentFile.id, { content: code });
      
      setActionStatus({
        ...actionStatus,
        [messageId]: { status: 'success', message: 'Code implemented successfully!' }
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setActionStatus({
          ...actionStatus,
          [messageId]: null
        });
      }, 3000);
    } catch (error) {
      setActionStatus({
        ...actionStatus,
        [messageId]: { status: 'error', message: 'Failed to implement code' }
      });
    }
  };
  
  const handleCreateNewFile = async (code, messageId) => {
    // Prompt for filename
    const fileName = prompt('Enter a filename for the new file:', 'newFile.js');
    if (!fileName) return;
    
    setActionStatus({
      ...actionStatus,
      [messageId]: { status: 'loading', message: 'Creating new file...' }
    });
    
    try {
      // Create a new file with the code
      const newFile = {
        name: fileName,
        content: code,
        type: 'file'
      };
      
      const createdFile = addFile(newFile);
      
      setActionStatus({
        ...actionStatus,
        [messageId]: { status: 'success', message: `File "${fileName}" created successfully!` }
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setActionStatus({
          ...actionStatus,
          [messageId]: null
        });
      }, 3000);
    } catch (error) {
      setActionStatus({
        ...actionStatus,
        [messageId]: { status: 'error', message: 'Failed to create new file' }
      });
    }
  };

  const renderMessageContent = (message) => {
    if (!message.isAI) {
      return <p>{message.text}</p>;
    }
    
    const blocks = extractCodeBlocks(message.text);
    
    if (blocks.length === 0) {
      return <p>{message.text}</p>;
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
                    disabled={actionStatus[message.id]?.status === 'loading'}
                    title="Implement this code in the current file"
                  >
                    {actionStatus[message.id]?.status === 'loading' ? (
                      <><FaSpinner size={12} /> Implementing...</>
                    ) : (
                      <><FaPlay size={12} /> Implement</>
                    )}
                  </ActionButton>
                  
                  <ActionButton
                    onClick={() => handleCreateNewFile(block.content, message.id)}
                    disabled={actionStatus[message.id]?.status === 'loading'}
                    title="Create a new file with this code"
                  >
                    <FaCode size={12} /> New File
                  </ActionButton>
                </CodeActions>
                
                {actionStatus[message.id] && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: actionStatus[message.id].status === 'error' ? '#e74c3c' : '#2ecc71',
                    marginTop: '0.5rem'
                  }}>
                    {actionStatus[message.id].status === 'success' && <FaCheckCircle size={12} />}
                    {actionStatus[message.id].status === 'error' && <FaTimesCircle size={12} />}
                    {' ' + actionStatus[message.id].message}
                  </div>
                )}
              </div>
            );
          }
        })}
      </>
    );
  };

  return (
    <SidebarContainer>
      <ChatHeader>
        <ChatTitle>
          <FaRobot />
          <span>AI Code Assistant</span>
        </ChatTitle>
        <SettingsButton title="Settings">
          <FaCog size={16} />
        </SettingsButton>
      </ChatHeader>
      
      <ChatMessages>
        {messages.map((msg, index) => (
          <Message key={index} isAI={msg.isAI}>
            <MessageHeader isAI={msg.isAI}>
              {msg.isAI ? <FaRobot /> : <FaUser />}
              <span>{msg.isAI ? 'AI Assistant' : 'You'}</span>
            </MessageHeader>
            {renderMessageContent(msg)}
          </Message>
        ))}
        {isLoading && (
          <Message isAI={true}>
            <MessageHeader isAI={true}>
              <FaRobot />
              <span>AI Assistant</span>
            </MessageHeader>
            <div>
              <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> 
              Thinking...
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
            placeholder="Ask about your code, request improvements, or get explanations..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <InputActions>
            <ContextStatus>
              <StatusIndicator isActive={currentFile !== null} />
              {currentFile ? `Context: ${currentFile.name}` : 'No file context'}
            </ContextStatus>
            <SendButton type="submit" disabled={isLoading || !message.trim()}>
              {isLoading ? <FaSpinner /> : null}
              {isLoading ? 'Processing...' : 'Send'}
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