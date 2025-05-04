import { create } from 'zustand';

const useStore = create((set, get) => ({
  files: [],
  currentFile: null,
  users: [],
  aiResponses: [],
  expandedFolders: {},
  recentFiles: [],
  pairProgramming: {
    enabled: false,
    mode: 'suggest', // 'suggest', 'write', or 'explain'
  },
  generatingFiles: false, // Flag to indicate when files are being generated
  fileOwnership: {}, // Map of fileId -> {userId, userName, color}
  currentUser: null, // Will store the current user's info
  
  // Learning Mode state
  learningMode: {
    enabled: false,
    difficulty: 'beginner', // beginner, intermediate, advanced
    showHints: true,
    currentStep: 0,
    steps: [],
    currentConcept: null,
  },
  
  // Initialize current user
  initCurrentUser: (user) => {
    set({ currentUser: user });
  },
  
  // Claim ownership of a file
  claimFileOwnership: (fileId) => {
    const currentUser = get().currentUser;
    if (!currentUser) return false;
    
    set((state) => ({
      fileOwnership: {
        ...state.fileOwnership,
        [fileId]: {
          userId: currentUser.userId,
          userName: currentUser.userName,
          color: currentUser.color,
          claimedAt: new Date().toISOString()
        }
      }
    }));
    
    // Emit ownership change event for WebSocket
    if (window.socket) {
      window.socket.emit('file-ownership-change', {
        fileId,
        owner: {
          userId: currentUser.userId,
          userName: currentUser.userName,
          color: currentUser.color,
          claimedAt: new Date().toISOString()
        }
      });
    }
    
    return true;
  },
  
  // Release ownership of a file
  releaseFileOwnership: (fileId) => {
    const currentUser = get().currentUser;
    const ownership = get().fileOwnership[fileId];
    
    // Only the owner or after timeout can release ownership
    if (!ownership || (ownership.userId !== currentUser?.userId)) {
      return false;
    }
    
    set((state) => {
      const { [fileId]: _, ...remainingOwnership } = state.fileOwnership;
      return { fileOwnership: remainingOwnership };
    });
    
    // Emit ownership change event for WebSocket
    if (window.socket) {
      window.socket.emit('file-ownership-released', {
        fileId
      });
    }
    
    return true;
  },
  
  // Update file ownership from other users (via WebSocket)
  updateFileOwnership: (fileId, owner) => {
    set((state) => ({
      fileOwnership: {
        ...state.fileOwnership,
        [fileId]: owner
      }
    }));
  },
  
  // Remove file ownership (via WebSocket)
  removeFileOwnership: (fileId) => {
    set((state) => {
      const { [fileId]: _, ...remainingOwnership } = state.fileOwnership;
      return { fileOwnership: remainingOwnership };
    });
  },
  
  // Check if current user owns a file
  isFileOwnedByCurrentUser: (fileId) => {
    const ownership = get().fileOwnership[fileId];
    const currentUser = get().currentUser;
    
    return ownership && currentUser && ownership.userId === currentUser.userId;
  },
  
  // Check if file is owned by someone else
  isFileOwnedByOthers: (fileId) => {
    const ownership = get().fileOwnership[fileId];
    const currentUser = get().currentUser;
    
    return ownership && currentUser && ownership.userId !== currentUser.userId;
  },
  
  // Get owner information for a file
  getFileOwner: (fileId) => {
    return get().fileOwnership[fileId] || null;
  },
  
  setFiles: (files) => set({ files }),
  
  enablePairProgramming: (enabled = true) => set(state => ({
    pairProgramming: {
      ...state.pairProgramming,
      enabled
    }
  })),
  
  setPairProgrammingMode: (mode) => set(state => ({
    pairProgramming: {
      ...state.pairProgramming,
      mode
    }
  })),
  
  setCurrentFile: (file) => {
    // Add to recent files
    if (file) {
      const currentRecents = get().recentFiles;
      const newRecents = [
        file,
        ...currentRecents.filter(f => f.id !== file.id)
      ].slice(0, 10); // Keep only 10 most recent
      
      set({ 
        currentFile: file,
        recentFiles: newRecents
      });
    } else {
      set({ currentFile: null });
    }
  },
  
  // Function to generate files from a prompt
  generateFilesFromPrompt: async (prompt, parentFolderId = null) => {
    set({ generatingFiles: true });
    
    try {
      // Create a high-level prompt to instruct the AI what we want
      const fullPrompt = `
        Generate code files based on the following feature request: "${prompt}"
        
        Please include the necessary files, components, and utilities needed.
        For each file, include:
        1. Filename with appropriate extension
        2. Complete code content
        3. Brief description of what the file does
      `;
      
      // Send the prompt to the AI service
      const response = await fetch('http://localhost:5000/ai-prompt-to-files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: fullPrompt }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate files from prompt');
      }
      
      const data = await response.json();
      
      // Create folder for the generated feature
      const featureName = data.feature?.name || 'generated-feature';
      const featureFolder = get().addFolder(featureName, parentFolderId);
      
      // Create all the generated files
      if (data.files && Array.isArray(data.files)) {
        data.files.forEach(fileData => {
          get().addFile({
            name: fileData.filename,
            content: fileData.content,
            type: 'file',
            description: fileData.description
          }, featureFolder.id);
        });
      }
      
      // Add response to AI chat messages
      get().addAIResponse({
        id: Date.now(),
        sender: 'ai',
        content: `Generated ${data.files?.length || 0} files for feature: ${featureName}`,
        timestamp: new Date().toISOString()
      });
      
      return { success: true, folderGenerated: featureFolder };
    } catch (error) {
      console.error('File generation failed:', error);
      
      get().addAIResponse({
        id: Date.now(),
        sender: 'ai',
        content: `Failed to generate files: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      
      return { success: false, error: error.message };
    } finally {
      set({ generatingFiles: false });
    }
  },
  
  addFile: (file, parentId = null) => {
    const newFile = {
      ...file,
      id: file.id || Date.now(),
      parentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Validate that this won't create a circular reference
    if (parentId) {
      const allFiles = get().files;
      const parentFile = allFiles.find(f => f.id === parentId);
      
      // If parent doesn't exist, fallback to root
      if (!parentFile) {
        console.warn(`Parent folder with ID ${parentId} not found, adding file to root`);
        newFile.parentId = null;
      }
    }
    
    set((state) => ({ 
      files: [...state.files, newFile],
    }));
    
    return newFile;
  },
  
  addFolder: (name, parentId = null) => {
    // Validate that this won't create a circular reference
    if (parentId) {
      const allFiles = get().files;
      const parentFolder = allFiles.find(f => f.id === parentId);
      
      // If parent doesn't exist, fallback to root
      if (!parentFolder) {
        console.warn(`Parent folder with ID ${parentId} not found, adding folder to root`);
        parentId = null;
      } 
      // Check for circular references
      else if (parentFolder.type === 'folder') {
        let currentParent = parentFolder;
        const visited = new Set([currentParent.id]);
        
        // Traverse up the folder tree to ensure no circular references
        while (currentParent && currentParent.parentId) {
          if (visited.has(currentParent.parentId)) {
            console.error('Circular folder reference detected, adding to root instead');
            parentId = null;
            break;
          }
          
          visited.add(currentParent.parentId);
          currentParent = allFiles.find(f => f.id === currentParent.parentId);
        }
      }
    }
    
    const newFolder = {
      id: Date.now(),
      name,
      type: 'folder',
      parentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    set((state) => ({ 
      files: [...state.files, newFolder],
      expandedFolders: {
        ...state.expandedFolders,
        [newFolder.id]: true
      }
    }));
    
    return newFolder;
  },
  
  updateFile: (fileId, updates) => {
    set((state) => ({
      files: state.files.map(f => 
        f.id === fileId 
          ? { 
              ...f, 
              ...updates, 
              updatedAt: new Date().toISOString() 
            } 
          : f
      ),
      currentFile: state.currentFile?.id === fileId 
        ? { ...state.currentFile, ...updates, updatedAt: new Date().toISOString() }
        : state.currentFile
    }));
  },
  
  removeFile: (fileId) => {
    const allFiles = get().files;
    const fileToRemove = allFiles.find(f => f.id === fileId);
    
    // If it's a folder, also remove all children
    let idsToRemove = [fileId];
    if (fileToRemove?.type === 'folder') {
      const getChildrenIds = (parentId) => {
        const children = allFiles.filter(f => f.parentId === parentId);
        let childIds = children.map(c => c.id);
        
        // Get grandchildren
        children.forEach(child => {
          if (child.type === 'folder') {
            childIds = [...childIds, ...getChildrenIds(child.id)];
          }
        });
        
        return childIds;
      };
      
      idsToRemove = [...idsToRemove, ...getChildrenIds(fileId)];
    }
    
    // Update state
    set((state) => ({
      files: state.files.filter(f => !idsToRemove.includes(f.id)),
      currentFile: state.currentFile && idsToRemove.includes(state.currentFile.id) 
        ? null 
        : state.currentFile,
      recentFiles: state.recentFiles.filter(f => !idsToRemove.includes(f.id))
    }));
  },
  
  toggleFolder: (folderId) => {
    set((state) => ({
      expandedFolders: {
        ...state.expandedFolders,
        [folderId]: !state.expandedFolders[folderId]
      }
    }));
  },
  
  // User management
  addUser: (user) => set((state) => ({ users: [...state.users, user] })),
  removeUser: (userId) => set((state) => ({
    users: state.users.filter((u) => u.id !== userId)
  })),
  
  // AI-related actions
  addAIResponse: (response) => set((state) => ({
    aiResponses: [...state.aiResponses, response]
  })),
  
  requestAIHelp: async (code, instruction, context) => {
    try {
      const response = await fetch('http://localhost:5000/ai-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, instruction, context }),
      });
      
      const data = await response.json();
      set((state) => ({
        aiResponses: [...state.aiResponses, data]
      }));
      return data;
    } catch (error) {
      console.error('AI request failed:', error);
      throw error;
    }
  },
  
  // Learning Mode actions
  toggleLearningMode: () => set(state => ({
    learningMode: {
      ...state.learningMode,
      enabled: !state.learningMode.enabled
    }
  })),
  
  setLearningDifficulty: (difficulty) => set(state => ({
    learningMode: {
      ...state.learningMode,
      difficulty
    }
  })),
  
  toggleHints: () => set(state => ({
    learningMode: {
      ...state.learningMode,
      showHints: !state.learningMode.showHints
    }
  })),
  
  setLearningSteps: (steps) => set(state => ({
    learningMode: {
      ...state.learningMode,
      steps,
      currentStep: 0
    }
  })),
  
  nextLearningStep: () => set(state => ({
    learningMode: {
      ...state.learningMode,
      currentStep: Math.min(state.learningMode.currentStep + 1, state.learningMode.steps.length - 1)
    }
  })),
  
  previousLearningStep: () => set(state => ({
    learningMode: {
      ...state.learningMode,
      currentStep: Math.max(state.learningMode.currentStep - 1, 0)
    }
  })),
  
  setCurrentConcept: (concept) => set(state => ({
    learningMode: {
      ...state.learningMode,
      currentConcept: concept
    }
  })),
}));

export { useStore }; 