import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import styled from 'styled-components';
import { useStore } from '../store/useStore';
import { MonacoBinding } from '../utils/y-monaco';

const EditorContainer = styled.div`
  flex: 1;
  height: 100%;
  position: relative;
`;

const EditorComponent = () => {
  const editorRef = useRef(null);
  const [yDoc] = useState(new Y.Doc());
  const [yText] = useState(yDoc.getText('monaco'));
  const { currentFile, setCurrentFile } = useStore();
  const [wsProvider, setWsProvider] = useState(null);

  useEffect(() => {
    // Create a WebSocket provider
    const provider = new WebsocketProvider(
      'ws://localhost:5000',
      'monaco',
      yDoc
    );

    provider.on('status', (event) => {
      console.log('WebSocket status:', event.status);
    });

    setWsProvider(provider);

    return () => {
      provider.destroy();
    };
  }, [yDoc]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    if (wsProvider) {
      // Bind Y.js to Monaco
      const binding = new MonacoBinding(
        yText,
        editorRef.current.getModel(),
        new Set([editorRef.current]),
        wsProvider.awareness
      );
    }
  };

  const handleEditorChange = (value) => {
    if (currentFile) {
      setCurrentFile({
        ...currentFile,
        content: value
      });
    }
  };

  return (
    <EditorContainer>
      <Editor
        height="100%"
        defaultLanguage="javascript"
        defaultValue="// Start coding..."
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
        }}
      />
    </EditorContainer>
  );
};

export default EditorComponent; 