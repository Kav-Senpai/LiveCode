import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import { useStore } from '../store/useStore';
import { FaPlay, FaSync, FaExpand, FaCompress, FaExternalLinkAlt } from 'react-icons/fa';

const PreviewContainer = styled.div`
  display: ${props => props.visible ? 'flex' : 'none'};
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
  border-left: 1px solid #333;
`;

const PreviewHeader = styled.div`
  padding: 0.5rem;
  background: #252526;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const PreviewTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: #fff;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.25rem;
`;

const ActionButton = styled.button`
  background: #3a3a3a;
  border: none;
  border-radius: 4px;
  color: #ccc;
  padding: 0.25rem 0.5rem;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  
  &:hover {
    background: #4a4a4a;
    color: #fff;
  }
  
  &:disabled {
    background: #333;
    color: #666;
    cursor: not-allowed;
  }
`;

const IframeContainer = styled.div`
  flex: 1;
  position: relative;
  background: white;
`;

const StyledIframe = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;
  background: white;
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
  
  h3 {
    margin-bottom: 1rem;
    font-weight: normal;
  }
  
  button {
    margin-top: 1rem;
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
`;

const Preview = ({ visible = true }) => {
  const { currentFile, files } = useStore();
  const [previewContent, setPreviewContent] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const iframeRef = useRef(null);
  const contentRef = useRef(currentFile?.content);

  const isPreviewable = (file) => {
    if (!file) return false;
    
    // Check if it's an HTML file
    if (file.name.endsWith('.html')) return true;
    
    // Check if it's a JS file that has HTML content
    if (file.name.endsWith('.js') || file.name.endsWith('.jsx')) {
      return file.content.includes('<html') || file.content.includes('<body') || file.content.includes('<div');
    }
    
    return false;
  };
  
  const findLinkedFiles = (htmlContent) => {
    const cssLinks = [];
    const jsLinks = [];
    
    // Find CSS links
    const cssRegex = /<link[^>]*href=["']([^"']+\.css)["'][^>]*>/g;
    let cssMatch;
    while ((cssMatch = cssRegex.exec(htmlContent)) !== null) {
      cssLinks.push(cssMatch[1]);
    }
    
    // Find JS links
    const jsRegex = /<script[^>]*src=["']([^"']+\.js)["'][^>]*>/g;
    let jsMatch;
    while ((jsMatch = jsRegex.exec(htmlContent)) !== null) {
      jsLinks.push(jsMatch[1]);
    }
    
    return { cssLinks, jsLinks };
  };
  
  const getFileContent = (filename) => {
    const file = files.find(f => f.name === filename || f.name.endsWith(`/${filename}`));
    return file ? file.content : '';
  };
  
  const generatePreview = () => {
    if (!currentFile || !isPreviewable(currentFile)) {
      setPreviewContent('');
      return;
    }
    
    let htmlContent = '';
    
    // Handle HTML file
    if (currentFile.name.endsWith('.html')) {
      htmlContent = currentFile.content;
    } 
    // Handle JS file with HTML content
    else if (currentFile.name.endsWith('.js') || currentFile.name.endsWith('.jsx')) {
      // Extract HTML content or create a wrapper
      if (currentFile.content.includes('<html')) {
        htmlContent = currentFile.content;
      } else {
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Preview</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
                padding: 20px;
              }
            </style>
          </head>
          <body>
            <div id="root">${currentFile.content}</div>
            <script>
              // Inline JS
              ${currentFile.content.includes('function') || currentFile.content.includes('const ') 
                ? currentFile.content 
                : ''}
            </script>
          </body>
          </html>
        `;
      }
    }
    
    // Find and include linked files
    if (htmlContent) {
      const { cssLinks, jsLinks } = findLinkedFiles(htmlContent);
      
      // Replace CSS links with inline styles
      cssLinks.forEach(cssLink => {
        const cssContent = getFileContent(cssLink);
        if (cssContent) {
          htmlContent = htmlContent.replace(
            `<link href="${cssLink}" rel="stylesheet">`,
            `<style>${cssContent}</style>`
          );
        }
      });
      
      // Replace JS links with inline scripts
      jsLinks.forEach(jsLink => {
        const jsContent = getFileContent(jsLink);
        if (jsContent) {
          htmlContent = htmlContent.replace(
            `<script src="${jsLink}"></script>`,
            `<script>${jsContent}</script>`
          );
        }
      });
      
      setPreviewContent(htmlContent);
    }
  };
  
  // Generate preview when current file changes
  useEffect(() => {
    if (autoRefresh || contentRef.current !== currentFile?.content) {
      generatePreview();
      contentRef.current = currentFile?.content;
    }
  }, [currentFile, autoRefresh, files]);
  
  const refreshPreview = () => {
    generatePreview();
    
    // Reload iframe to clear any previous state
    if (iframeRef.current) {
      try {
        iframeRef.current.contentWindow.location.reload();
      } catch (e) {
        console.error('Failed to reload iframe:', e);
      }
    }
  };
  
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  const openInNewTab = () => {
    const newWindow = window.open("", "_blank");
    newWindow.document.write(previewContent);
    newWindow.document.close();
  };
  
  if (!visible) return null;
  
  return (
    <PreviewContainer visible={visible} style={{ width: isFullscreen ? '100%' : '35%' }}>
      <PreviewHeader>
        <PreviewTitle>
          <FaPlay />
          <span>Preview</span>
          {currentFile && <small style={{ marginLeft: 8, color: '#888' }}>{currentFile.name}</small>}
        </PreviewTitle>
        
        <ButtonGroup>
          <ActionButton onClick={() => setAutoRefresh(!autoRefresh)} title={autoRefresh ? 'Auto-refresh is on' : 'Auto-refresh is off'}>
            {autoRefresh ? 'Auto' : 'Manual'}
          </ActionButton>
          
          <ActionButton onClick={refreshPreview} title="Refresh preview">
            <FaSync size={12} />
          </ActionButton>
          
          <ActionButton onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen mode'}>
            {isFullscreen ? <FaCompress size={12} /> : <FaExpand size={12} />}
          </ActionButton>
          
          <ActionButton onClick={openInNewTab} title="Open in new tab">
            <FaExternalLinkAlt size={12} />
          </ActionButton>
        </ButtonGroup>
      </PreviewHeader>
      
      <IframeContainer>
        {previewContent ? (
          <StyledIframe 
            ref={iframeRef}
            title="Code Preview" 
            srcDoc={previewContent}
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <EmptyState>
            <h3>No preview available</h3>
            <p>Select an HTML file or a file containing HTML content to see a preview.</p>
            {currentFile && !isPreviewable(currentFile) && (
              <button onClick={refreshPreview}>
                Force Preview
              </button>
            )}
          </EmptyState>
        )}
      </IframeContainer>
    </PreviewContainer>
  );
};

export default Preview; 