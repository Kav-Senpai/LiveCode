import * as Y from 'yjs';
import * as monaco from 'monaco-editor';

/**
 * Enhanced binding that syncs a Monaco editor with a YText for Figma-like collaboration
 */
export class MonacoBinding {
  /**
   * @param {Y.Text} ytext
   * @param {monaco.editor.ITextModel} model
   * @param {Set<monaco.editor.IStandaloneCodeEditor>} editors
   * @param {any} [awareness]
   */
  constructor(ytext, model, editors, awareness) {
    this.ytext = ytext;
    this.model = model;
    this.editors = editors;
    this.awareness = awareness;
    this._monacoChangeHandler = this._monacoChangeHandler.bind(this);
    this._ytextObserver = this._ytextObserver.bind(this);
    this._isApplyingRemoteChanges = false;
    this._pendingRemoteChanges = [];
    this._animationFrameRequest = null;
    this._isLocalChange = false;

    // Set up Monaco change handler
    this._monacoDisposable = this.model.onDidChangeContent(this._monacoChangeHandler);

    // Set up Y.Text observer
    this.ytext.observe(this._ytextObserver);

    // Initial sync from Y.Text to Monaco
    this._ytextObserver();
    
    // Highlight changes when they come in
    if (this.awareness) {
      this.awareness.on('change', this._handleAwarenessChange.bind(this));
    }
  }

  /**
   * Handle awareness changes for presence features
   */
  _handleAwarenessChange() {
    // Implementation for handling awareness updates
    // This is handled in the Editor.jsx component
  }

  /**
   * Handle changes made in Monaco editor and apply to Y.Text
   */
  _monacoChangeHandler(event) {
    try {
      // Don't apply changes from Yjs
      if (this._isApplyingRemoteChanges) {
        return;
      }

      this._isLocalChange = true;
      
      // Apply the changes from Monaco to Yjs
      this.ytext.doc.transact(() => {
        try {
          event.changes.forEach(change => {
            const startPos = change.rangeOffset;
            const delLength = change.rangeLength;
            
            if (delLength > 0) {
              this.ytext.delete(startPos, delLength);
            }
            
            if (change.text.length > 0) {
              this.ytext.insert(startPos, change.text);
            }
          });
        } catch (err) {
          console.error('Error applying monaco changes to Yjs:', err);
        }
      }, this);
      
      this._isLocalChange = false;
    } catch (err) {
      console.error('Error in monaco change handler:', err);
      this._isLocalChange = false;
    }
  }

  /**
   * Handle changes from Y.Text and apply to Monaco with smoother animations
   */
  _ytextObserver(event) {
    try {
      if (this._isLocalChange) {
        return; // Skip if change came from local editor
      }

      this._isApplyingRemoteChanges = true;
      
      // Accumulate changes and apply in batch on next animation frame
      if (event) {
        this._pendingRemoteChanges.push(event);
        
        // Schedule application of changes
        if (!this._animationFrameRequest) {
          this._animationFrameRequest = requestAnimationFrame(() => {
            try {
              this._applyPendingChanges();
            } catch (err) {
              console.error('Error applying pending changes:', err);
            }
            this._animationFrameRequest = null;
          });
        }
      } else {
        // Initial sync - apply immediately
        try {
          const text = this.ytext.toString();
          this.model.setValue(text);
        } catch (err) {
          console.error('Error in initial sync:', err);
        }
      }

      this._isApplyingRemoteChanges = false;
    } catch (err) {
      console.error('Error in ytext observer:', err);
      this._isApplyingRemoteChanges = false;
    }
  }
  
  /**
   * Apply accumulated changes from Y.Text to Monaco
   */
  _applyPendingChanges() {
    try {
      if (this._pendingRemoteChanges.length === 0) return;
      
      const edits = [];
      
      // Process all pending events
      this._pendingRemoteChanges.forEach(event => {
        try {
          event.delta.forEach(delta => {
            if (delta.retain) {
              // Just skip retained content
            } else if (delta.insert) {
              const text = delta.insert;
              const pos = this.model.getPositionAt(event.index);
              
              edits.push({
                range: new monaco.Range(
                  pos.lineNumber,
                  pos.column,
                  pos.lineNumber,
                  pos.column
                ),
                text: text,
                forceMoveMarkers: true
              });
            } else if (delta.delete) {
              const pos = this.model.getPositionAt(event.index);
              const endPos = this.model.getPositionAt(event.index + delta.delete);
              
              edits.push({
                range: new monaco.Range(
                  pos.lineNumber,
                  pos.column,
                  endPos.lineNumber,
                  endPos.column
                ),
                text: '',
                forceMoveMarkers: true
              });
            }
          });
        } catch (err) {
          console.error('Error processing delta in change:', err);
        }
      });
      
      // Apply all edits in one operation for better performance
      if (edits.length > 0) {
        try {
          this.model.pushEditOperations([], edits, () => null);
          
          // Apply highlight effect to show where changes occurred
          this._highlightChanges(edits);
        } catch (err) {
          console.error('Error applying edits to model:', err);
        }
      }
      
      // Clear pending changes
      this._pendingRemoteChanges = [];
    } catch (err) {
      console.error('Error applying pending changes:', err);
      this._pendingRemoteChanges = [];
    }
  }
  
  /**
   * Highlight areas where changes occurred with a subtle animation
   */
  _highlightChanges(edits) {
    // Only do this if we have editor instances
    if (this.editors.size === 0) return;
    
    const editor = this.editors.values().next().value;
    const decorations = [];
    
    edits.forEach(edit => {
      if (edit.text) { // For insertions
        decorations.push({
          range: edit.range,
          options: {
            className: 'yjs-remote-insert',
            isWholeLine: false
          }
        });
      }
    });
    
    if (decorations.length > 0) {
      const decorationIds = editor.deltaDecorations([], decorations);
      
      // Remove decorations after animation completes
      setTimeout(() => {
        editor.deltaDecorations(decorationIds, []);
      }, 1000);
    }
  }

  /**
   * Destroy this binding and clean up resources
   */
  destroy() {
    this.ytext.unobserve(this._ytextObserver);
    this._monacoDisposable.dispose();
    
    if (this._animationFrameRequest) {
      cancelAnimationFrame(this._animationFrameRequest);
    }
    
    if (this.awareness) {
      this.awareness.off('change', this._handleAwarenessChange);
    }
  }
} 