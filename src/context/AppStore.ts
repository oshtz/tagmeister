import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile, readDir, exists, create as createFs } from '@tauri-apps/plugin-fs';
import { basename, extname, dirname, join, sep } from '@tauri-apps/api/path';
import { appDataDir } from '@tauri-apps/api/path';
import { DEFAULT_SYSTEM_PROMPTS, SystemPromptDefinition, getAllSystemPrompts, getSystemPromptByName } from '../utils/systemPrompts';

// Define a type for our file entries
type FileInfo = {
  path: string;
  name: string;
};

type ProviderModel = {
  id: string;
  name: string;
};

export type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'lmstudio' | 'ollama';
type ProviderToggleState = Record<ProviderId, boolean>;

const createDefaultProviderState = (): ProviderToggleState => ({
  openai: true,
  anthropic: true,
  gemini: true,
  openrouter: true,
  lmstudio: true,
  ollama: true,
});

const resolveProviderState = (stored?: Partial<ProviderToggleState>): ProviderToggleState => {
  const defaults = createDefaultProviderState();
  if (!stored) {
    return defaults;
  }
  return {
    openai: stored.openai !== false,
    anthropic: stored.anthropic !== false,
    gemini: stored.gemini !== false,
    openrouter: stored.openrouter !== false,
    lmstudio: stored.lmstudio !== false,
    ollama: stored.ollama !== false,
  };
};

const OPENAI_VISION_MODEL_HINTS = ['gpt-4o', 'gpt-4.1', 'omni', 'o1'];
const GEMINI_VISION_MODEL_HINTS = ['gemini-1.5', 'gemini-pro-vision'];

const dedupeModels = (models: ProviderModel[]): ProviderModel[] => {
  const seen = new Set<string>();
  return models.filter(model => {
    if (seen.has(model.id)) {
      return false;
    }
    seen.add(model.id);
    return true;
  });
};

interface Caption {
  [key: string]: string;
}

interface AppState {
  directorySelectionError: string | null;
  // Directory and image selection
  currentDirectory: string | null;
  selectedImage: string | null;
  lastSelectedImage: string | null;
  selectedImages: Set<string>;
  imageFiles: FileInfo[];
  
  // Captions
  captions: Caption;
  
  // Settings
  apiKey: string; // OpenAI API key
  apiKeyVisible: boolean;
  anthropicApiKey: string; // Anthropic API key
  anthropicApiKeyVisible: boolean;
  openRouterApiKey: string;
  openRouterApiKeyVisible: boolean;
  geminiApiKey: string;
  geminiApiKeyVisible: boolean;
  prefixText: string;
  suffixText: string;
  enabledProviders: ProviderToggleState;
  selectedModel: string;
  selectedPromptStyle: string;
  isDarkMode: boolean;
  fontSize: number;
  leftPanelWidth: number;
  rightPanelWidth: number;
  customSystemPrompts: SystemPromptDefinition[];
  getSystemPromptOptions: () => SystemPromptDefinition[];
  getSystemPromptText: (name: string) => string;
  saveCustomSystemPrompt: (prompt: { name: string; description?: string; text: string; originalName?: string }) => void;
  deleteCustomSystemPrompt: (name: string) => void;

  // LM Studio integration
  lmStudioBaseUrl: string;
  lmStudioAvailable: boolean;
  lmStudioModels: ProviderModel[];

  // Ollama integration
  ollamaBaseUrl: string;
  ollamaAvailable: boolean;
  ollamaModels: ProviderModel[];

  // Remote model catalogs
  openAiModels: ProviderModel[];
  anthropicModels: ProviderModel[];
  geminiModels: ProviderModel[];
  openRouterModels: ProviderModel[];
  pinnedModels: string[];

  // Processing state
  isInitialized: boolean;
  isProcessing: boolean;
  processedCount: number;
  totalToProcess: number;
  shouldInterrupt: boolean;
  // UI state
  isLoadingImages: boolean;
  
  // Actions
  toggleApiKeyVisibility: () => void;
  toggleAnthropicApiKeyVisibility: () => void;
  toggleOpenRouterApiKeyVisibility: () => void;
  toggleGeminiApiKeyVisibility: () => void;
  setProcessingState: (isProcessing: boolean, total?: number) => void;
  incrementProcessedCount: () => void;
  setShouldInterrupt: (shouldInterrupt: boolean) => void;
  checkShouldInterrupt: (reset?: boolean) => boolean;
  initialize: () => Promise<void>;
  toggleImageSelection: (path: string) => void;
  clearImageSelection: () => void;
  setSelectedImage: (path: string) => void;
  setApiKey: (key: string) => void;
  setAnthropicApiKey: (key: string) => void;
  setOpenRouterApiKey: (key: string) => void;
  setGeminiApiKey: (key: string) => void;
  setCurrentDirectory: (path: string) => Promise<void>;
  toggleTheme: () => void;
  setModel: (model: string) => void;
  getProviderForModel: (model: string) => 'openai' | 'anthropic' | 'lmstudio' | 'ollama' | 'openrouter' | 'gemini';
  setFontSize: (size: number) => void;
  adjustFontSize: (adjustment: number) => void;
  selectAll: () => void;
  handleImageClick: (path: string, options: { isCtrlPressed?: boolean, isShiftPressed?: boolean }) => void;
  setPromptStyle: (style: string) => void;
  updateCaption: (imagePath: string, caption: string) => void;
  saveCaption: (imagePath: string, caption: string) => Promise<void>;
  selectDirectory: () => Promise<void>;
  setPanelWidth: (panel: 'left' | 'right', width: number) => void;
  setProviderEnabled: (provider: ProviderId, enabled: boolean) => void;

