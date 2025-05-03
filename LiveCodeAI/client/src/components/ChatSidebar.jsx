import React, { useState } from 'react';
import styled from 'styled-components';
import { useStore } from '../store/useStore';
import { FaRobot, FaCode } from 'react-icons/fa';

const SidebarContainer = styled.div`
  width: 300px;
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
  align-items: center;
  gap: 0.5rem;
`;

const ChatMessages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
`;

const Message = styled.div`
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: ${props => props.isAI ? '#2d2d2d' : '#3d3d3d'};
  border-radius: 4px;
`;

const InputContainer = styled.div`
  padding: 1rem;
  border-top: 1px solid #333;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.5rem;
  background: #2d2d2d;
  border: 1px solid #333;
  border-radius: 4px;
  color: white;
  &:focus {
    outline: none;
    border-color: #007acc;
  }
`;

const ChatSidebar = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const { currentFile, requestAIHelp } = useStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = { text: message, isAI: false };
    setMessages(prev => [...prev, userMessage]);
    setMessage('');

    try {
      const response = await requestAIHelp(
        currentFile?.content || '',
        message,
        currentFile?.name || 'current file'
      );

      setMessages(prev => [...prev, { text: response.code, isAI: true }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        text: 'Sorry, I encountered an error. Please try again.', 
        isAI: true 
      }]);
    }
  };

  return (
    <SidebarContainer>
      <ChatHeader>
        <FaRobot />
        <span>AI Assistant</span>
      </ChatHeader>
      <ChatMessages>
        {messages.map((msg, index) => (
          <Message key={index} isAI={msg.isAI}>
            {msg.isAI ? <FaRobot style={{ marginRight: '0.5rem' }} /> : null}
            {msg.text}
          </Message>
        ))}
      </ChatMessages>
      <InputContainer>
        <form onSubmit={handleSubmit}>
          <Input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask the AI for help..."
          />
        </form>
      </InputContainer>
    </SidebarContainer>
  );
};

export default ChatSidebar; 