import React, { useState } from 'react';
import styled from 'styled-components';
import { useStore } from '../store/useStore';
import { 
  FaFileCode, 
  FaSpinner, 
  FaMagic, 
  FaCheck, 
  FaTimes,
  FaLightbulb
} from 'react-icons/fa';

const Container = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  background: #1e1e1e;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: #252526;
  border-bottom: 1px solid #333;
`;

const Title = styled.h2`
  margin: 0;
  color: #e0e0e0;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: #999;
  font-size: 1.5rem;
  cursor: pointer;
  
  &:hover {
    color: #fff;
  }
`;

const Content = styled.div`
  padding: 1.5rem;
`;

const PromptInput = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 1rem;
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 4px;
  color: #e0e0e0;
  resize: vertical;
  font-family: inherit;
  margin-bottom: 1rem;
  
  &:focus {
    outline: none;
    border-color: #007acc;
  }
  
  &::placeholder {
    color: #888;
  }
`;

const ExamplePrompts = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const ExamplePrompt = styled.div`
  padding: 0.75rem;
  background: #252526;
  border-radius: 4px;
  color: #ccc;
  cursor: pointer;
  border-left: 3px solid #007acc;
  
  &:hover {
    background: #2d2d2d;
    color: #fff;
  }
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const CancelButton = styled(Button)`
  background: transparent;
  border: 1px solid #666;
  color: #ccc;
  
  &:hover:not(:disabled) {
    background: #333;
    color: #fff;
  }
`;

const GenerateButton = styled(Button)`
  background: #007acc;
  border: none;
  color: white;
  
  &:hover:not(:disabled) {
    background: #0069b3;
  }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
`;

const GenerationStatus = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  
  ${props => props.success && `
    background: rgba(0, 170, 70, 0.1);
    border-left: 3px solid #0a0;
  `}
  
  ${props => props.error && `
    background: rgba(220, 50, 50, 0.1);
    border-left: 3px solid #d33;
  `}
  
  ${props => props.loading && `
    background: rgba(0, 122, 204, 0.1);
    border-left: 3px solid #007acc;
  `}
`;

const examplePrompts = [
  "Add login form with validation and authentication",
  "Create a dashboard with analytics charts and user statistics",
  "Build a contact form with email integration",
  "Implement a file upload component with progress tracking",
  "Create a multi-step registration wizard"
];

const PromptToFileGenerator = ({ isOpen, onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState(null); // null, 'loading', 'success', 'error'
  const [resultMessage, setResultMessage] = useState('');
  
  const { generateFilesFromPrompt, generatingFiles } = useStore();
  
  const handleGenerate = async () => {
    if (!prompt.trim() || generatingFiles) return;
    
    setStatus('loading');
    setResultMessage('Generating files from your prompt...');
    
    const result = await generateFilesFromPrompt(prompt);
    
    if (result.success) {
      setStatus('success');
      setResultMessage(`Successfully generated files for the requested feature!`);
    } else {
      setStatus('error');
      setResultMessage(`Failed to generate files: ${result.error}`);
    }
  };
  
  const handleExampleClick = (examplePrompt) => {
    setPrompt(examplePrompt);
  };
  
  const handleClose = () => {
    // Reset state when closing
    setPrompt('');
    setStatus(null);
    setResultMessage('');
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <>
      <Overlay onClick={handleClose} />
      <Container>
        <Header>
          <Title>
            <FaMagic /> Prompt-to-File Generator
          </Title>
          <CloseButton onClick={handleClose}>&times;</CloseButton>
        </Header>
        <Content>
          <p style={{ color: '#ccc', marginTop: 0 }}>
            Describe a feature or component in plain English, and we'll generate the necessary files and code.
          </p>
          
          <PromptInput 
            placeholder="Describe what you want to build... e.g., 'Create a shopping cart with product listing and checkout functionality'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={status === 'loading'}
          />
          
          <ExamplePrompts>
            <div style={{ marginBottom: '0.5rem', color: '#999' }}>
              <FaLightbulb style={{ marginRight: '0.5rem' }} /> Try these examples:
            </div>
            {examplePrompts.map((examplePrompt, index) => (
              <ExamplePrompt 
                key={index} 
                onClick={() => handleExampleClick(examplePrompt)}
              >
                {examplePrompt}
              </ExamplePrompt>
            ))}
          </ExamplePrompts>
          
          {status && (
            <GenerationStatus success={status === 'success'} error={status === 'error'} loading={status === 'loading'}>
              {status === 'loading' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#007acc' }}>
                  <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
                  {resultMessage}
                </div>
              )}
              {status === 'success' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0a0' }}>
                  <FaCheck />
                  {resultMessage}
                </div>
              )}
              {status === 'error' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#d33' }}>
                  <FaTimes />
                  {resultMessage}
                </div>
              )}
            </GenerationStatus>
          )}
          
          <Actions>
            <CancelButton onClick={handleClose}>
              Cancel
            </CancelButton>
            <GenerateButton 
              onClick={handleGenerate} 
              disabled={!prompt.trim() || status === 'loading'}
            >
              {status === 'loading' ? (
                <>
                  <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
                  Generating...
                </>
              ) : (
                <>
                  <FaFileCode />
                  Generate Files
                </>
              )}
            </GenerateButton>
          </Actions>
        </Content>
      </Container>
      
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </>
  );
};

export default PromptToFileGenerator; 