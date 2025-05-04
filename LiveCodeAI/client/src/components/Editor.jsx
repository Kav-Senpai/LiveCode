import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import styled from 'styled-components';
import { useStore } from '../store/useStore';
import { MonacoBinding } from '../utils/y-monaco';
import { FaCode, FaSave, FaUndo, FaRedo, FaUsers, FaShare, FaLightbulb, FaRobot, FaLaptopCode, FaLock, FaLockOpen, FaUserCheck, FaUserSlash, FaGraduationCap, FaChevronLeft, FaChevronRight, FaInfoCircle, FaQuestionCircle } from 'react-icons/fa';
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
  border-radius: 8px;
  padding: 1.5rem;
  z-index: 1000;
  width: 350px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  animation: fadeIn 0.2s ease-out;
  
  h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #e0e0e0;
  }
  
  p {
    color: #ccc;
    margin-bottom: 1rem;
    font-size: 13px;
    line-height: 1.4;
  }
  
  .collaboration-status {
    background: rgba(0, 122, 204, 0.1);
    border-left: 3px solid #007acc;
    padding: 0.75rem;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 13px;
    color: #e0e0e0;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const ShareInput = styled.div`
  display: flex;
  margin-bottom: 1rem;
  
  input {
    flex: 1;
    padding: 0.75rem;
    background: #3c3c3c;
    border: 1px solid #555;
    border-radius: 4px 0 0 4px;
    color: white;
    font-family: inherit;
    
    &:focus {
      outline: none;
      border-color: #007acc;
    }
  }
  
  button {
    background: #007acc;
    color: white;
    border: none;
    border-radius: 0 4px 4px 0;
    padding: 0 1rem;
    cursor: pointer;
    white-space: nowrap;
    font-size: 12px;
    
    &:hover {
      background: #006bb3;
    }
  }
`;

const ShareActions = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: space-between;
`;

const ShareButton = styled.button`
  background: ${props => props.secondary ? 'transparent' : '#007acc'};
  color: ${props => props.secondary ? '#ccc' : 'white'};
  border: ${props => props.secondary ? '1px solid #555' : 'none'};
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 13px;
  
  &:hover {
    background: ${props => props.secondary ? '#333' : '#006bb3'};
    color: ${props => props.secondary ? '#fff' : '#fff'};
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

// Add new styled component for pair programming indicator
const PairProgrammingIndicator = styled.div`
  display: flex;
  align-items: center;
  background: ${props => props.enabled ? 'rgba(0, 122, 204, 0.2)' : 'transparent'};
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  margin-right: 0.5rem;
  color: ${props => props.enabled ? '#fff' : '#666'};
  border: 1px solid ${props => props.enabled ? 'rgba(0, 122, 204, 0.5)' : 'transparent'};
  
  svg {
    margin-right: 0.25rem;
  }
  
  span {
    font-size: 12px;
    text-transform: capitalize;
  }
`;

// Add styled components for ownership UI
const OwnershipBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: ${props => props.owned ? 'rgba(0, 170, 70, 0.15)' : props.others ? 'rgba(220, 53, 69, 0.15)' : 'transparent'};
  border: 1px solid ${props => props.owned ? 'rgba(0, 170, 70, 0.3)' : props.others ? 'rgba(220, 53, 69, 0.3)' : 'transparent'};
  color: ${props => props.owned ? '#0a0' : props.others ? '#d33' : '#ccc'};
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  margin-left: auto;
  margin-right: 0.5rem;
  font-size: 12px;
`;

const OwnershipControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const OwnershipButton = styled.button`
  background: transparent;
  border: none;
  border-radius: 4px;
  color: ${props => props.danger ? '#d33' : props.success ? '#0a0' : '#ccc'};
  padding: 0.25rem 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 12px;
  cursor: pointer;
  
  &:hover {
    background: #333;
    color: ${props => props.danger ? '#f55' : props.success ? '#2c2' : '#fff'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const OwnershipWarningOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(220, 53, 69, 0.05);
  z-index: 10;
  pointer-events: none;
  border: 2px solid rgba(220, 53, 69, 0.3);
`;

const OwnershipWarningBanner = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(220, 53, 69, 0.9);
  color: white;
  padding: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 11;
  font-size: 12px;
`;

// Add a new styled component for collaboration indicator
const CollaborationIndicator = styled.div`
  position: absolute;
  bottom: 40px;
  right: 20px;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: white;
  z-index: 100;
  font-size: 12px;
  animation: fadeIn 0.3s ease-out;
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .collaborator-avatars {
    display: flex;
    margin-left: 0.5rem;
  }
  
  .collaborator-avatar {
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
  }
  
  .sync-icon {
    animation: spin 1.5s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Add Learning Mode styled components
const LearningModeIndicator = styled.div`
  display: flex;
  align-items: center;
  background: ${props => props.enabled ? 'rgba(70, 130, 180, 0.2)' : 'transparent'};
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  margin-right: 0.5rem;
  color: ${props => props.enabled ? '#fff' : '#666'};
  border: 1px solid ${props => props.enabled ? 'rgba(70, 130, 180, 0.5)' : 'transparent'};
  
  svg {
    margin-right: 0.25rem;
  }
  
  span {
    font-size: 12px;
    text-transform: capitalize;
  }
`;

const LearningPanel = styled.div`
  position: absolute;
  bottom: 40px;
  left: 20px;
  background: #252526;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 1rem;
  z-index: 1000;
  width: 350px;
  max-width: 80vw;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease-out;
  display: flex;
  flex-direction: column;
  max-height: 60vh;
  
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  h3 {
    margin-top: 0;
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #e0e0e0;
    font-size: 16px;
  }
`;

const LearningPanelContent = styled.div`
  overflow-y: auto;
  padding-right: 0.5rem;
  margin: 0.5rem 0;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 4px;
  }
`;

const StepNavigator = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding-top: 0.5rem;
  border-top: 1px solid #444;
`;

const StepButton = styled.button`
  background: ${props => props.disabled ? '#333' : '#4682b4'};
  color: ${props => props.disabled ? '#777' : 'white'};
  border: none;
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.5 : 1};
  
  &:hover:not(:disabled) {
    background: #5795c7;
  }
`;

const StepIndicator = styled.div`
  color: #ccc;
  font-size: 13px;
`;

const LearningSettings = styled.div`
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #333;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const LearningOption = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #ccc;
    font-size: 13px;
  }
