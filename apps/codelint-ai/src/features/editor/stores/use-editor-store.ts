import { create } from 'zustand';
import { supabase, isChatSyncEnabled } from '@/lib/supabase';
import { logUsageAction } from '@/lib/usage-actions';

export type EditorLanguage = 'javascript' | 'typescript' | 'json' | 'xml' | 'rust' | 'sql' | 'python' | 'cpp' | 'html' | 'css' | 'java' | 'php';
export type HistoryActionType = 'analysis' | 'refactor_apply' | 'revert';

export interface CodeHistoryEntry {
  id: string;
  timestamp: number;
  action: HistoryActionType;
  skill?: string;
  language: EditorLanguage;
  summary: string;
  beforeCode: string;
  afterCode: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSession {
  id: string;
  title: string;
  timestamp: number;
  messages: ChatMessage[];
}

interface EditorState {
  code: string;
  language: EditorLanguage;
  skill: string;
  isAnalyzing: boolean;
  analysisResult: any | null;
  history: CodeHistoryEntry[];
  autoSave: boolean;
  
  chatSessions: ChatSession[];
  currentChatSessionId: string | null;
  
  setCode: (code: string) => void;
  setLanguage: (lang: EditorLanguage) => void;
  setSkill: (skill: string) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  setAnalysisResult: (result: any) => void;
  addToHistory: (code: string) => void;
  addHistoryEntry: (entry: Omit<CodeHistoryEntry, 'id' | 'timestamp'>) => void;
  revertToHistoryEntry: (entryId: string) => void;
  setAutoSave: (autoSave: boolean) => void;
  
  addChatSession: (session: ChatSession) => void;
  updateChatSession: (id: string, messages: ChatMessage[]) => void;
  setCurrentChatSessionId: (id: string | null) => void;
  deleteChatSession: (id: string) => void;
  loadSessionsFromSupabase: () => Promise<void>;
}

export const useEditorStore = create<EditorState>((set) => ({
  code: '// Dán code của bạn vào đây để bắt đầu phân tích...',
  language: 'typescript',
  skill: 'refactoring',
  isAnalyzing: false,
  analysisResult: null,
  history: [],
  autoSave: false,
  chatSessions: [],
  currentChatSessionId: null,

  setCode: (code) => set({ code }),
  setLanguage: (language) => set({ language }),
  setSkill: (skill) => set({ skill }),
  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setAnalysisResult: (analysisResult) => set({ analysisResult }),
  addToHistory: (code) => set((state) => ({
    history: [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
        action: 'analysis',
        skill: state.skill,
        language: state.language,
        summary: 'Legacy analysis snapshot',
        beforeCode: code,
        afterCode: code,
      },
      ...state.history,
    ].slice(0, 50)
  })),
  addHistoryEntry: (entry) => set((state) => ({
    history: [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
        ...entry,
      },
      ...state.history,
    ].slice(0, 50),
  })),
  revertToHistoryEntry: (entryId) => set((state) => {
    const target = state.history.find((item) => item.id === entryId);
    if (!target) return state;

    const currentCode = state.code;
    const revertedCode = target.beforeCode;

    const revertEntry: CodeHistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      action: 'revert',
      skill: state.skill,
      language: state.language,
      summary: `Reverted ${target.action} change`,
      beforeCode: currentCode,
      afterCode: revertedCode,
    };

    return {
      code: revertedCode,
      history: [revertEntry, ...state.history].slice(0, 50),
    };
  }),
  setAutoSave: (autoSave) => set({ autoSave }),
  
  addChatSession: async (session) => {
    set((state) => ({
      chatSessions: [session, ...state.chatSessions]
    }));
    if (!isChatSyncEnabled) return;
    try {
      await supabase.from('chat_sessions').insert([session]);
      void logUsageAction({
        actionName: 'chat_session_created',
        actionSource: 'editor_store',
        sessionId: session.id,
        metadata: {
          title: session.title,
          messageCount: session.messages.length,
        },
      });
    } catch (e: any) {
      // Suppress table-not-found errors during development
      if (e?.code === 'PGRST205') {
        console.debug('chat_sessions table not set up yet.');
        return;
      }
      console.warn('Supabase not available: chat session will only be saved locally', e);
    }
  },
  updateChatSession: async (id, messages) => {
    set((state) => ({
      chatSessions: state.chatSessions.map(session => 
        session.id === id ? { ...session, messages } : session
      )
    }));
    if (!isChatSyncEnabled) return;
    try {
      await supabase.from('chat_sessions').update({ messages }).eq('id', id);
      void logUsageAction({
        actionName: 'chat_session_updated',
        actionSource: 'editor_store',
        sessionId: id,
        metadata: {
          messageCount: messages.length,
        },
      });
    } catch (e: any) {
      if (e?.code === 'PGRST205') {
        console.debug('chat_sessions table not set up yet.');
        return;
      }
      console.warn('Supabase not available: chat session will only be saved locally', e);
    }
  },
  setCurrentChatSessionId: (id) => set({ currentChatSessionId: id }),
  deleteChatSession: async (id) => {
    set((state) => ({
      chatSessions: state.chatSessions.filter(session => session.id !== id),
      currentChatSessionId: state.currentChatSessionId === id ? null : state.currentChatSessionId
    }));
    if (!isChatSyncEnabled) return;
    try {
      await supabase.from('chat_sessions').delete().eq('id', id);
      void logUsageAction({
        actionName: 'chat_session_deleted',
        actionSource: 'editor_store',
        sessionId: id,
      });
    } catch (e: any) {
      if (e?.code === 'PGRST205') {
        console.debug('chat_sessions table not set up yet.');
        return;
      }
      console.warn('Supabase not available: chat session will only be deleted locally', e);
    }
  },
  loadSessionsFromSupabase: async () => {
    if (!isChatSyncEnabled) {
      console.debug('Chat sync disabled: skipping Supabase requests');
      return;
    }
    try {
      const { data, error } = await supabase.from('chat_sessions').select('*').order('timestamp', { ascending: false });
      if (error) {
        // Suppress table-not-found errors during development
        if (error.code === 'PGRST205') {
          console.debug('chat_sessions table not set up yet. See DATABASE_SETUP.md for setup instructions.');
          return;
        }
        console.warn('Supabase error loading chat sessions:', error);
        return;
      }
      if (data) {
        set({ chatSessions: data as ChatSession[] });
        void logUsageAction({
          actionName: 'chat_sessions_loaded',
          actionSource: 'editor_store',
          metadata: {
            totalSessions: data.length,
          },
        });
      }
    } catch (e) {
      console.warn('Failed to load chat sessions from Supabase:', e);
    }
  },
}));