  // LM Studio actions
  setLMStudioBaseUrl: (url: string) => void;
  checkLMStudioConnection: () => Promise<boolean>;
  fetchLMStudioModels: () => Promise<void>;

  // Ollama actions
  setOllamaBaseUrl: (url: string) => void;
  checkOllamaConnection: () => Promise<boolean>;
  fetchOllamaModels: () => Promise<void>;

  // Remote model actions
  fetchOpenAIModels: () => Promise<void>;
  fetchAnthropicModels: () => Promise<void>;
  fetchGeminiModels: () => Promise<void>;
  fetchOpenRouterModels: () => Promise<void>;
  togglePinnedModel: (modelId: string) => void;
  
  // Helper methods
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  loadImagesFromDirectory: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  directorySelectionError: null,
  currentDirectory: null,
  selectedImage: null,
  lastSelectedImage: null,
  selectedImages: new Set(),
  imageFiles: [],
  captions: {},
  apiKey: '',
  apiKeyVisible: false,
  anthropicApiKey: '',
  anthropicApiKeyVisible: false,
  openRouterApiKey: '',
  openRouterApiKeyVisible: false,
  geminiApiKey: '',
  geminiApiKeyVisible: false,
  prefixText: '',
  suffixText: '',
  enabledProviders: createDefaultProviderState(),
  selectedModel: 'gpt-4o-mini',
  selectedPromptStyle: 'FLUX (Natural Language)',
  isDarkMode: true,
  fontSize: 14.0,
  leftPanelWidth: 0.2,
  rightPanelWidth: 0.2,
  customSystemPrompts: [],
  // LM Studio
  lmStudioBaseUrl: 'http://localhost:1234/v1',
  lmStudioAvailable: false,
  lmStudioModels: [],

  // Ollama
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaAvailable: false,
  ollamaModels: [],

  // Remote models & pinned list
  openAiModels: [],
  anthropicModels: [],
  geminiModels: [],
  openRouterModels: [],
  pinnedModels: [],

  isInitialized: false,
  isProcessing: false,
  processedCount: 0,
  totalToProcess: 0,
  shouldInterrupt: false,
  isLoadingImages: false,
  
  // Actions
  toggleApiKeyVisibility: () => set(state => ({ apiKeyVisible: !state.apiKeyVisible })),
  toggleAnthropicApiKeyVisibility: () => set(state => ({ anthropicApiKeyVisible: !state.anthropicApiKeyVisible })),
  toggleOpenRouterApiKeyVisibility: () => set(state => ({ openRouterApiKeyVisible: !state.openRouterApiKeyVisible })),
  toggleGeminiApiKeyVisibility: () => set(state => ({ geminiApiKeyVisible: !state.geminiApiKeyVisible })),
  
  setProcessingState: (isProcessing, total = 0) => set({
    isProcessing,
    totalToProcess: total,
    processedCount: 0
  }),
  
  incrementProcessedCount: () => set(state => ({ 
    processedCount: state.processedCount + 1 
  })),
  
  setShouldInterrupt: (shouldInterrupt) => set({ shouldInterrupt }),
  
  checkShouldInterrupt: (reset = false) => {
    const shouldInterrupt = get().shouldInterrupt;
    if (reset && shouldInterrupt) {
      set({ shouldInterrupt: false });
    }
    return shouldInterrupt;
  },
  