`;

const DifficultySelector = styled.select`
  background: #444;
  color: white;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  font-size: 12px;
  
  &:focus {
    outline: none;
    border-color: #4682b4;
  }
`;

const ConceptExplanation = styled.div`
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(70, 130, 180, 0.1);
  border-left: 3px solid #4682b4;
  border-radius: 0 4px 4px 0;
  
  h4 {
    margin: 0 0 0.5rem 0;
    color: #e0e0e0;
    font-size: 14px;
  }
  
  p {
    margin: 0;
    color: #ccc;
    font-size: 13px;
    line-height: 1.4;
  }
`;

const CodeHint = styled.div`
  margin-top: 0.5rem;
  background: #1e1e1e;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 0.75rem;
  
  pre {
    margin: 0;
    overflow-x: auto;
    color: #dcdcaa;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 12px;
  }
`;

const HintToggle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 0.5rem;
  border-top: 1px solid #444;
  color: #ccc;
  font-size: 13px;
  cursor: pointer;
  user-select: none;
  
  &:hover {
    color: white;
  }
  
  svg {
    color: #e6db74;
  }
`;

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
  
  input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #444;
    transition: .3s;
    border-radius: 20px;
  }
  
  .slider:before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    transition: .3s;
    border-radius: 50%;
  }
  
  input:checked + .slider {
    background-color: #4682b4;
  }
  
  input:checked + .slider:before {
    transform: translateX(20px);
  }
