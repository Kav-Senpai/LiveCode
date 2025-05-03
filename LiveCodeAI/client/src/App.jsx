import React from 'react';
import styled from 'styled-components';
import Editor from './components/Editor';
import FileTree from './components/FileTree';
import ChatSidebar from './components/ChatSidebar';

const AppContainer = styled.div`
  display: flex;
  height: 100vh;
  width: 100vw;
`;

const MainContent = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

const App = () => {
  return (
    <AppContainer>
      <FileTree />
      <MainContent>
        <Editor />
        <ChatSidebar />
      </MainContent>
    </AppContainer>
  );
};

export default App; 