  initialize: async () => {
    await get().loadSettings();
    if (get().currentDirectory) {
      await get().loadImagesFromDirectory();
    }
    (async () => {
      try {
        const { 
          ollamaBaseUrl, 
          lmStudioBaseUrl, 
          apiKey, 
          anthropicApiKey, 
          geminiApiKey,
          openRouterApiKey,
          openAiModels,
          anthropicModels,
          geminiModels,
          openRouterModels
        } = get();
        if (ollamaBaseUrl) {
          try {
            const ok = await get().checkOllamaConnection();
            if (ok) {
              await get().fetchOllamaModels();
            }
          } catch (error) {
            console.error('Failed to refresh Ollama models during init:', error);
          }
        }
        if (lmStudioBaseUrl) {
          try {
            const ok = await get().checkLMStudioConnection();
            if (ok) {
              await get().fetchLMStudioModels();
            }
          } catch (error) {
            console.error('Failed to refresh LM Studio models during init:', error);
          }
        }
        if (apiKey && openAiModels.length === 0) {
          try {
            await get().fetchOpenAIModels();
          } catch (error) {
            console.error('Failed to refresh OpenAI models during init:', error);
          }
        }
        if (anthropicApiKey && anthropicModels.length === 0) {
          try {
            await get().fetchAnthropicModels();
          } catch (error) {
            console.error('Failed to refresh Anthropic models during init:', error);
          }
        }
        if (geminiApiKey && geminiModels.length === 0) {
          try {
            await get().fetchGeminiModels();
          } catch (error) {
            console.error('Failed to refresh Gemini models during init:', error);
          }
        }
        if (openRouterApiKey && openRouterModels.length === 0) {
          try {
            await get().fetchOpenRouterModels();
          } catch (error) {
            console.error('Failed to refresh OpenRouter models during init:', error);
          }
        }
      } catch (error) {
        console.error('Unexpected error during background initialization:', error);
      }
    })();
    set({ isInitialized: true });
  },
  
  toggleImageSelection: (path) => {
    const { selectedImages, selectedImage } = get();
    const newSelectedImages = new Set(selectedImages);
    
    if (newSelectedImages.has(path)) {
      newSelectedImages.delete(path);
      const newSelectedImage = newSelectedImages.size > 0 
        ? Array.from(newSelectedImages).pop() || null
        : null;
      set({ selectedImages: newSelectedImages, selectedImage: newSelectedImage });
    } else {
      newSelectedImages.add(path);
      set({ selectedImages: newSelectedImages, selectedImage: path });
    }
  },
  
  clearImageSelection: () => set({ 
    selectedImages: new Set(), 
    selectedImage: null 
  }),
  
  setSelectedImage: (path) => {
    const { selectedImage } = get();
    if (selectedImage === path) {
      get().toggleImageSelection(path);
    } else {
      set({ 
        selectedImage: path, 
        selectedImages: new Set([path]) 
      });
    }
  },
  
  setApiKey: (key) => {
    set({ apiKey: key });
    get().saveSettings();
  },
  
  setAnthropicApiKey: (key) => {
    set({ anthropicApiKey: key });
    get().saveSettings();
  },

  setOpenRouterApiKey: (key) => {
    set({ openRouterApiKey: key });
    get().saveSettings();
  },

  setGeminiApiKey: (key) => {
    set({ geminiApiKey: key });
    get().saveSettings();
  },
  
  setCurrentDirectory: async (path) => {
    set({ currentDirectory: path });
    console.log('Setting current directory:', path);
    await get().loadImagesFromDirectory();
    get().saveSettings();
  },
  
  toggleTheme: () => {
    set(state => ({ isDarkMode: !state.isDarkMode }));
    get().saveSettings();
  },
  
  setModel: (model) => {
    set({ selectedModel: model });
    get().saveSettings();
  },

  getProviderForModel: (model: string) => {
    // Determine the provider based on the model name
    const normalized = model.toLowerCase();
    if (normalized.startsWith('claude')) {
      return 'anthropic';
    } else if (normalized.startsWith('lmstudio:')) {
      return 'lmstudio';
    } else if (normalized.startsWith('ollama:')) {
      return 'ollama';
    } else if (normalized.startsWith('openrouter:')) {
      return 'openrouter';
    } else if (normalized.startsWith('gemini:') || normalized.startsWith('models/gemini') || normalized.startsWith('gemini-')) {
      return 'gemini';
    } else {
      return 'openai';
    }
  },
  
  setFontSize: (size) => {
    set({ fontSize: size });
    get().saveSettings();
  },
  
  adjustFontSize: (adjustment) => {
    set(state => {
      let newSize = state.fontSize + adjustment;
      if (newSize < 8) newSize = 8;
      if (newSize > 32) newSize = 32;
      return { fontSize: newSize };
    });
    get().saveSettings();
  },
  
  selectAll: async () => {
    const { currentDirectory, imageFiles } = get();
    if (!currentDirectory) return;
    
    try {
      // Use the existing imageFiles from state
      const imagePaths = imageFiles.map(file => file.path);
      const newSelectedImages = new Set<string>(imagePaths);
      
      set({ 
        selectedImages: newSelectedImages,
        selectedImage: imagePaths.length > 0 ? imagePaths[0] : null
      });
      
      console.log(`Selected all ${imagePaths.length} images`);
    } catch (error) {
      console.error('Error selecting all images:', error);
    }
  },
  
