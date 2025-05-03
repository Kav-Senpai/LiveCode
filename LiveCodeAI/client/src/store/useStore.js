import { create } from 'zustand';

const useStore = create((set) => ({
  files: [],
  currentFile: null,
  users: [],
  aiResponses: [],
  
  setFiles: (files) => set({ files }),
  setCurrentFile: (file) => set({ currentFile: file }),
  addFile: (file) => set((state) => ({ files: [...state.files, file] })),
  removeFile: (fileId) => set((state) => ({
    files: state.files.filter((f) => f.id !== fileId)
  })),
  
  addUser: (user) => set((state) => ({ users: [...state.users, user] })),
  removeUser: (userId) => set((state) => ({
    users: state.users.filter((u) => u.id !== userId)
  })),
  
  addAIResponse: (response) => set((state) => ({
    aiResponses: [...state.aiResponses, response]
  })),
  
  // AI-related actions
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