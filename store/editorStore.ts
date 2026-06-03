import { create } from 'zustand';

interface EditorState {
  code: string;
  language: string;
  viewerCount: number;
  cursorPosition: { lineNumber: number; column: number };
  createdAt: string | null;
  setCode: (code: string) => void;
  setLanguage: (lang: string) => void;
  setViewerCount: (n: number) => void;
  setCursorPosition: (pos: { lineNumber: number; column: number }) => void;
  setCreatedAt: (date: string) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  code: '',
  language: 'javascript',
  viewerCount: 1,
  cursorPosition: { lineNumber: 1, column: 1 },
  createdAt: null,
  setCode: (code) => set({ code }),
  setLanguage: (language) => set({ language }),
  setViewerCount: (viewerCount) => set({ viewerCount }),
  setCursorPosition: (cursorPosition) => set({ cursorPosition }),
  setCreatedAt: (createdAt) => set({ createdAt }),
}));
