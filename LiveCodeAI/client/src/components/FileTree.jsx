import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useStore } from '../store/useStore';
import { 
  FaFolder, 
  FaFolderOpen, 
  FaFileCode, 
  FaFile, 
  FaJs, 
  FaCss3, 
  FaHtml5, 
  FaReact, 
  FaPlus, 
  FaChevronRight, 
  FaChevronDown,
  FaEllipsisH,
  FaSearch
} from 'react-icons/fa';

// Styled components
const TreeContainer = styled.div`
  width: 250px;
  height: 100%;
  background: #252526;
  border-right: 1px solid #333;
  display: flex;
  flex-direction: column;
`;

const TreeHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  color: #fff;
  font-weight: bold;
  border-bottom: 1px solid #333;
`;

const SearchBar = styled.div`
  padding: 0.5rem;
  position: relative;
  
  input {
    width: 100%;
    background: #3c3c3c;
    border: none;
    border-radius: 4px;
    padding: 0.5rem;
    padding-left: 2rem;
    color: #fff;
    
    &:focus {
      outline: 1px solid #007acc;
    }
  }
  
  svg {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: #ccc;
  }
`;

const ActionsBar = styled.div`
  display: flex;
  padding: 0.25rem 0.5rem;
  border-bottom: 1px solid #333;
  
  button {
    background: transparent;
    border: none;
    color: #ccc;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    border-radius: 4px;
    
    &:hover {
      background: #2d2d2d;
    }
  }
`;

const FileList = styled.div`
  color: #fff;
  flex: 1;
  overflow-y: auto;
  padding-top: 0.5rem;
`;

const SectionTitle = styled.div`
  font-size: 0.75rem;
  text-transform: uppercase;
  color: #ccc;
  padding: 0.5rem 1rem;
  margin-top: 1rem;
  letter-spacing: 0.1rem;
`;

const FileItem = styled.div`
  display: flex;
  align-items: center;
  padding: 0.3rem 0.5rem;
  cursor: pointer;
  user-select: none;
  margin-left: ${props => props.depth * 0.75}rem;
  border-radius: 4px;
  position: relative;
  
  &:hover {
    background: #2d2d2d;
    
    .actions {
      display: flex;
    }
  }
  
  ${props => props.isActive && `
    background: #37373d;
  `}
`;

const FolderExpander = styled.span`
  margin-right: 0.3rem;
  width: 1rem;
  color: #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Icon = styled.span`
  margin-right: 0.5rem;
  color: ${props => props.color || '#fff'};
  display: flex;
  align-items: center;
`;

const FileName = styled.div`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ItemActions = styled.div`
  display: none;
  position: absolute;
  right: 0.5rem;
  color: #ccc;
  align-items: center;
`;

const ContextMenu = styled.div`
  position: absolute;
  background: #252526;
  border: 1px solid #333;
  border-radius: 4px;
  z-index: 10;
  min-width: 160px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
`;

const ContextMenuItem = styled.div`
  padding: 0.5rem 1rem;
  cursor: pointer;
  &:hover {
    background: #2d2d2d;
  }
`;

const NewItemForm = styled.div`
  display: flex;
  align-items: center;
  margin-left: ${props => props.depth * 0.75}rem;
  padding: 0.3rem 0.5rem;
  
  input {
    background: #3c3c3c;
    border: none;
    color: #fff;
    padding: 0.25rem 0.5rem;
    border-radius: 2px;
    flex: 1;
    
    &:focus {
      outline: 1px solid #007acc;
    }
  }
`;

// Helper for file icons
const getFileIcon = (fileName) => {
  if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) return <FaJs color="#e8d44d" />;
  if (fileName.endsWith('.css')) return <FaCss3 color="#563d7c" />;
  if (fileName.endsWith('.html')) return <FaHtml5 color="#e44d26" />;
  if (fileName.endsWith('.tsx') || fileName.endsWith('.ts')) return <FaFileCode color="#007acc" />;
  if (fileName.endsWith('.jsx') || fileName.endsWith('.tsx')) return <FaReact color="#61dafb" />;
  return <FaFile color="#ccc" />;
};