  handleImageClick: (path, { isCtrlPressed = false, isShiftPressed = false }) => {
    const { selectedImages, selectedImage, lastSelectedImage, imageFiles } = get();
    
    if (!isCtrlPressed && !isShiftPressed) {
      // Normal click - select only this image
      set({ 
        selectedImages: new Set([path]), 
        selectedImage: path,
        lastSelectedImage: path
      });
    } else if (isCtrlPressed && !isShiftPressed) {
      // Ctrl+click - toggle selection
      const newSelectedImages = new Set(selectedImages);
      
      if (newSelectedImages.has(path)) {
        newSelectedImages.delete(path);
        const newSelectedImage = newSelectedImages.size > 0 
          ? Array.from(newSelectedImages).pop() || null
          : null;
        set({ 
          selectedImages: newSelectedImages, 
          selectedImage: newSelectedImage,
          lastSelectedImage: path
        });
      } else {
        newSelectedImages.add(path);
        set({ 
          selectedImages: newSelectedImages, 
          selectedImage: path,
          lastSelectedImage: path
        });
      }
    } else if (isShiftPressed && lastSelectedImage) {
      // Shift+click - select range
      const allImagePaths = imageFiles.map(file => file.path);
      const startIdx = allImagePaths.indexOf(lastSelectedImage);
      const endIdx = allImagePaths.indexOf(path);
      
      if (startIdx !== -1 && endIdx !== -1) {
        const start = Math.min(startIdx, endIdx);
        const end = Math.max(startIdx, endIdx);
        
        const newSelectedImages = new Set(isCtrlPressed ? selectedImages : []);
        
        // Add all images in the range
        for (let i = start; i <= end; i++) {
          newSelectedImages.add(allImagePaths[i]);
        }
        
        set({ 
          selectedImages: newSelectedImages, 
          selectedImage: path
        });
      }
    }
  },
  
  setPromptStyle: (style) => {
    set({ selectedPromptStyle: style });
    get().saveSettings();
  },
  
  updateCaption: (imagePath, caption) => {
    set(state => ({
      captions: {
        ...state.captions,
        [imagePath]: caption
      }
    }));
  },
  
  saveCaption: async (imagePath, caption) => {
    try {
      // Update the caption in the state first
      get().updateCaption(imagePath, caption);
      
      // Use the Rust function to save the caption
      const result = await invoke<number>('save_captions', { 
        captions: { [imagePath]: caption } 
      });
      
      console.log(`Caption saved: ${result} files updated`);
    } catch (error) {
      console.error('Error saving caption:', error);
      
      // Fallback to the JavaScript implementation if the Rust function fails
      try {
        const captionPath = imagePath.replace(/\.(png|jpg|jpeg|gif)$/i, '.txt');
        await writeTextFile(captionPath, caption);
        console.log('Caption saved (fallback):', captionPath);
      } catch (fallbackError) {
        console.error('Fallback caption save also failed:', fallbackError);
      }
    }
  },
  
  selectDirectory: async () => {
    try {
      console.log('Opening directory selection dialog...');
      
      // Open directory selection dialog
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Image Directory'
      });
      
      console.log('Dialog result:', selected);
      
