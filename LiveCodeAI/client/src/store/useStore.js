import { create } from 'zustand';

const useStore = create((set, get) => ({
  files: [],
  currentFile: null,
  users: [],
  aiResponses: [],
  expandedFolders: {},
  recentFiles: [],
  
  setFiles: (files) => set({ files }),
  
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
}));

export { useStore }; 