const FileTree = () => {
  const { 
    files, 
    currentFile, 
    setCurrentFile, 
    addFile, 
    addFolder, 
    removeFile, 
    updateFile,
    expandedFolders,
    toggleFolder,
    recentFiles
  } = useStore();
  
  const [contextMenu, setContextMenu] = useState(null);
  const [newItemType, setNewItemType] = useState(null);
  const [newItemParent, setNewItemParent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef(null);
  
  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);
  
  // Focus input when creating new item
  useEffect(() => {
    if (newItemType && inputRef.current) {
      inputRef.current.focus();
    }
  }, [newItemType]);
  
  const handleContextMenu = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item
    });
  };
  
  const handleFileClick = (file) => {
    setCurrentFile(file);
  };
  
  const handleNewItem = (e) => {
    e.preventDefault();
    const name = e.target.elements.name.value;
    
    if (name) {
      if (newItemType === 'file') {
        const extension = name.includes('.') ? '' : '.js';
        addFile({
          name: name + extension,
          content: '',
          type: 'file'
        }, newItemParent);
      } else {
        addFolder(name, newItemParent);
      }
    }
    
    setNewItemType(null);
    setNewItemParent(null);
  };
  
  const renderNewItemInput = (parentId, depth) => {
    if (!newItemType || newItemParent !== parentId) return null;
    
    return (
      <NewItemForm depth={depth + 1} as="form" onSubmit={handleNewItem}>
        <Icon>
          {newItemType === 'file' ? <FaFile color="#ccc" /> : <FaFolder color="#e8b417" />}
        </Icon>
        <input 
          ref={inputRef}
          name="name" 
          placeholder={`New ${newItemType}...`} 
          onBlur={() => {
            setNewItemType(null);
            setNewItemParent(null);
          }}
        />
      </NewItemForm>
    );
  };
  
  const getFilteredFiles = () => {
    if (!searchTerm) return files;
    return files.filter(file => 
      file.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };
  
  const organizeFileTree = (items, parentId = null, depth = 0) => {
    // Safety check: prevent infinite recursion by limiting depth
    const MAX_DEPTH = 10;
    if (depth > MAX_DEPTH) {
      console.warn(`Maximum folder depth (${MAX_DEPTH}) exceeded. Some items may not be displayed.`);
      return [];
    }
    
    // Get top-level items
    const topLevel = items.filter(item => item.parentId === parentId);
    
    // Separate folders and files
    const folders = topLevel.filter(item => item.type === 'folder');
    const fileItems = topLevel.filter(item => item.type !== 'folder');
    
    // Sort folders and files alphabetically
    const sortedFolders = folders.sort((a, b) => a.name.localeCompare(b.name));
    const sortedFiles = fileItems.sort((a, b) => a.name.localeCompare(b.name));
    
    return [
      ...sortedFolders.map(folder => renderFolder(folder, items, depth)),
      ...sortedFiles.map((file, index) => {
        // Add a unique key with prefix and index for extra uniqueness
        return (
          <React.Fragment key={`tree-file-${file.id}-${depth}-${index}`}>
            {renderFile(file, depth)}
          </React.Fragment>
        );
      })
    ];
  };
  
  // Keep track of processed folder IDs to prevent circular references
  const processedFolderIds = new Set();
  
  const renderFolder = (folder, allItems, depth) => {
    const isExpanded = expandedFolders[folder.id];
    
    // Safety check: prevent circular references
    if (processedFolderIds.has(folder.id)) {
      console.warn(`Circular reference detected for folder: ${folder.name}`);
      return null;
    }
    
    // Add folder ID to processed set for this render cycle
    processedFolderIds.add(folder.id);
    
    const result = (
      <React.Fragment key={folder.id}>
        <FileItem 
          depth={depth} 
          onClick={() => toggleFolder(folder.id)}
          onContextMenu={(e) => handleContextMenu(e, folder)}
        >
          <FolderExpander>
            {isExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
          </FolderExpander>
          <Icon>
            {isExpanded ? <FaFolderOpen color="#e8b417" /> : <FaFolder color="#e8b417" />}
          </Icon>
          <FileName>{folder.name}</FileName>
          <ItemActions className="actions">
            <span onClick={(e) => {
              e.stopPropagation();
              setNewItemType('file');
              setNewItemParent(folder.id);
            }}>
              <FaPlus size={12} style={{ marginRight: '0.5rem' }} />
            </span>
            <span onClick={(e) => {
              e.stopPropagation();
              handleContextMenu(e, folder);
            }}>
              <FaEllipsisH size={12} />
            </span>
          </ItemActions>
        </FileItem>
        
        {isExpanded && (
          <>
            {renderNewItemInput(folder.id, depth)}
            {organizeFileTree(allItems, folder.id, depth + 1)}
          </>
        )}
      </React.Fragment>
    );
    
    // Remove folder ID from processed set after this branch is rendered
    processedFolderIds.delete(folder.id);
    
    return result;
  };
  
  const renderFile = (file, depth) => {
    return (
      <FileItem 
        depth={depth}
        isActive={currentFile?.id === file.id}
        onClick={() => handleFileClick(file)}
        onContextMenu={(e) => handleContextMenu(e, file)}
      >
        <FolderExpander />
        <Icon>{getFileIcon(file.name)}</Icon>
        <FileName>{file.name}</FileName>
        <ItemActions className="actions">
          <span onClick={(e) => {
            e.stopPropagation();
            handleContextMenu(e, file);
          }}>
            <FaEllipsisH size={12} />
          </span>
        </ItemActions>
      </FileItem>
    );
  };
  
  const renderContextMenu = () => {
    if (!contextMenu) return null;
    
    const { x, y, item } = contextMenu;
    const isFolder = item.type === 'folder';
    
    return (
      <ContextMenu style={{ top: y, left: x }}>
        {isFolder && (
          <>
            <ContextMenuItem 
              onClick={() => {
                setNewItemType('file');
                setNewItemParent(item.id);
                setContextMenu(null);
              }}
            >
              New File
            </ContextMenuItem>
            <ContextMenuItem 
              onClick={() => {
                setNewItemType('folder');
                setNewItemParent(item.id);
                setContextMenu(null);
              }}
            >
              New Folder
            </ContextMenuItem>
          </>
        )}
        <ContextMenuItem 
          onClick={() => {
            const newName = prompt('Enter new name:', item.name);
            if (newName && newName !== item.name) {
              updateFile(item.id, { name: newName });
            }
            setContextMenu(null);
          }}
        >
          Rename
        </ContextMenuItem>
        <ContextMenuItem 
          onClick={() => {
            if (window.confirm(`Are you sure you want to delete ${item.name}?`)) {
              removeFile(item.id);
            }
            setContextMenu(null);
          }}
        >
          Delete
        </ContextMenuItem>
      </ContextMenu>
    );
  };
  
  return (
    <TreeContainer>
      <TreeHeader>
        <span>EXPLORER</span>
      </TreeHeader>
      
      <SearchBar>
        <FaSearch size={14} />
        <input 
          type="text" 
          placeholder="Search files..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </SearchBar>
      
      <ActionsBar>
        <button onClick={() => {
          setNewItemType('file');
          setNewItemParent(null);
        }}>
          <FaPlus size={12} style={{ marginRight: '0.3rem' }} /> File
        </button>
        <button onClick={() => {
          setNewItemType('folder');
          setNewItemParent(null);
        }}>
          <FaPlus size={12} style={{ marginRight: '0.3rem' }} /> Folder
        </button>
      </ActionsBar>
      
      <FileList>
        {renderNewItemInput(null, 0)}
        {organizeFileTree(getFilteredFiles())}
        
        {recentFiles.length > 0 && (
          <>
            <SectionTitle>RECENT FILES</SectionTitle>
            {recentFiles.map(file => (
              <FileItem 
                key={`recent-${file.id}`}
                depth={0}
                isActive={currentFile?.id === file.id}
                onClick={() => handleFileClick(file)}
              >
                <FolderExpander />
                <Icon>{getFileIcon(file.name)}</Icon>
                <FileName>{file.name}</FileName>
              </FileItem>
            ))}
          </>
        )}
      </FileList>
      
      {renderContextMenu()}
    </TreeContainer>
  );
};

export default FileTree; 