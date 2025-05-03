import * as Y from 'yjs';
import * as monaco from 'monaco-editor';

/**
 * A binding that syncs a Monaco editor with a YText.
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

    // Set up Monaco change handler
    this._monacoDisposable = this.model.onDidChangeContent(this._monacoChangeHandler);

    // Set up Y.Text observer
    this.ytext.observe(this._ytextObserver);

    // Initial sync from Y.Text to Monaco
    this._ytextObserver();
  }

  /**
   * @param {monaco.editor.IModelContentChangedEvent} event
   */
  _monacoChangeHandler(event) {
    // Skip if this change originated from a Y.Text observer update
    if (this._muxMonacoChanges) return;

    // Apply changes to Y.Text
    this._muxYChanges = true;
    const delta = event.changes;
    let index = 0;

    delta.forEach(change => {
      index = change.rangeOffset;
      if (change.rangeLength > 0) {
        this.ytext.delete(index, change.rangeLength);
      }
      if (change.text.length > 0) {
        this.ytext.insert(index, change.text);
      }
    });

    this._muxYChanges = false;
  }

  /**
   * @param {Y.YTextEvent} event
   */
  _ytextObserver(event) {
    if (this._muxYChanges) return;
    this._muxMonacoChanges = true;

    // Get the current Monaco model value
    const currentContent = this.model.getValue();
    // Get the current Y.Text value
    const newContent = this.ytext.toString();

    // Update Monaco model if content differs
    if (currentContent !== newContent) {
      this.model.setValue(newContent);
    }

    // Handle awareness (cursor positions, etc.)
    if (this.awareness && event) {
      // Update awareness if available (simplified)
      const awarenessStates = this.awareness.getStates();
      // This is a simplified version - real implementation would handle
      // rendering cursors and selections for different users
    }

    this._muxMonacoChanges = false;
  }

  destroy() {
    this._monacoDisposable.dispose();
    this.ytext.unobserve(this._ytextObserver);
  }
} 