import { create } from 'zustand';

export interface EditorFile {
  name: string;
  code: string;
  language: string;
}

interface EditorState {
  code: string;
  language: string;
  viewerCount: number;
  cursorPosition: { lineNumber: number; column: number };
  createdAt: string | null;
  files: EditorFile[];
  activeFileIndex: number;
  setCode: (code: string) => void;
  setLanguage: (lang: string) => void;
  setViewerCount: (n: number) => void;
  setCursorPosition: (pos: { lineNumber: number; column: number }) => void;
  setCreatedAt: (date: string) => void;
  setFiles: (files: EditorFile[]) => void;
  setActiveFileIndex: (index: number) => void;
  addFile: (name: string, code?: string, language?: string) => void;
  deleteFile: (index: number) => void;
  renameFile: (index: number, newName: string) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  code: '',
  language: 'javascript',
  viewerCount: 1,
  cursorPosition: { lineNumber: 1, column: 1 },
  createdAt: null,
  files: [],
  activeFileIndex: 0,
  setCode: (code) => {
    const { files, activeFileIndex } = get();
    if (files.length > 0 && files[activeFileIndex]) {
      const updatedFiles = [...files];
      updatedFiles[activeFileIndex] = { ...updatedFiles[activeFileIndex], code };
      set({ files: updatedFiles, code });
    } else {
      set({ code });
    }
  },
  setLanguage: (language) => {
    const { files, activeFileIndex } = get();
    if (files.length > 0 && files[activeFileIndex]) {
      const updatedFiles = [...files];
      updatedFiles[activeFileIndex] = { ...updatedFiles[activeFileIndex], language };
      set({ files: updatedFiles, language });
    } else {
      set({ language });
    }
  },
  setViewerCount: (viewerCount) => set({ viewerCount }),
  setCursorPosition: (cursorPosition) => set({ cursorPosition }),
  setCreatedAt: (createdAt) => set({ createdAt }),
  setFiles: (files) => {
    const activeIdx = get().activeFileIndex;
    const safeIdx = activeIdx < files.length ? activeIdx : 0;
    const activeFile = files[safeIdx];
    set({
      files,
      activeFileIndex: safeIdx,
      code: activeFile ? activeFile.code : '',
      language: activeFile ? activeFile.language : 'javascript',
    });
  },
  setActiveFileIndex: (index) => {
    const { files } = get();
    if (index >= 0 && index < files.length) {
      const activeFile = files[index];
      set({
        activeFileIndex: index,
        code: activeFile.code,
        language: activeFile.language,
      });
    }
  },
  addFile: (name, fileCode = '', fileLang = 'javascript') => {
    const { files } = get();
    // Prevent duplicates
    if (files.some((f) => f.name === name)) return;
    const newFile: EditorFile = { name, code: fileCode, language: fileLang };
    const updatedFiles = [...files, newFile];
    const newIndex = updatedFiles.length - 1;
    set({
      files: updatedFiles,
      activeFileIndex: newIndex,
      code: fileCode,
      language: fileLang,
    });
  },
  deleteFile: (index) => {
    const { files, activeFileIndex } = get();
    if (files.length <= 1) return; // Must keep at least one file
    const updatedFiles = files.filter((_, i) => i !== index);
    let newIndex = activeFileIndex;
    if (activeFileIndex >= updatedFiles.length) {
      newIndex = updatedFiles.length - 1;
    }
    const activeFile = updatedFiles[newIndex];
    set({
      files: updatedFiles,
      activeFileIndex: newIndex,
      code: activeFile ? activeFile.code : '',
      language: activeFile ? activeFile.language : 'javascript',
    });
  },
  renameFile: (index, newName) => {
    const { files } = get();
    if (!newName.trim() || files.some((f, i) => i !== index && f.name === newName)) return;
    const updatedFiles = [...files];
    updatedFiles[index] = { ...updatedFiles[index], name: newName };
    set({ files: updatedFiles });
  },
}));