      if (selected && !Array.isArray(selected)) {
        console.log('Setting current directory to:', selected);
        await get().setCurrentDirectory(selected);
      } else {
        console.log('No directory selected or invalid selection');
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
      // Since both the dialog plugin and the fallback failed, show an error message
      console.error('Directory selection failed. Please try again.');
      set({ directorySelectionError: 'Failed to open directory selection dialog. Please try again.' });
    }
  },
  
  // Add panel width setter
  setPanelWidth: (panel, width) => {
    if (panel === 'left') {
      set({ leftPanelWidth: width });
    } else {
      set({ rightPanelWidth: width });
    }
    get().saveSettings();
  },
  setProviderEnabled: (provider, enabled) => {
    set(state => ({
      enabledProviders: {
        ...state.enabledProviders,
        [provider]: enabled,
      },
    }));
    get().saveSettings();
  },

  getSystemPromptOptions: () => {
    const { customSystemPrompts } = get();
    return getAllSystemPrompts(customSystemPrompts);
  },

  getSystemPromptText: (name: string) => {
    const { customSystemPrompts } = get();
    return getSystemPromptByName(name, customSystemPrompts).text;
  },

  saveCustomSystemPrompt: ({ name, description, text, originalName }) => {
    const trimmedName = name.trim();
    const trimmedText = text.trim();
    if (!trimmedName || !trimmedText) {
      console.warn('System prompt name and text are required');
      return;
    }
    const sanitizedOriginalName = originalName?.trim();
    const targetName = sanitizedOriginalName && sanitizedOriginalName.length > 0 ? sanitizedOriginalName : trimmedName;
    const formattedPrompt: SystemPromptDefinition = {
      name: trimmedName,
      description: description?.trim() || undefined,
      text: trimmedText,
      isDefault: false,
    };

    set(state => {
      const prompts = [...state.customSystemPrompts];
      const existingIndex = prompts.findIndex(prompt => prompt.name === targetName);
      if (existingIndex >= 0) {
        prompts[existingIndex] = formattedPrompt;
      } else {
        const duplicateIndex = prompts.findIndex(prompt => prompt.name === trimmedName);
        if (duplicateIndex >= 0) {
          prompts[duplicateIndex] = formattedPrompt;
        } else {
          prompts.push(formattedPrompt);
        }
      }

      let nextPromptStyle = state.selectedPromptStyle;
      if (state.selectedPromptStyle === targetName) {
        nextPromptStyle = trimmedName;
      }

      return {
        customSystemPrompts: prompts,
        ...(nextPromptStyle !== state.selectedPromptStyle ? { selectedPromptStyle: nextPromptStyle } : {})
      };
    });

    get().saveSettings();
  },

  deleteCustomSystemPrompt: (name: string) => {
    const trimmedName = name.trim();
    set(state => {
      const prompts = state.customSystemPrompts.filter(prompt => prompt.name !== trimmedName);
      const updates: Partial<AppState> & { customSystemPrompts: SystemPromptDefinition[] } = {
        customSystemPrompts: prompts
      };
      if (state.selectedPromptStyle === trimmedName) {
        updates.selectedPromptStyle = DEFAULT_SYSTEM_PROMPTS[0].name;
      }
      return updates;
    });
    get().saveSettings();
  },
  
  // LM Studio actions
  setLMStudioBaseUrl: (url: string) => {
    set({ lmStudioBaseUrl: url });
    get().saveSettings();
  },

  checkLMStudioConnection: async () => {
    const { lmStudioBaseUrl } = get();
    try {
      const response = await fetch(`${lmStudioBaseUrl}/models`);
      if (response.ok) {
        set({ lmStudioAvailable: true });
        get().saveSettings();
        return true;
      }
    } catch (error) {
      // ignore
    }
    set({ lmStudioAvailable: false, lmStudioModels: [] });
    get().saveSettings();
    return false;
  },

  fetchLMStudioModels: async () => {
    const { lmStudioBaseUrl } = get();
    try {
      const { LMStudioService } = await import('../services/LMStudioService');
      const service = new LMStudioService(lmStudioBaseUrl);
      const models = await service.fetchVisionModels();
      set({ lmStudioModels: models, lmStudioAvailable: true });
      get().saveSettings();
    } catch (error) {
      set({ lmStudioModels: [], lmStudioAvailable: false });
      get().saveSettings();
    }
  },

  // Ollama actions
  setOllamaBaseUrl: (url: string) => {
    set({ ollamaBaseUrl: url });
    get().saveSettings();
  },

  checkOllamaConnection: async () => {
    const { ollamaBaseUrl } = get();
    try {
      const response = await fetch(`${ollamaBaseUrl}/api/tags`);
      if (response.ok) {
        set({ ollamaAvailable: true });
        get().saveSettings();
        return true;
      }
    } catch (error) {
      // ignore
    }
    set({ ollamaAvailable: false, ollamaModels: [] });
    get().saveSettings();
    return false;
  },

  fetchOllamaModels: async () => {
    const { ollamaBaseUrl } = get();
    try {
      const { OllamaService } = await import('../services/OllamaService');
      const service = new OllamaService(ollamaBaseUrl);
      const models = await service.fetchModels();
      console.log('Fetched Ollama models:', models);
      // ollamaAvailable should be true if the server is up, even if no models
      set({ ollamaModels: models, ollamaAvailable: true });
      get().saveSettings();
    } catch (error) {
      set({ ollamaModels: [], ollamaAvailable: false });
      get().saveSettings();
    }
  },

  fetchOpenAIModels: async () => {
    const { apiKey } = get();
    if (!apiKey) {
      throw new Error('OpenAI API key is required to load models.');
    }
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to fetch OpenAI models (${response.status})`);
      }
      const payload = await response.json();
      const models = Array.isArray(payload?.data)
        ? payload.data
            .filter((model: any) => model && typeof model.id === 'string')
            .filter((model: any) => {
              const id = model.id as string;
              return OPENAI_VISION_MODEL_HINTS.some(hint => id.includes(hint));
            })
            .map((model: any) => ({
              id: model.id as string,
              name: typeof model?.owned_by === 'string' ? `${model.id}` : model.id
            }))
        : [];
      set({ openAiModels: dedupeModels(models) });
      get().saveSettings();
    } catch (error) {
      console.error('Error fetching OpenAI models:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch OpenAI models.');
    }
  },

  fetchAnthropicModels: async () => {
    const { anthropicApiKey } = get();
    if (!anthropicApiKey) {
      throw new Error('Anthropic API key is required to load models.');
    }
    try {
      const response = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to fetch Anthropic models (${response.status})`);
      }
      const payload = await response.json();
      const models = Array.isArray(payload?.data)
        ? payload.data
            .filter((model: any) => model && typeof model.id === 'string')
            .filter((model: any) => (model.id as string).toLowerCase().startsWith('claude'))
            .map((model: any) => ({
              id: model.id as string,
              name: typeof model?.display_name === 'string' ? model.display_name : model.id
            }))
        : [];
      set({ anthropicModels: dedupeModels(models) });
      get().saveSettings();
    } catch (error) {
      console.error('Error fetching Anthropic models:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch Anthropic models.');
    }
  },

  fetchGeminiModels: async () => {
    const { geminiApiKey } = get();
    if (!geminiApiKey) {
      throw new Error('Gemini API key is required to load models.');
    }
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to fetch Gemini models (${response.status})`);
      }
      const payload = await response.json();
      const models = Array.isArray(payload?.models)
        ? payload.models
            .filter((model: any) => {
              if (!model || typeof model.name !== 'string') return false;
              const normalized = model.name.toLowerCase();
              return GEMINI_VISION_MODEL_HINTS.some(hint => normalized.includes(hint));
            })
            .map((model: any) => {
              const id = typeof model.name === 'string' ? model.name.replace(/^models\//, '') : '';
              return {
                id,
                name: typeof model.displayName === 'string' ? model.displayName : id
              };
            })
        : [];
      set({ geminiModels: dedupeModels(models) });
      get().saveSettings();
    } catch (error) {
      console.error('Error fetching Gemini models:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch Gemini models.');
    }
  },

  fetchOpenRouterModels: async () => {
    const { openRouterApiKey } = get();
    if (!openRouterApiKey) {
      throw new Error('OpenRouter API key is required to load models.');
    }
    try {
      const normalizeInputs = (value: any): string[] => {
        if (!value) return [];
        if (typeof value === 'string') {
          return [value.toLowerCase()];
        }
        if (Array.isArray(value)) {
          return value
            .map(item => {
              if (typeof item === 'string') {
                return item.toLowerCase();
              }
              return '';
            })
            .filter(Boolean);
        }
        return [];
      };
      const supportsImageInput = (model: any): boolean => {
        const architectureModality = typeof model?.architecture?.modality === 'string'
          ? model.architecture.modality.toLowerCase()
          : null;
        if (architectureModality && architectureModality.includes('embedding')) {
          return false;
        }
        const candidateLists = [
          normalizeInputs(model?.capabilities?.input),
          normalizeInputs(model?.capabilities?.input_modalities),
          normalizeInputs(model?.capabilities?.modalities),
          normalizeInputs(model?.input),
          normalizeInputs(model?.modalities),
          normalizeInputs(model?.architecture?.input_modalities),
          normalizeInputs(model?.architecture?.output_modalities)
        ];
        if (candidateLists.some(list => list.includes('image'))) {
          return true;
        }
        if (typeof model?.architecture?.modality === 'string') {
          const modality = model.architecture.modality.toLowerCase();
          if (modality.includes('image') || modality.includes('vision')) {
            return true;
          }
        }
        if (typeof model?.capabilities?.vision === 'boolean' && model.capabilities.vision) {
          return true;
        }
        if (typeof model?.capabilities?.image === 'boolean' && model.capabilities.image) {
          return true;
        }
        if (model?.pricing && model.pricing.image !== undefined && model.pricing.image !== null) {
          return true;
        }
        return false;
      };
      const response = await fetch('https://openrouter.ai/api/v1/models/user', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openRouterApiKey}`,
          'HTTP-Referer': 'https://github.com/oshtz/tagmeister',
          'X-Title': 'tagmeister'
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to fetch OpenRouter models (${response.status})`);
      }
      const payload = await response.json();
      const rawModels = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.models)
          ? payload.models
          : [];
      const models = rawModels
        .filter((model: any) => {
          const identifier = typeof model?.id === 'string' ? model.id : model?.name;
          if (!identifier || typeof identifier !== 'string') {
            return false;
          }
          return supportsImageInput(model);
        })
        .map((model: any) => ({
          id: typeof model?.id === 'string' ? model.id : typeof model?.name === 'string' ? model.name : '',
          name: typeof model?.name === 'string'
            ? model.name
            : typeof model?.id === 'string'
              ? model.id
              : 'OpenRouter Model'
        }))
        .filter(model => !!model.id);
      console.log(`OpenRouter vision models loaded: ${models.length}/${rawModels.length}`);
      set({ openRouterModels: dedupeModels(models) });
      get().saveSettings();
    } catch (error) {
      console.error('Error fetching OpenRouter models:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch OpenRouter models.');
    }
  },

  togglePinnedModel: (modelId: string) => {
    set(state => {
      const pinned = new Set(state.pinnedModels);
      if (pinned.has(modelId)) {
        pinned.delete(modelId);
      } else {
        pinned.add(modelId);
      }
      return { pinnedModels: Array.from(pinned) };
    });
    get().saveSettings();
  },

  // Helper methods
  loadSettings: async () => {
    try {
      // Set default settings
      set({
        apiKey: '',
        anthropicApiKey: '',
        geminiApiKey: '',
        openRouterApiKey: '',
        isDarkMode: true,
        fontSize: 14.0,
        selectedModel: 'gpt-4o-mini',
        selectedPromptStyle: 'FLUX (Natural Language)',
        currentDirectory: null,
        prefixText: '',
        suffixText: '',
        leftPanelWidth: 0.2,
        rightPanelWidth: 0.2,
        customSystemPrompts: [],
        lmStudioBaseUrl: 'http://localhost:1234/v1',
        lmStudioAvailable: false,
        lmStudioModels: [],
        ollamaBaseUrl: 'http://localhost:11434',
        ollamaAvailable: false,
        ollamaModels: [],
        openAiModels: [],
        anthropicModels: [],
        geminiModels: [],
        openRouterModels: [],
        pinnedModels: [],
        enabledProviders: createDefaultProviderState(),
      });
      
      // Try to load settings from localStorage
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const savedSettings = localStorage.getItem('tagmeister-settings');
          if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            console.log('Loaded settings from localStorage:', settings);
            const storedCustomPrompts: SystemPromptDefinition[] = Array.isArray(settings.customSystemPrompts)
              ? settings.customSystemPrompts
                  .filter((prompt: any) => prompt && typeof prompt.name === 'string' && typeof prompt.text === 'string')
                  .map((prompt: any) => ({
                    name: prompt.name,
                    description: typeof prompt.description === 'string' ? prompt.description : undefined,
                    text: prompt.text,
                    isDefault: false,
                  }))
              : [];
            const savedPromptStyle = typeof settings.selectedPromptStyle === 'string'
              ? settings.selectedPromptStyle
              : DEFAULT_SYSTEM_PROMPTS[0].name;
            const availablePromptNames = new Set(
              [...DEFAULT_SYSTEM_PROMPTS, ...storedCustomPrompts].map(prompt => prompt.name)
            );
            const resolvedPromptStyle = availablePromptNames.has(savedPromptStyle)
              ? savedPromptStyle
              : DEFAULT_SYSTEM_PROMPTS[0].name;
            const mapStoredModels = (models: any): ProviderModel[] => {
              if (!Array.isArray(models)) {
                return [];
              }
              return models
                .filter(model => model && typeof model.id === 'string')
                .map(model => ({
                  id: model.id,
                  name: typeof model.name === 'string' ? model.name : model.id
                }));
            };
            const storedOpenAiModels = mapStoredModels(settings.openAiModels);
            const storedAnthropicModels = mapStoredModels(settings.anthropicModels);
            const storedGeminiModels = mapStoredModels(settings.geminiModels);
            const storedOpenRouterModels = mapStoredModels(settings.openRouterModels);
            const storedLmStudioModels = mapStoredModels(settings.lmStudioModels);
            const storedOllamaModels = mapStoredModels(settings.ollamaModels);
            const savedPinnedModels: string[] = Array.isArray(settings.pinnedModels)
              ? settings.pinnedModels.filter((value: any) => typeof value === 'string')
              : [];
            const savedOllamaAvailable = typeof settings.ollamaAvailable === 'boolean'
              ? settings.ollamaAvailable
              : storedOllamaModels.length > 0;
            
            set({
              apiKey: settings.apiKey || '',
              anthropicApiKey: settings.anthropicApiKey || '',
              openRouterApiKey: settings.openRouterApiKey || '',
              geminiApiKey: settings.geminiApiKey || '',
              isDarkMode: settings.isDarkMode !== false,
              fontSize: settings.fontSize || 14.0,
              selectedModel: settings.selectedModel || 'gpt-4o-mini',
              selectedPromptStyle: resolvedPromptStyle,
              currentDirectory: settings.currentDirectory || null,
              prefixText: settings.prefixText || '',
              suffixText: settings.suffixText || '',
              leftPanelWidth: settings.leftPanelWidth || 0.2,
              rightPanelWidth: settings.rightPanelWidth || 0.2,
              customSystemPrompts: storedCustomPrompts,
              lmStudioBaseUrl: settings.lmStudioBaseUrl || 'http://localhost:1234/v1',
              lmStudioAvailable: storedLmStudioModels.length > 0,
              lmStudioModels: storedLmStudioModels,
              ollamaBaseUrl: settings.ollamaBaseUrl || 'http://localhost:11434',
              ollamaAvailable: savedOllamaAvailable,
              ollamaModels: storedOllamaModels,
              openAiModels: storedOpenAiModels,
              anthropicModels: storedAnthropicModels,
              geminiModels: storedGeminiModels,
              openRouterModels: storedOpenRouterModels,
              pinnedModels: savedPinnedModels,
              enabledProviders: resolveProviderState(settings.enabledProviders),
            });
          }
        }
      } catch (localStorageError) {
        console.error('Error loading settings from localStorage:', localStorageError);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  },
  
  saveSettings: async () => {
    try {
      const { 
        apiKey,
        anthropicApiKey,
        geminiApiKey,
        openRouterApiKey,
        isDarkMode,
        fontSize,
        selectedModel,
        selectedPromptStyle,
        prefixText,
        suffixText,
        leftPanelWidth,
        rightPanelWidth,
        lmStudioBaseUrl,
        lmStudioModels,
        ollamaBaseUrl,
        ollamaAvailable,
        ollamaModels,
        openAiModels,
        anthropicModels,
        geminiModels,
        openRouterModels,
        pinnedModels,
        customSystemPrompts,
        enabledProviders,
      } = get();
      
      // Create settings object
      const settings = {
        apiKey,
        anthropicApiKey,
        geminiApiKey,
        openRouterApiKey,
        isDarkMode,
        fontSize,
        selectedModel,
        selectedPromptStyle,
        prefixText,
        suffixText,
        leftPanelWidth,
        rightPanelWidth,
        lmStudioBaseUrl,
        lmStudioModels: lmStudioModels.map(model => ({
          id: model.id,
          name: model.name
        })),
        ollamaBaseUrl,
        ollamaAvailable,
        ollamaModels: ollamaModels.map(model => ({
          id: model.id,
          name: model.name
        })),
        openAiModels: openAiModels.map(model => ({
          id: model.id,
          name: model.name
        })),
        anthropicModels: anthropicModels.map(model => ({
          id: model.id,
          name: model.name
        })),
        geminiModels: geminiModels.map(model => ({
          id: model.id,
          name: model.name
        })),
        openRouterModels: openRouterModels.map(model => ({
          id: model.id,
          name: model.name
        })),
        pinnedModels: [...pinnedModels],
        enabledProviders,
        customSystemPrompts: customSystemPrompts.map(prompt => ({
          name: prompt.name,
          description: prompt.description,
          text: prompt.text
        }))
      };
      
      // Try to save settings to localStorage
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('tagmeister-settings', JSON.stringify(settings));
          console.log('Saved settings to localStorage');
        }
      } catch (localStorageError) {
        console.error('Error saving settings to localStorage:', localStorageError);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  },
  
  loadImagesFromDirectory: async () => {
    const { currentDirectory } = get();
    if (!currentDirectory) return;
    set({ isLoadingImages: true });
    try {
      // Clear existing captions
      set({ captions: {} });
      
      // Use the Rust function to get directory contents
      const result = await invoke<{
        files: Array<{
          path: string;
          name: string;
          is_dir: boolean;
          size: number;
        }>;
        image_count: number;
      }>('get_directory_contents', { path: currentDirectory });
      
      console.log('Directory contents:', result);
      
      // Filter for image files and sort them naturally
      const imageFiles: FileInfo[] = result.files
        .filter(file => !file.is_dir)
        .filter(file => {
          const ext = file.name.split('.').pop()?.toLowerCase();
          return ext === 'jpg' || ext === 'jpeg' || ext === 'png';
        })
        .map(file => ({
          path: file.path,
          name: file.name
        }))
        .sort((a, b) => {
          // Natural sort that handles numbers correctly
          return a.name.localeCompare(b.name, undefined, {
            numeric: true,
            sensitivity: 'base'
          });
        });
      
      // Load captions for all images
      const newCaptions: Caption = {};
      
      for (const file of imageFiles) {
        const captionPath = file.path.replace(/\.(png|jpg|jpeg|gif)$/i, '.txt');
        try {
          const caption = await readTextFile(captionPath);
          console.log('Loading caption for', file.path, ':', caption);
          newCaptions[file.path] = caption.trim();
        } catch (error) {
          console.log('Caption file not found:', captionPath);
        }
      }
      
      // Set image files and captions in state
      set({ 
        imageFiles,
        captions: newCaptions 
      });
      
      // Set initial selection if needed
      if (imageFiles.length > 0) {
        const { selectedImage } = get();
        if (!selectedImage || !imageFiles.some(f => f.path === selectedImage)) {
          set({
            selectedImage: imageFiles[0].path,
            selectedImages: new Set([imageFiles[0].path])
          });
        }
      } else {
        set({
          selectedImage: null,
          selectedImages: new Set()
        });
      }
    } catch (error) {
      console.error('Error loading images from directory:', error);
    } finally {
      set({ isLoadingImages: false });
    }
  }
}));