`;

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
  const [showLearningPanel, setShowLearningPanel] = useState(false);
  const [showConceptInfo, setShowConceptInfo] = useState(true);
  
  const { 
    files, 
    currentFile, 
    setCurrentFile, 
    addFile,
    updateFile,
    recentFiles,
    requestAIHelp,
    pairProgramming,
    currentUser,
    initCurrentUser,
    claimFileOwnership,
    releaseFileOwnership,
    isFileOwnedByCurrentUser,
    isFileOwnedByOthers,
    getFileOwner,
    learningMode,
    toggleLearningMode,
    setLearningDifficulty,
    toggleHints,
    setLearningSteps,
    nextLearningStep,
    previousLearningStep,
    setCurrentConcept
  } = useStore();
  
  const [openFiles, setOpenFiles] = useState([]);
  const [editorMounted, setEditorMounted] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [typingUsers, setTypingUsers] = useState([]);
  const [lastTypingEvent, setLastTypingEvent] = useState(null);
  const typingTimeoutRef = useRef(null);
  
  // Add state for ownership warning override
  const [overrideOwnership, setOverrideOwnership] = useState(false);
  
  // Initialize WebSocket provider
  useEffect(() => {
    try {
      // Create a unique room ID for the current file
      // This ensures all users editing the same file are in the same collaborative session
      const roomId = currentFile?.id ? `file-${currentFile.id}` : 'default-room';
      
      // Clean up previous provider before creating a new one
      if (wsProvider) {
        console.log('Destroying previous WebSocket provider');
        wsProvider.destroy();
      }
      
      console.log(`Creating new WebSocket provider for room: ${roomId}`);
      const provider = new WebsocketProvider(
        getWebSocketUrl(),
        roomId,
        yDoc,
        { connect: true } // Ensure connection is established
      );

      provider.on('status', (event) => {
        console.log('WebSocket status:', event.status);
        // Show connection status to the user
        if (event.status === 'connected') {
          console.log('Successfully connected to collaboration server');
        } else if (event.status === 'disconnected') {
          console.log('Disconnected from collaboration server');
        }
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
          
          // Log collaboration activity
          if (activeUsers.length > 0) {
            console.log(`Collaborating with ${activeUsers.length} other users`);
          }
        } catch (err) {
          console.error('Error handling awareness update:', err);
        }
      });
      
      // Store socket reference in window for global access
      window.socket = provider.ws;
      
      // Listen for file ownership updates
      window.socket.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'file-ownership-updated' && data.fileId) {
            console.log('Received file ownership update:', data);
            // Update store with new ownership
            useStore.getState().updateFileOwnership(data.fileId, data.owner);
          }
          
          if (data.type === 'file-ownership-removed' && data.fileId) {
            console.log('Received file ownership removal:', data);
            // Remove ownership from store
            useStore.getState().removeFileOwnership(data.fileId);
          }
        } catch (err) {
          // Not a JSON message or not ownership-related
        }
      });

      setWsProvider(provider);
      
      // Generate an invite link
      try {
        const protocol = window.location.protocol;
        const host = window.location.host;
        const currentPath = window.location.pathname;
        const inviteUrl = `${protocol}//${host}${currentPath}?room=${roomId}&file=${currentFile?.id || ''}`;
        console.log(`Generated collaboration link: ${inviteUrl}`);
        setInviteLink(inviteUrl);
      } catch (err) {
        console.error('Error generating invite link:', err);
        setInviteLink('');
      }

      return () => {
        try {
          console.log('Cleaning up WebSocket provider');
          provider.destroy();
          if (window.socket === provider.ws) {
            window.socket = null;
          }
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
        
        // Explicitly join the collaboration room
        joinCollaborationRoom(roomId);
      } else {
        console.warn('Could not find file with ID:', fileId);
        
        // Show a notification to the user
        alert('The shared file could not be found in your workspace.');
        
        // If we couldn't find the file, at least set the room ID to ensure collaboration works
        if (currentFile) {
          // Force recreate the WebSocket provider with the correct room ID
          if (wsProvider) {
            wsProvider.destroy();
          }
          
          // Create a new provider with the specified room ID
          const provider = new WebsocketProvider(
            getWebSocketUrl(),
            roomId,
            yDoc
          );
          
          provider.on('status', (event) => {
            console.log('WebSocket status:', event.status);
          });
          
          setWsProvider(provider);
          
          // Join the collaboration room
          joinCollaborationRoom(roomId);
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
  
  // Initialize current user when component loads
  useEffect(() => {
    if (!currentUser) {
      initCurrentUser({
        userId,
        userName,
        color: userColor
      });
    }
  }, [currentUser, initCurrentUser, userId, userName, userColor]);
  
  // Add learning mode decorations to editor
  const addLearningDecorations = (editor, monaco, currentStep) => {
    if (!editor || !monaco || !currentStep || !learningMode.enabled) return;
    
    try {
      // Clear any existing learning decorations
      if (editor._learningDecorations) {
        editor.deltaDecorations(editor._learningDecorations, []);
      }
      
      const model = editor.getModel();
      if (!model) return;
      
      // Find the line numbers based on the code reference
      // Note: In a real implementation, you'd have more accurate location data
      const fullText = model.getValue();
      const codeToFind = currentStep.codeReference.replace(/\.\.\.\s+/g, '.*?');
      
      // Use a simplified way to find the concept in the code
      // In a real implementation, you'd use AST parsing or more accurate search
      const lines = fullText.split('\n');
      const matchingLines = [];
      
      // This is a simple approach - in a production app, use a more sophisticated search method
      const searchRegex = new RegExp(codeToFind.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\.\\\*\\\?/g, '.*?'));
      
      lines.forEach((line, index) => {
        if (searchRegex.test(line)) {
          matchingLines.push(index + 1);
        }
      });
      
      // Create decorations for matching lines
      const decorations = matchingLines.map(lineNumber => ({
        range: new monaco.Range(lineNumber, 1, lineNumber, 1000),
        options: {
          isWholeLine: true,
          className: 'current-learning-step',
          glyphMarginClassName: 'learning-step-marker',
          glyphMarginHoverMessage: { value: currentStep.title }
        }
      }));
      
      // Add decorations to the editor
      if (decorations.length > 0) {
        editor._learningDecorations = editor.deltaDecorations([], decorations);
        
        // Scroll to the first decoration
        editor.revealLineInCenter(matchingLines[0]);
      }
      
      console.log('Applied learning mode decorations for step:', currentStep.title);
    } catch (err) {
      console.error('Error adding learning decorations:', err);
    }
  };
  
  // Update learning decorations when step changes
  useEffect(() => {
    if (editorMounted && editorRef.current && monacoRef.current && learningMode.enabled) {
      const currentStep = getCurrentStep();
      if (currentStep) {
        addLearningDecorations(editorRef.current, monacoRef.current, currentStep);
      }
    }
  }, [learningMode.currentStep, learningMode.enabled, editorMounted, currentFile?.id]);
  
  // Add learning concept hover providers
  const setupLearningHoverProviders = (monaco) => {
    if (!monaco) return;
    
    // Register hover provider for all languages
    monaco.languages.registerHoverProvider('*', {
      provideHover: (model, position) => {
        if (!learningMode.enabled || !learningMode.currentConcept) return null;
        
        // Get word at position
        const word = model.getWordAtPosition(position);
        if (!word) return null;
        
        // In a real implementation, you would have a more sophisticated way to
        // identify concepts in the code. This is a simplified version.
        const concepts = {
          'react': 'A JavaScript library for building user interfaces.',
          'useState': 'A React Hook that lets you add state to functional components.',
          'useEffect': 'A React Hook that lets you synchronize a component with an external system.',
          'component': 'The building blocks of React applications that encapsulate logic and UI.',
          'props': 'Properties passed to React components to configure their behavior.',
        };
        
        const content = concepts[word.word.toLowerCase()];
        if (!content) return null;
        
        return {
          contents: [
            { value: `**Learning Concept: ${word.word}**` },
            { value: content }
          ]
        };
      }
    });
  };
  
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setEditorMounted(true);
    setEditorReady(true);
    
    console.log('Editor mounted, setting up collaborative features');
    
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
      console.log('Setting up Y.js binding with Monaco editor');
      try {
        // Get the current text content
        const currentContent = editor.getValue();
        
        // If the yText document is empty but we have content, initialize it
        if (yText.toString() === '' && currentContent) {
          console.log('Initializing Y.js document with current content');
          yText.insert(0, currentContent);
        }
        
        // Bind Y.js to Monaco
        const binding = new MonacoBinding(
          yText,
          editor.getModel(),
          new Set([editor]),
          wsProvider.awareness
        );
        
        console.log('Y.js binding established successfully');
        
        // Decorate remote cursors/selections
        decorateRemoteCursors(monaco, editor, wsProvider.awareness);
      } catch (err) {
        console.error('Error setting up Y.js binding:', err);
      }
    } else {
      console.warn('WebSocket provider not available, collaborative editing disabled');
    }
    
    // Set up AI code completion provider
    setupAICompletionProvider(monaco);
    
    // Set up learning mode hover providers
    setupLearningHoverProviders(monaco);
    
    // Listen for AI pair programming
    if (pairProgramming.enabled) {
      console.log('Pair programming mode enabled:', pairProgramming.mode);
      // This would integrate with the AI backend for real-time coding assistance
      // based on the selected mode (suggest, write, explain)
    }
    
    // Apply learning decorations if in learning mode
    if (learningMode.enabled) {
      const currentStep = getCurrentStep();
      if (currentStep) {
        addLearningDecorations(editor, monaco, currentStep);
      }
    }
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
      // Check if we have permission to edit
      const ownedBySomeoneElse = isFileOwnedByOthers(currentFile.id);
      const canEdit = !ownedBySomeoneElse || overrideOwnership || isFileOwnedByCurrentUser(currentFile.id);
      
      if (canEdit) {
        updateFile(currentFile.id, { content: value });
      }
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
    alert('Collaboration link copied to clipboard! Share this with others to collaborate in real-time.');
    console.log('Collaboration link copied:', inviteLink);
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
  
  // Add a useEffect to handle changes to pair programming mode
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      if (pairProgramming.enabled) {
        console.log('Pair programming mode changed:', pairProgramming.mode);
        // Implement mode-specific behaviors here
        switch (pairProgramming.mode) {
          case 'suggest':
            // Enhance auto-suggestions
            break;
          case 'write':
            // Enable more proactive code generation
            break;
          case 'explain':
            // Add inline documentation/explanations
            break;
          default:
            break;
        }
      }
    }
  }, [pairProgramming.enabled, pairProgramming.mode]);
  
  // Get the class names for pair programming mode
  const getPairProgrammingClasses = () => {
    if (!pairProgramming.enabled) return '';
    return `pair-programming-active pair-programming-${pairProgramming.mode}`;
  };
  
  // Handle claiming ownership of a file
  const handleClaimOwnership = () => {
    if (currentFile) {
      claimFileOwnership(currentFile.id);
    }
  };
  
  // Handle releasing ownership of a file
  const handleReleaseOwnership = () => {
    if (currentFile) {
      releaseFileOwnership(currentFile.id);
    }
  };
  
  // Override ownership warning
  const handleOverrideOwnership = () => {
    setOverrideOwnership(true);
  };
  
  // Reset override when changing files
  useEffect(() => {
    setOverrideOwnership(false);
  }, [currentFile?.id]);
  
  // Determine if the current file is owned and by whom
  const fileOwner = currentFile ? getFileOwner(currentFile.id) : null;
  const isOwnedByMe = currentFile ? isFileOwnedByCurrentUser(currentFile.id) : false;
  const isOwnedByOthers = currentFile ? isFileOwnedByOthers(currentFile.id) : false;
  
  // Add a join room function to explicitly join collaboration rooms
  const joinCollaborationRoom = (roomId) => {
    if (window.socket) {
      console.log(`Joining collaboration room: ${roomId}`);
      // The error occurs because window.socket is a WebSocket object, not a Socket.IO socket
      // We need to use a native WebSocket message instead of Socket.IO's emit
      const message = JSON.stringify({
        type: 'join-room',
        roomId: roomId
      });
      window.socket.send(message);
    }
  };
  
  // Toggle learning panel
  const toggleLearningPanel = () => {
    setShowLearningPanel(!showLearningPanel);
    // Collapse other panels when opening learning panel
    if (!showLearningPanel) {
      setShowAIPanel(false);
      setShowSharePanel(false);
    }
  };
  
  // Generate learning steps and concept info based on file content
  const generateLearningContent = async () => {
    if (!currentFile || !currentFile.content) return;
    
    try {
      console.log(`Generating learning content for ${learningMode.difficulty} level`);
      
      // Set up WebSocket handler for learning content response
      if (window.socket) {
        // One-time handler for learning content response
        const handleLearningResponse = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'ai-learning-response') {
              console.log('Received learning content:', data);
              
              const learningData = data.content;
              
              // Set the learning steps
              if (learningData.steps && learningData.steps.length > 0) {
                setLearningSteps(learningData.steps);
              }
              
              // Set the first concept if available
              if (learningData.concepts && learningData.concepts.length > 0) {
                setCurrentConcept(learningData.concepts[0]);
              }
              
              // Remove the event listener
              window.socket.removeEventListener('message', handleLearningResponse);
            }
          } catch (err) {
            // Not JSON or not learning-related
          }
        };
        
        // Add the message handler
        window.socket.addEventListener('message', handleLearningResponse);
        
        // Send the request
        const message = JSON.stringify({
          type: 'ai-learning-request',
          code: currentFile.content,
          difficulty: learningMode.difficulty,
          language: getLanguageForFile(currentFile.name)
        });
        
        window.socket.send(message);
      } else {
        console.warn('WebSocket not available for learning content generation');
        
        // Fallback to mock data for demo purposes
        // In a real app, you'd handle this differently
        const mockSteps = [
          {
            title: "Understanding the Basic Structure",
            explanation: "This code defines a React component that renders a user interface. Components are the building blocks of React applications.",
            codeReference: "const Component = () => { ... }",
            hint: "Look for the function definition and JSX return statement"
          },
          {
            title: "State Management",
            explanation: "The component uses React hooks (useState) to manage data that changes over time.",
            codeReference: "const [state, setState] = useState(initialValue);",
            hint: "Find all the useState hooks and understand what data they're tracking"
          },
          {
            title: "Event Handling",
            explanation: "The component responds to user interactions through event handlers.",
            codeReference: "onClick={handleClick}",
            hint: "Look for functions that are triggered by user actions"
          }
        ];
        
        // Set the learning steps
        setLearningSteps(mockSteps);
        
        // Set the first concept
        setCurrentConcept({
          name: "React Components",
          explanation: "React components are reusable pieces of code that represent a part of the user interface. They can be composed together to build complex UIs."
        });
      }
    } catch (error) {
      console.error('Failed to generate learning content:', error);
    }
  };
  
  // Effect to generate learning content when mode is enabled or file changes
  useEffect(() => {
    if (learningMode.enabled && currentFile) {
      generateLearningContent();
    }
  }, [learningMode.enabled, currentFile?.id, learningMode.difficulty]);
  
  // Get the class names for learning mode
  const getLearningModeClasses = () => {
    if (!learningMode.enabled) return '';
    return `learning-mode-active learning-${learningMode.difficulty}`;
  };
  
  // Get the current step
  const getCurrentStep = () => {
    if (!learningMode.steps || learningMode.steps.length === 0) {
      return null;
    }
    return learningMode.steps[learningMode.currentStep];
  };
  
  // Render empty state when no file is open
  if (!currentFile) {
    return (
      <EditorContainer className={`${getPairProgrammingClasses()} ${getLearningModeClasses()}`}>
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
    <EditorContainer className={`${getPairProgrammingClasses()} ${getLearningModeClasses()}`}>
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
          <ToolbarButton onClick={handleSave} title="Save (Ctrl+S)">
            <FaSave /> Save
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
          
          <PairProgrammingIndicator enabled={pairProgramming.enabled}>
            <FaLaptopCode />
            {pairProgramming.enabled ? (
              <span>{pairProgramming.mode} Mode</span>
            ) : (
              <span>Solo</span>
            )}
          </PairProgrammingIndicator>
          
          {/* Add Learning Mode Indicator */}
          <LearningModeIndicator 
            enabled={learningMode.enabled}
            onClick={() => {
              toggleLearningMode();
              if (!learningMode.enabled) {
                setShowLearningPanel(true);
              }
            }}
          >
            <FaGraduationCap />
            <span>{learningMode.enabled ? 'Learning Mode' : 'Standard Mode'}</span>
          </LearningModeIndicator>
        </ToolbarGroup>
        
        {/* Add ownership badge and controls */}
        {currentFile && (
          <OwnershipBadge
            owned={isOwnedByMe}
            others={isOwnedByOthers}
          >
            {isOwnedByMe ? (
              <>
                <FaUserCheck />
                <span>You own this file</span>
              </>
            ) : isOwnedByOthers ? (
              <>
                <FaLock />
                <span>Owned by {fileOwner?.userName}</span>
              </>
            ) : (
              <>
                <FaLockOpen />
                <span>Not claimed</span>
              </>
            )}
          </OwnershipBadge>
        )}
        
        {/* Add ownership controls */}
        {currentFile && (
          <OwnershipControls>
            {!isOwnedByMe && !isOwnedByOthers && (
              <OwnershipButton 
                success
                onClick={handleClaimOwnership}
                title="Claim ownership of this file"
              >
                <FaUserCheck size={12} />
                <span>Claim</span>
              </OwnershipButton>
            )}
            
            {isOwnedByMe && (
              <OwnershipButton 
                danger
                onClick={handleReleaseOwnership}
                title="Release ownership of this file"
              >
                <FaUserSlash size={12} />
                <span>Release</span>
              </OwnershipButton>
            )}
          </OwnershipControls>
        )}
        
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
          
          {/* Add Learning Panel Toggle */}
          {learningMode.enabled && (
            <ToolbarButton 
              onClick={toggleLearningPanel} 
              active={showLearningPanel}
              title="Show Learning Panel"
            >
              <FaGraduationCap size={14} /> Learn
            </ToolbarButton>
          )}
          
          <ToolbarButton 
            onClick={toggleSharePanel} 
            active={showSharePanel}
            title="Share and invite collaborators"
          >
            <FaShare size={14} /> Share
          </ToolbarButton>
        </ToolbarGroup>
      </EditorToolbar>
      
      {/* Show ownership warning if needed */}
      {currentFile && isOwnedByOthers && !overrideOwnership && (
        <>
          <OwnershipWarningBanner>
            <span>
              <FaLock style={{ marginRight: '0.5rem' }} />
              This file is currently owned by {fileOwner?.userName}. Changes will still be visible to others.
            </span>
            <OwnershipButton 
              onClick={handleOverrideOwnership}
              danger
            >
              Override Lock
            </OwnershipButton>
          </OwnershipWarningBanner>
          <OwnershipWarningOverlay />
        </>
      )}
      
      {/* Learning Panel */}
      {showLearningPanel && learningMode.enabled && (
        <LearningPanel>
          <h3>
            <FaGraduationCap /> 
            Learning Mode{' '}
            <span style={{ fontSize: '12px', color: '#ccc', fontWeight: 'normal', marginLeft: '5px' }}>
              ({learningMode.difficulty})
            </span>
          </h3>
          
          <LearningSettings>
            <LearningOption>
              <div className="label">
                <FaInfoCircle size={12} />
                <span>Difficulty Level</span>
              </div>
              <DifficultySelector 
                value={learningMode.difficulty}
                onChange={(e) => setLearningDifficulty(e.target.value)}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </DifficultySelector>
            </LearningOption>
            
            <LearningOption>
              <div className="label">
                <FaQuestionCircle size={12} />
                <span>Show Hints</span>
              </div>
              <ToggleSwitch>
                <input 
                  type="checkbox" 
                  checked={learningMode.showHints}
                  onChange={toggleHints}
                />
                <span className="slider"></span>
              </ToggleSwitch>
            </LearningOption>
          </LearningSettings>
          
          <LearningPanelContent>
            {getCurrentStep() ? (
              <>
                <h4>{getCurrentStep().title}</h4>
                <p>{getCurrentStep().explanation}</p>
                
                {learningMode.showHints && (
                  <CodeHint>
                    <pre>{getCurrentStep().codeReference}</pre>
                  </CodeHint>
                )}
                
                {!learningMode.showHints && (
                  <HintToggle onClick={() => toggleHints()}>
                    <FaLightbulb />
                    <span>Show hint</span>
                  </HintToggle>
                )}
              </>
            ) : (
              <p>No learning steps available for this file. Try opening a different file or changing the difficulty level.</p>
            )}
            
            {showConceptInfo && learningMode.currentConcept && (
              <ConceptExplanation>
                <h4>Concept: {learningMode.currentConcept.name}</h4>
                <p>{learningMode.currentConcept.explanation}</p>
              </ConceptExplanation>
            )}
          </LearningPanelContent>
          
          <StepNavigator>
            <StepButton 
              onClick={previousLearningStep}
              disabled={!learningMode.steps || learningMode.currentStep === 0}
            >
              <FaChevronLeft size={12} />
              <span>Previous</span>
            </StepButton>
            
            <StepIndicator>
              {learningMode.steps?.length > 0 
                ? `Step ${learningMode.currentStep + 1} of ${learningMode.steps.length}`
                : 'No steps available'}
            </StepIndicator>
            
            <StepButton 
              onClick={nextLearningStep}
              disabled={!learningMode.steps || learningMode.currentStep === learningMode.steps.length - 1}
            >
              <span>Next</span>
              <FaChevronRight size={12} />
            </StepButton>
          </StepNavigator>
        </LearningPanel>
      )}
      
      {showSharePanel && (
        <SharePanel>
          <h3>
            <FaUsers /> 
            Real-time Collaboration
          </h3>
          
          <div className="collaboration-status">
            {collaborators.length > 0 ? (
              <>
                <FaUsers />
                <span>
                  {collaborators.length} {collaborators.length === 1 ? 'person' : 'people'} connected
                </span>
              </>
            ) : (
              <>
                <FaShare />
                <span>Share this link to start collaborating</span>
              </>
            )}
          </div>
          
          <p>
            Send this link to others to collaborate in real-time. Anyone with the link can join
            and work on this file together with you.
          </p>
          
          <ShareInput>
            <input value={inviteLink} readOnly onClick={(e) => e.target.select()} />
            <button onClick={copyInviteLink}>Copy</button>
          </ShareInput>
          
          <ShareActions>
            <ShareButton secondary onClick={toggleSharePanel}>
              Close
            </ShareButton>
            
            <ShareButton onClick={() => {
              try {
                window.open(inviteLink, '_blank');
              } catch (err) {
                console.error('Error opening collaboration link:', err);
                alert('Could not open the link. Please copy it manually.');
              }
            }}>
              <FaShare size={14} /> Open in New Tab
            </ShareButton>
          </ShareActions>
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
        
        {/* Add collaboration indicator when others are present */}
        {collaborators.length > 0 && (
          <CollaborationIndicator>
            <div className="sync-icon">⟳</div>
            <span>
              {collaborators.length === 1 
                ? '1 person collaborating' 
                : `${collaborators.length} people collaborating`}
            </span>
            <div className="collaborator-avatars">
              {collaborators.slice(0, 3).map(user => (
                <div 
                  key={user.userId}
                  className="collaborator-avatar"
                  style={{ backgroundColor: user.color }}
                  title={user.name}
                >
                  {user.name.charAt(0)}
                </div>
              ))}
              {collaborators.length > 3 && (
                <div 
                  className="collaborator-avatar"
                  style={{ backgroundColor: '#666' }}
                >
                  +{collaborators.length - 3}
                </div>
              )}
            </div>
          </CollaborationIndicator>
        )}
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