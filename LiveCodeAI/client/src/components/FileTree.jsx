import React from 'react';
import styled from 'styled-components';
import { useStore } from '../store/useStore';
import { FaFolder, FaFile, FaPlus } from 'react-icons/fa';

const TreeContainer = styled.div`
  width: 250px;
  height: 100%;
  background: #252526;
  border-right: 1px solid #333;
  padding: 1rem;
`;

const TreeHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  color: #fff;
`;

const FileList = styled.div`
  color: #fff;
`;

const FileItem = styled.div`
  display: flex;
  align-items: center;
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 4px;
  &:hover {
    background: #2d2d2d;
  }
  ${props => props.isActive && `
    background: #37373d;
  `}
`;

const Icon = styled.span`
  margin-right: 0.5rem;
  color: ${props => props.color || '#fff'};
`;

const FileTree = () => {
  const { files, currentFile, setCurrentFile, addFile } = useStore();

  const handleFileClick = (file) => {
    setCurrentFile(file);
  };

  const handleAddFile = () => {
    const newFile = {
      id: Date.now(),
      name: 'new-file.js',
      content: '// New file',
      type: 'file'
    };
    addFile(newFile);
    setCurrentFile(newFile);
  };

  return (
    <TreeContainer>
      <TreeHeader>
        <span>Files</span>
        <FaPlus 
          onClick={handleAddFile} 
          style={{ cursor: 'pointer' }} 
        />
      </TreeHeader>
      <FileList>
        {files.map((file) => (
          <FileItem
            key={file.id}
            isActive={currentFile?.id === file.id}
            onClick={() => handleFileClick(file)}
          >
            <Icon>
              {file.type === 'folder' ? (
                <FaFolder color="#e8b417" />
              ) : (
                <FaFile color="#519aba" />
              )}
            </Icon>
            {file.name}
          </FileItem>
        ))}
      </FileList>
    </TreeContainer>
  );
};

export default FileTree; 