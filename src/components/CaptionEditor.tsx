import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { useAppStore } from '../context/AppStore';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  LinearProgress,
  Grid,
  InputAdornment,
  Collapse,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Menu
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LinkIcon from '@mui/icons-material/Link';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { OpenAIService } from '../services/OpenAIService';
import { AnthropicService } from '../services/AnthropicService';
import { LMStudioService } from '../services/LMStudioService';
import { GeminiService } from '../services/GeminiService';
import Popover from '@mui/material/Popover';
import Slider from '@mui/material/Slider';
import Tooltip from '@mui/material/Tooltip';
import AlertDialog from './AlertDialog';
import SystemPromptManagerDialog from './SystemPromptManagerDialog';

// FontSizePopover component
const FontSizePopover: React.FC<{
  fontSize: number;
  adjustFontSize: (delta: number) => void;
}> = ({ fontSize, adjustFontSize }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [sliderValue, setSliderValue] = React.useState(fontSize);

  // Sync slider with fontSize prop
  React.useEffect(() => {
    setSliderValue(fontSize);
  }, [fontSize]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'font-size-popover' : undefined;

  // When slider changes, call adjustFontSize with the delta
  const handleSliderChange = (_: Event, value: number | number[]) => {
    if (typeof value === 'number') {
      setSliderValue(value);
      adjustFontSize(value - fontSize);
    }
  };

  return (
    <>
      <Tooltip title="Adjust caption font size">
        <IconButton
          aria-describedby={id}
          onClick={handleClick}
          size="small"
          sx={{
            borderRadius: '12px',
            padding: '6px',
            backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
            '&:hover': {
              backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
            }
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: 1 }}>Aa</Typography>
        </IconButton>
      </Tooltip>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { p: 2, minWidth: 180 }
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ mb: 1 }}>Font Size</Typography>
          <Slider
            min={10}
            max={48}
            step={1}
            value={sliderValue}
            onChange={handleSliderChange}
            valueLabelDisplay="auto"
            sx={{ width: 120 }}
            aria-label="Font size slider"
          />
          <Typography variant="body2" sx={{ fontFamily: '"Inconsolata", monospace' }}>{sliderValue}px</Typography>
        </Box>
      </Popover>
    </>
  );
};

const CaptionEditor: React.FC = () => {
  // Add global styles to completely remove any shadows from API key inputs
  useLayoutEffect(() => {
    // Create a style element
    const styleEl = document.createElement('style');
    // Comprehensive rules to eliminate all shadows
    styleEl.innerHTML = `
      /* Target all shadows everywhere in the API key section */
      .MuiPaper-root.MuiAccordion-root,
      .MuiPaper-root.MuiAccordion-root .MuiAccordionSummary-root,
      .MuiPaper-root.MuiAccordion-root .MuiAccordionDetails-root,
      .MuiPaper-root.MuiAccordion-root .MuiAccordionDetails-root *,
      .MuiPaper-root.MuiAccordion-root .MuiAccordionDetails-root .MuiInputBase-root,
      .MuiPaper-root.MuiAccordion-root .MuiAccordionDetails-root .MuiTextField-root,
      .MuiPaper-root.MuiAccordion-root .MuiAccordionDetails-root .MuiOutlinedInput-root,
      .MuiPaper-root.MuiAccordion-root .MuiAccordionDetails-root .MuiInputBase-root .MuiInputAdornment-root {
        box-shadow: none !important;
        -webkit-box-shadow: none !important;
        -moz-box-shadow: none !important;
        filter: none !important;
        text-shadow: none !important;
      }
      
      /* Removing divider between accordion summary and details */
      .MuiPaper-root.MuiAccordion-root .MuiAccordionSummary-root {
        border-bottom: none !important;
        box-shadow: none !important;
        margin-bottom: 0 !important;
      }
      
      .MuiPaper-root.MuiAccordion-root .MuiAccordionSummary-root.Mui-expanded {
        min-height: 48px !important;
        margin: 0 !important;
      }
      
      /* Remove the divider line completely */
      .MuiPaper-root.MuiAccordion-root .MuiDivider-root,
      .MuiPaper-root.MuiAccordion-root hr {
        display: none !important;
      }
      
      /* Remove the shadow specifically between header and content */
      .MuiPaper-root.MuiAccordion-root::after,
      .MuiPaper-root.MuiAccordion-root::before,
      .MuiPaper-root.MuiAccordion-root .MuiAccordionSummary-root::after {
        display: none !important;
        box-shadow: none !important;
        border: none !important;
      }
      
      .MuiAccordionDetails-root {
        padding-top: 8px !important;
        border-top: none !important;
      }
      
      /* Light mode specific overrides */
      body[data-color-mode="light"] .MuiPaper-root.MuiAccordion-root {
        box-shadow: none !important;
      }
      
      /* Ensuring no borders or outlines */
      .MuiPaper-root.MuiAccordion-root .MuiAccordionDetails-root .MuiOutlinedInput-notchedOutline,
      .MuiPaper-root.MuiAccordion-root .MuiInputBase-root fieldset {
        border: none !important;
        outline: none !important;
      }
    `;
    // Append the style to the document head
    document.head.appendChild(styleEl);
    
    // Cleanup function to remove the style on unmount
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);
  
  const { 
    selectedImage,
    selectedImages,
    captions,
    apiKey,
    apiKeyVisible,
    toggleApiKeyVisibility,
    setApiKey,
    anthropicApiKey,
    anthropicApiKeyVisible,
    toggleAnthropicApiKeyVisibility,
    setAnthropicApiKey,
    openRouterApiKey,
    openRouterApiKeyVisible,
    toggleOpenRouterApiKeyVisibility,
    setOpenRouterApiKey,
    geminiApiKey,
    geminiApiKeyVisible,
    toggleGeminiApiKeyVisibility,
    setGeminiApiKey,
    prefixText,
    suffixText,
    selectedModel,
    selectedPromptStyle,
    fontSize,
    updateCaption,
    saveCaption,
    setPromptStyle,
    setModel,
    getProviderForModel,
    adjustFontSize,
    isProcessing,
    processedCount,
    totalToProcess,
    setProcessingState,
    incrementProcessedCount,
    setShouldInterrupt,
    checkShouldInterrupt,
    shouldInterrupt,
    // LM Studio
    lmStudioBaseUrl,
    setLMStudioBaseUrl,
    checkLMStudioConnection,
    fetchLMStudioModels,
    lmStudioAvailable,
    lmStudioModels,
    // Ollama
    ollamaBaseUrl,
    setOllamaBaseUrl,
    checkOllamaConnection,
    fetchOllamaModels,
    ollamaAvailable,
    ollamaModels,
    // Remote models
    openAiModels,
    anthropicModels,
    geminiModels,
    openRouterModels,
    fetchOpenAIModels,
    fetchAnthropicModels,
    fetchGeminiModels,
    fetchOpenRouterModels,
    pinnedModels,
    togglePinnedModel,
    getSystemPromptOptions,
    getSystemPromptText
  } = useAppStore();

  // Automatically fetch LM Studio models when LM Studio becomes available
  useEffect(() => {
    if (lmStudioAvailable) {
      fetchLMStudioModels();
    }
  }, [lmStudioAvailable, fetchLMStudioModels]);

  useEffect(() => {
    if (ollamaAvailable) {
      fetchOllamaModels();
    }
  }, [ollamaAvailable, fetchOllamaModels]);
  
  const [caption, setCaption] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPromptManagerOpen, setPromptManagerOpen] = useState(false);
  const [modelFilter, setModelFilter] = useState('');
  const [modelMenuAnchor, setModelMenuAnchor] = useState<null | HTMLElement>(null);
  const promptOptions = getSystemPromptOptions();
  const pinnedSet = useMemo(() => new Set(pinnedModels), [pinnedModels]);
  const modelOptions = useMemo(() => {
    type Option = { value: string; label: string; provider: string };
    const options: Option[] = [];
    const addOption = (value: string, label: string, provider: string) => {
      if (!value) return;
      options.push({ value, label, provider });
    };
    addOption('gpt-4o-mini', 'OpenAI: gpt-4o-mini', 'openai');
    addOption('gpt-4o', 'OpenAI: gpt-4o', 'openai');
    addOption('claude-3-7-sonnet-20250219', 'Anthropic: Claude 3.7 Sonnet', 'anthropic');
    addOption('gemini:gemini-1.5-flash', 'Gemini: 1.5 Flash', 'gemini');
    addOption('gemini:gemini-1.5-pro', 'Gemini: 1.5 Pro', 'gemini');
    openAiModels.forEach(model => addOption(model.id, `OpenAI: ${model.name}`, 'openai'));
    anthropicModels.forEach(model => addOption(model.id, `Anthropic: ${model.name}`, 'anthropic'));
    geminiModels.forEach(model => addOption(`gemini:${model.id}`, `Gemini: ${model.name}`, 'gemini'));
    openRouterModels.forEach(model => addOption(`openrouter:${model.id}`, `${model.name}`, 'openrouter'));
    lmStudioModels.forEach(model => addOption(`lmstudio:${model.id}`, `LM Studio: ${model.name}`, 'lmstudio'));
    ollamaModels.forEach(model => addOption(`ollama:${model.id}`, `Ollama: ${model.name}`, 'ollama'));
    const seen = new Set<string>();
    const normalized = options.filter(option => {
      if (seen.has(option.value)) {
        return false;
      }
      seen.add(option.value);
      return true;
    });
    const filterValue = modelFilter.trim().toLowerCase();
    const filtered = filterValue
      ? normalized.filter(option =>
          option.label.toLowerCase().includes(filterValue) ||
          option.value.toLowerCase().includes(filterValue)
        )
      : [...normalized];
    const ensureSelectedOption = (current: Option[]) => {
      if (!selectedModel) {
        return current;
      }
      if (current.some(option => option.value === selectedModel)) {
        return current;
      }
      const fallback =
        normalized.find(option => option.value === selectedModel) ||
        {
          value: selectedModel,
          label: selectedModel,
          provider: getProviderForModel(selectedModel)
        };
      return [fallback, ...current];
    };
    const hydrated = ensureSelectedOption(filtered);
    const pinnedLookup = new Set(pinnedModels);
    const labelForProvider = (provider: string) => {
      switch (provider) {
        case 'anthropic':
          return 'Anthropic';
        case 'lmstudio':
          return 'LM Studio';
        case 'ollama':
          return 'Ollama';
        case 'gemini':
          return 'Gemini';
        case 'openrouter':
          return 'OpenRouter';
        default:
          return 'OpenAI';
      }
    };
    const normalizedLabels = hydrated.map(option => {
      if (option.label.includes(':')) {
        return option;
      }
      return {
        ...option,
        label: `${labelForProvider(option.provider)}: ${option.label}`
      };
    });
    normalizedLabels.sort((a, b) => {
      const aPinned = pinnedLookup.has(a.value);
      const bPinned = pinnedLookup.has(b.value);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return a.label.localeCompare(b.label);
    });
    return normalizedLabels;
  }, [
    selectedModel,
    modelFilter,
    openAiModels,
    anthropicModels,
    geminiModels,
    lmStudioModels,
    ollamaModels,
    openRouterModels,
    pinnedModels,
    getProviderForModel
  ]);
  const selectedProvider = getProviderForModel(selectedModel);
  const isProviderReady = useMemo(() => {
    switch (selectedProvider) {
      case 'openai':
        return !!apiKey;
      case 'anthropic':
        return !!anthropicApiKey;
    case 'gemini':
      return !!geminiApiKey;
    case 'openrouter':
      return !!openRouterApiKey;
    case 'lmstudio':
        return selectedModel.startsWith('lmstudio:') && lmStudioAvailable;
      case 'ollama':
        return selectedModel.startsWith('ollama:') && ollamaAvailable;
      default:
        return false;
    }
  }, [
    selectedProvider,
    apiKey,
    anthropicApiKey,
    geminiApiKey,
    openRouterApiKey,
    lmStudioAvailable,
    ollamaAvailable,
    selectedModel
  ]);
  
  // Update caption when selection changes
  useEffect(() => {
    if (selectedImage) {
      setCaption(captions[selectedImage] || '');
    } else {
      setCaption('');
    }
  }, [selectedImage, captions]);
  
  // Handle caption change
  const handleCaptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCaption(e.target.value);
    if (selectedImage) {
      updateCaption(selectedImage, e.target.value);
    }
  };
  
  // Handle caption save
  const handleSaveCaption = async () => {
    if (selectedImage) {
      await saveCaption(selectedImage, caption);
    }
  };
  
  // Helper function to delay execution
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleModelMenuClose = () => setModelMenuAnchor(null);
  const handleModelMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setModelMenuAnchor(event.currentTarget);
  };
  const handleRefreshModels = async (
    provider: 'openai' | 'anthropic' | 'gemini' | 'lmstudio' | 'ollama'
  ) => {
    handleModelMenuClose();
    const providerName = {
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      gemini: 'Gemini',
      lmstudio: 'LM Studio',
      ollama: 'Ollama'
    }[provider];
    try {
      if (provider === 'openai') {
        if (!apiKey) {
          showAlertDialog('Please enter an OpenAI API key first.', { type: 'error', title: 'Missing API Key' });
          return;
        }
        await fetchOpenAIModels();
        showAlertDialog('OpenAI model list updated.', { type: 'info', title: 'Models Refreshed' });
      } else if (provider === 'anthropic') {
        if (!anthropicApiKey) {
          showAlertDialog('Please enter an Anthropic API key first.', { type: 'error', title: 'Missing API Key' });
          return;
        }
        await fetchAnthropicModels();
        showAlertDialog('Anthropic model list updated.', { type: 'info', title: 'Models Refreshed' });
      } else if (provider === 'gemini') {
        if (!geminiApiKey) {
          showAlertDialog('Please enter a Gemini API key first.', { type: 'error', title: 'Missing API Key' });
          return;
        }
        await fetchGeminiModels();
        showAlertDialog('Gemini model list updated.', { type: 'info', title: 'Models Refreshed' });
      } else if (provider === 'lmstudio') {
        const ok = await checkLMStudioConnection();
        if (!ok) {
          showAlertDialog('Could not connect to LM Studio at the specified URL.', { type: 'error', title: 'LM Studio Connection Failed' });
          return;
        }
        await fetchLMStudioModels();
        showAlertDialog('LM Studio models loaded.', { type: 'info', title: 'Models Refreshed' });
      } else if (provider === 'ollama') {
        const ok = await checkOllamaConnection();
        if (!ok) {
          showAlertDialog('Could not connect to Ollama at the specified URL.', { type: 'error', title: 'Ollama Connection Failed' });
          return;
        }
        await fetchOllamaModels();
        showAlertDialog('Ollama models loaded.', { type: 'info', title: 'Models Refreshed' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showAlertDialog(`Failed to refresh ${providerName} models: ${message}`, { type: 'error', title: 'Model Refresh Failed' });
    }
  };
  
  // Process a single image and return its final caption
  const processSingleImage = async (
    imagePath: string
  ): Promise<string> => {
    // Prepare prefix but do not apply it yet; only set it right before streaming
    let livePrefix = '';
    {
      let prefix = prefixText.trim();
      if (prefix) {
        if (prefix.endsWith(', ') || prefix.endsWith(' ,')) {
          prefix = prefix.substring(0, prefix.length - 2).trim();
        } else if (prefix.endsWith(',')) {
          prefix = prefix.substring(0, prefix.length - 1).trim();
        }
        livePrefix = prefix + ', ';
      }
    }
    // Clear the caption immediately when starting processing
    setCaption('');
    updateCaption(imagePath, '');
    
    // Create a streaming handler for real-time updates
    // Insert the prefix exactly when the first chunk arrives
    let streamingStarted = false;
    const streamHandler = (chunk: string) => {
      setCaption(prev => {
        let base = prev;
        if (!streamingStarted) {
          streamingStarted = true;
          if (livePrefix) {
            base = livePrefix; // seed prefix at the precise start of streaming
          }
        }
        const newCaption = base + chunk;
        // Also update the caption in the store
        updateCaption(imagePath, newCaption);
        return newCaption;
      });
    };
    
    // Determine which service to use based on the selected model
    const provider = selectedProvider;
    const promptText = getSystemPromptText(selectedPromptStyle);
    
    let rawCaption: string;
    let processedCaption: string;

    if (provider === 'anthropic') {
      // Use Anthropic service
      if (!anthropicApiKey) {
        throw new Error('Anthropic API key is required for Claude models');
      }
      const anthropicService = new AnthropicService(anthropicApiKey, true);
      rawCaption = await anthropicService.generateImageCaption(
        imagePath,
        selectedModel,
        promptText,
        streamHandler
      );
      processedCaption = anthropicService.processCaption(rawCaption).trim();
    } else if (provider === 'lmstudio') {
      // Use LM Studio service
      const lmstudioService = new LMStudioService(lmStudioBaseUrl);
      // Remove lmstudio: prefix for model id
      const modelId = selectedModel.replace(/^lmstudio:/, '');
      rawCaption = await lmstudioService.generateImageCaption(
        imagePath,
        modelId,
        promptText,
        streamHandler
      );
      // Use OpenAI-style post-processing
      processedCaption = rawCaption.trim().replace(/\.$/, '');
    } else if (provider === 'ollama') {
      // Use Ollama service
      const { OllamaService } = await import('../services/OllamaService');
      const ollamaService = new OllamaService(ollamaBaseUrl);
      // Remove ollama: prefix and :latest suffix for model id
      const modelId = selectedModel.replace(/^ollama:/, '').replace(/:latest$/, '');
      rawCaption = await ollamaService.generateImageCaption(
        imagePath,
        modelId,
        promptText,
        streamHandler
      );
      processedCaption = rawCaption.trim().replace(/\.$/, '');
    } else if (provider === 'openrouter') {
      if (!openRouterApiKey) {
        throw new Error('OpenRouter API key is required for OpenRouter models');
      }
      const openRouterService = new OpenAIService(openRouterApiKey, {
        baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
        additionalHeaders: {
          'HTTP-Referer': 'https://github.com/oshtz/tagmeister',
          'X-Title': 'tagmeister'
        }
      });
      const modelId = selectedModel.replace(/^openrouter:/, '');
      rawCaption = await openRouterService.generateImageCaption(
        imagePath,
        modelId,
        promptText,
        streamHandler
      );
      processedCaption = openRouterService.processCaption(rawCaption).trim();
    } else if (provider === 'gemini') {
      if (!geminiApiKey) {
        throw new Error('Gemini API key is required for Gemini models');
      }
      const geminiService = new GeminiService(geminiApiKey);
      const modelId = selectedModel.replace(/^gemini:/, '').replace(/^models\//, '');
      rawCaption = await geminiService.generateImageCaption(
        imagePath,
        modelId,
        promptText,
        streamHandler
      );
      processedCaption = rawCaption.trim().replace(/\.$/, '');
    } else {
      // Use OpenAI service
      if (!apiKey) {
        throw new Error('OpenAI API key is required for OpenAI models');
      }
      const openAiService = new OpenAIService(apiKey);
      rawCaption = await openAiService.generateImageCaption(
        imagePath,
        selectedModel,
        promptText,
        streamHandler
      );
      processedCaption = openAiService.processCaption(rawCaption).trim();
    }

    // Remove trailing comma if present
    if (processedCaption.endsWith(',')) {
      processedCaption = processedCaption.substring(0, processedCaption.length - 1).trim();
    }

    // Build final caption with the same prefix used for streaming and optional suffix
    let finalCaption = '';
    // Remove any accidental leading commas/spaces from processed content
    let processed = processedCaption.replace(/^\s*,+\s*/, '').trim();
    // Start with the prefix we already seeded during streaming
    finalCaption = livePrefix + processed;
    // Handle suffix
    let suffix = suffixText.trim();
    if (suffix) {
      if (suffix.startsWith(', ') || suffix.startsWith(' ,')) {
        suffix = suffix.substring(2).trim();
      } else if (suffix.startsWith(',')) {
        suffix = suffix.substring(1).trim();
      }
      finalCaption = finalCaption + ', ' + suffix;
    }

    // Update caption in state
    updateCaption(imagePath, finalCaption);
    setCaption(finalCaption);

    // Save caption to file
    await saveCaption(imagePath, finalCaption);

    // Refresh caption from store to ensure UI shows latest prefix/suffix
    setCaption(captions[imagePath] || finalCaption);

    // Ensure sidebar preview updates by forcing captions object update in store
    useAppStore.setState({ captions: { ...captions, [imagePath]: finalCaption } });

    // Increment processed count
    incrementProcessedCount();

    return finalCaption;
  };

  // State for custom confirmation dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingImagesToProcess, setPendingImagesToProcess] = useState<string[] | null>(null);

  // State for alert dialog
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [alertDialogMessage, setAlertDialogMessage] = useState('');
  const [alertDialogTitle, setAlertDialogTitle] = useState<string | undefined>(undefined);
  const [alertDialogType, setAlertDialogType] = useState<'info' | 'error' | 'confirm'>('info');
  const [alertDialogOnConfirm, setAlertDialogOnConfirm] = useState<(() => void) | undefined>(undefined);

  // Helper to show alert dialog
  const showAlertDialog = (
    message: string,
    options?: {
      title?: string;
      type?: 'info' | 'error' | 'confirm';
      onConfirm?: () => void;
    }
  ) => {
    setAlertDialogMessage(message);
    setAlertDialogTitle(options?.title);
    setAlertDialogType(options?.type || 'info');
    setAlertDialogOnConfirm(options?.onConfirm);
    setAlertDialogOpen(true);
  };

  // Refactored caption generation logic
  const startCaptionGeneration = async (imagesToProcess: string[]) => {
    setIsGenerating(true);
    setProcessingState(true, imagesToProcess.length);
    setShouldInterrupt(false);
    const processedImages: string[] = [];
    try {
      for (let i = 0; i < imagesToProcess.length; i++) {
        if (checkShouldInterrupt()) {
          console.log('Caption generation interrupted by user');
          break;
        }
        const imagePath = imagesToProcess[i];
        useAppStore.setState({ 
          selectedImage: imagePath, 
          selectedImages: new Set([...selectedImages])
        });
        try {
          await processSingleImage(imagePath);
          processedImages.push(imagePath);
          // Refresh list/captions between each image in batch to update left panel
          try {
            await useAppStore.getState().loadImagesFromDirectory();
          } catch (e) {
            console.error('Failed to refresh images between batch items:', e);
          }
        } catch (error) {
          console.error(`Error generating caption for ${imagePath}:`, error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error in caption generation:', error);
      const provider = getProviderForModel(selectedModel);
      const providerLabel = (() => {
        switch (provider) {
          case 'anthropic':
            return 'Anthropic';
          case 'lmstudio':
            return 'LM Studio';
          case 'ollama':
            return 'Ollama';
          case 'gemini':
            return 'Gemini';
          default:
            return 'OpenAI';
        }
      })();
      const isCloudProvider = provider === 'openai' || provider === 'anthropic' || provider === 'gemini';
      let errorMessage = 'An error occurred during caption generation.';
      if (error instanceof Error) {
        if (isCloudProvider && (error.message.includes('429') || error.message.toLowerCase().includes('rate limit'))) {
          errorMessage = `${providerLabel} API rate limit exceeded. Please try again later.`;
        } else if (isCloudProvider && error.message.includes('401')) {
          errorMessage = `Invalid API key. Please check your ${providerLabel} API key.`;
        } else if (isCloudProvider && error.message.includes('400')) {
          const match = error.message.match(/400[^:]*: (.+)/);
          if (match && match[1]) {
            errorMessage = `Bad request: ${match[1]}`;
          } else {
            errorMessage = `Bad request to ${providerLabel} API. Please try again.`;
          }
        } else {
          errorMessage = `${providerLabel} error: ${error.message}`;
        }
      }
      showAlertDialog(errorMessage, { type: 'error', title: 'Caption Generation Error' });
      if (processedImages.length > 0) {
        const remainingImages = Array.from(selectedImages).filter(
          img => !processedImages.includes(img)
        );
        useAppStore.setState({ 
          selectedImages: new Set(remainingImages),
          selectedImage: remainingImages.length > 0 ? remainingImages[0] : null
        });
      }
    } finally {
      setIsGenerating(false);
      setProcessingState(false);
      setShouldInterrupt(false);
      // Refresh the image list and captions from disk so the left panel shows
      // the latest saved captions after finishing or interruption.
      try {
        await useAppStore.getState().loadImagesFromDirectory();
      } catch (e) {
        console.error('Failed to refresh images after processing:', e);
      }
    }
  };

  // Handle caption generation
  const handleGenerateCaption = async () => {
    const provider = getProviderForModel(selectedModel);
    if (provider === 'anthropic' && !anthropicApiKey) {
      showAlertDialog('Please enter an Anthropic API key first', { type: 'error', title: 'Missing API Key' });
      return;
    } else if (provider === 'openai' && !apiKey) {
      showAlertDialog('Please enter an OpenAI API key first', { type: 'error', title: 'Missing API Key' });
      return;
    } else if (provider === 'openrouter' && !openRouterApiKey) {
      showAlertDialog('Please enter an OpenRouter API key first', { type: 'error', title: 'Missing API Key' });
      return;
    } else if (provider === 'gemini' && !geminiApiKey) {
      showAlertDialog('Please enter a Gemini API key first', { type: 'error', title: 'Missing API Key' });
      return;
    }
    if (selectedImages.size === 0) {
      showAlertDialog('Please select at least one image', { type: 'error', title: 'No Images Selected' });
      return;
    }
    const imagesToProcess = Array.from(selectedImages);
    if (imagesToProcess.length > 1) {
      setPendingImagesToProcess(imagesToProcess);
      setConfirmDialogOpen(true);
      return;
    }
    // Single image: start immediately
    startCaptionGeneration(imagesToProcess);
  };
  
  // Handle stopping the caption generation process
  const handleStopProcessing = () => {
    setShouldInterrupt(true);
  };
  
  if (!selectedImage) {
    return (
      <>
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography 
            variant="body1"
            sx={{ fontFamily: '"Inconsolata", monospace' }}
          >
            Select an image
          </Typography>
        </Box>
        <SystemPromptManagerDialog
          open={isPromptManagerOpen}
          onClose={() => setPromptManagerOpen(false)}
        />
      </>
    );
  }
  
  return (
    <>
      <Paper 
      elevation={0} 
      sx={{ 
        height: '100%', 
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        overflow: 'hidden', // Prevent overall container from scrolling
        minHeight: '400px' // Ensure minimum height for the container
      }}
    >
      {/* API Settings section */}
      <Accordion 
        elevation={0}
        square
        sx={{ 
          mb: 2,
          '&.MuiAccordion-root': {
            boxShadow: 'none !important',
            border: '1px solid',
            borderColor: 'divider',
            '&:before': {
              display: 'none',
            },
          }
        }}
        disableGutters
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            minHeight: '48px',
            borderBottom: 'none',
            boxShadow: 'none !important',
            '&.Mui-expanded': {
              borderBottom: 'none',
              minHeight: '48px',
              boxShadow: 'none !important'
            },
            '& .MuiAccordionSummary-content': {
              margin: '8px 0',
            }
          }}
        >
          <Typography 
            variant="subtitle2" 
            sx={{ 
              fontFamily: '"Karla", sans-serif'
            }}
          >
            API Settings
          </Typography>
        </AccordionSummary>
        <AccordionDetails 
          sx={{ 
            pt: 0, 
            mt: 0,
            boxShadow: 'none !important', 
            border: 'none',
            borderTop: 'none !important',
            background: 'transparent !important'
          }}
        >
          {/* OpenAI API Key */}
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'block',
              mb: 1,
              fontFamily: '"Karla", sans-serif'
            }}
          >
            OpenAI API Key
          </Typography>
          <TextField
            fullWidth
            size="small"
            type={apiKeyVisible ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter OpenAI API Key"
            variant="standard" 
            InputLabelProps={{
              sx: { boxShadow: 'none !important' }
            }}
            InputProps={{
              sx: theme => ({
                fontFamily: '"Inconsolata", monospace',
                boxShadow: 'none !important',
                filter: 'none !important',
                ...(theme.palette.mode === 'light' && {
                  background: 'transparent',
                  '& svg': { filter: 'none !important' }
                }),
                '& fieldset': {
                  boxShadow: 'none !important',
                  border: 'none !important'
                }
              }),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={toggleApiKeyVisibility}
                    edge="end"
                    size="small"
                    sx={{
                      boxShadow: 'none !important',
                      border: 'none'
                    }}
                  >
                    {apiKeyVisible ? <VisibilityOffIcon /> : <VisibilityIcon color="primary" />}
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={theme => ({
              boxShadow: 'none !important', 
              filter: 'none !important',
              mb: 2,
              ...(theme.palette.mode === 'light' && {
                '& .MuiOutlinedInput-notchedOutline': {
                  boxShadow: 'none !important',
                  border: 'none !important'
                },
                '& .MuiInputBase-root': {
                  boxShadow: 'none !important',
                  border: 'none !important'
                }
              })
            })}
          />
          
          {/* Anthropic API Key */}
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'block',
              mb: 1,
              fontFamily: '"Karla", sans-serif'
            }}
          >
            Anthropic API Key
          </Typography>
          <TextField
            fullWidth
            size="small"
            type={anthropicApiKeyVisible ? 'text' : 'password'}
            value={anthropicApiKey}
            onChange={(e) => setAnthropicApiKey(e.target.value)}
            placeholder="Enter Anthropic API Key"
            variant="standard" 
            InputLabelProps={{
              sx: { boxShadow: 'none !important' }
            }}
            InputProps={{
              sx: theme => ({
                fontFamily: '"Inconsolata", monospace',
                boxShadow: 'none !important',
                filter: 'none !important',
                ...(theme.palette.mode === 'light' && {
                  background: 'transparent',
                  '& svg': { filter: 'none !important' }
                }),
                '& fieldset': {
                  boxShadow: 'none !important',
                  border: 'none !important'
                }
              }),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={toggleAnthropicApiKeyVisibility}
                    edge="end"
                    size="small"
                    sx={{
                      boxShadow: 'none !important',
                      border: 'none'
                    }}
                  >
                    {anthropicApiKeyVisible ? <VisibilityOffIcon /> : <VisibilityIcon color="primary" />}
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={theme => ({
              boxShadow: 'none !important', 
              filter: 'none !important',
              mb: 2,
              ...(theme.palette.mode === 'light' && {
                '& .MuiOutlinedInput-notchedOutline': {
                  boxShadow: 'none !important',
                  border: 'none !important'
                },
                '& .MuiInputBase-root': {
                  boxShadow: 'none !important',
                  border: 'none !important'
                }
              })
            })}
          />
          
          {/* Gemini API Key */}
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'block',
              mb: 1,
              fontFamily: '"Karla", sans-serif'
            }}
          >
            Gemini API Key
          </Typography>
          <TextField
            fullWidth
            size="small"
            type={geminiApiKeyVisible ? 'text' : 'password'}
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            placeholder="Enter Gemini API Key"
            variant="standard" 
            InputLabelProps={{
              sx: { boxShadow: 'none !important' }
            }}
            InputProps={{
              sx: theme => ({
                fontFamily: '"Inconsolata", monospace',
                boxShadow: 'none !important',
                filter: 'none !important',
                ...(theme.palette.mode === 'light' && {
                  background: 'transparent',
                  '& svg': { filter: 'none !important' }
                }),
                '& fieldset': {
                  boxShadow: 'none !important',
                  border: 'none !important'
                }
              }),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={toggleGeminiApiKeyVisibility}
                    edge="end"
                    size="small"
                    sx={{
                      boxShadow: 'none !important',
                      border: 'none'
                    }}
                  >
                    {geminiApiKeyVisible ? <VisibilityOffIcon /> : <VisibilityIcon color="primary" />}
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={theme => ({
              boxShadow: 'none !important', 
              filter: 'none !important',
              mb: 2,
              ...(theme.palette.mode === 'light' && {
                '& .MuiOutlinedInput-notchedOutline': {
                  boxShadow: 'none !important',
                  border: 'none !important'
                },
                '& .MuiInputBase-root': {
                  boxShadow: 'none !important',
                  border: 'none !important'
                }
              })
            })}
          />

          {/* LM Studio Server URL */}
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'block',
              mb: 1,
              fontFamily: '"Karla", sans-serif'
            }}
          >
            LM Studio Server URL
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
            <TextField
              fullWidth
              size="small"
              value={lmStudioBaseUrl}
              onChange={(e) => setLMStudioBaseUrl(e.target.value)}
              placeholder="http://localhost:1234/v1"
              variant="standard"
              InputLabelProps={{
                sx: { boxShadow: 'none !important' }
              }}
              InputProps={{
                sx: theme => ({
                  fontFamily: '"Inconsolata", monospace',
                  boxShadow: 'none !important',
                  filter: 'none !important',
                  ...(theme.palette.mode === 'light' && {
                    background: 'transparent',
                    '& svg': { filter: 'none !important' }
                  }),
                  '& fieldset': {
                    boxShadow: 'none !important',
                    border: 'none !important'
                  }
                })
              }}
            />
            <Tooltip
              title="Check LM Studio Connection"
              placement="right"
              PopperProps={{
                modifiers: [
                  {
                    name: 'offset',
                    options: {
                      offset: [-8, 0],
                    },
                  },
                ],
              }}
            >
              <IconButton
                color="primary"
                size="small"
                sx={{ ml: 1 }}
                onClick={async () => {
                  const ok = await checkLMStudioConnection();
                  if (ok) {
                    await fetchLMStudioModels();
                    showAlertDialog('LM Studio connected and models loaded.', { type: 'info', title: 'LM Studio Connected' });
                  } else {
                    showAlertDialog('Could not connect to LM Studio at the specified URL.', { type: 'error', title: 'LM Studio Connection Failed' });
                  }
                }}
              >
                <LinkIcon />
              </IconButton>
            </Tooltip>
          </Box>
          {lmStudioAvailable && lmStudioModels.length === 0 && (
            <Typography variant="caption" color="warning.main">
              No vision-capable models found on LM Studio.
            </Typography>
          )}
          {!lmStudioAvailable && (
            <Typography variant="caption" color="error.main">
              LM Studio not available or not running at the specified URL.
            </Typography>
          )}

          {/* Ollama Server URL */}
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'block',
              mb: 1,
              fontFamily: '"Karla", sans-serif'
            }}
          >
            Ollama Server URL
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
            <TextField
              fullWidth
              size="small"
              value={ollamaBaseUrl}
              onChange={(e) => setOllamaBaseUrl(e.target.value)}
              placeholder="http://localhost:11434"
              variant="standard"
              InputLabelProps={{
                sx: { boxShadow: 'none !important' }
              }}
              InputProps={{
                sx: theme => ({
                  fontFamily: '"Inconsolata", monospace',
                  boxShadow: 'none !important',
                  filter: 'none !important',
                  ...(theme.palette.mode === 'light' && {
                    background: 'transparent',
                    '& svg': { filter: 'none !important' }
                  }),
                  '& fieldset': {
                    boxShadow: 'none !important',
                    border: 'none !important'
                  }
                })
              }}
            />
            <Tooltip
              title="Check Ollama Connection"
              placement="right"
              PopperProps={{
                modifiers: [
                  {
                    name: 'offset',
                    options: {
                      offset: [-8, 0],
                    },
                  },
                ],
              }}
            >
              <IconButton
                color="primary"
                size="small"
                sx={{ ml: 1 }}
                onClick={async () => {
                  const ok = await checkOllamaConnection();
                  if (ok) {
                    await fetchOllamaModels();
                    showAlertDialog('Ollama connected and models loaded.', { type: 'info', title: 'Ollama Connected' });
                  } else {
                    showAlertDialog('Could not connect to Ollama at the specified URL.', { type: 'error', title: 'Ollama Connection Failed' });
                  }
                }}
              >
                <LinkIcon />
              </IconButton>
            </Tooltip>
          </Box>
          {ollamaAvailable && ollamaModels.length === 0 && (
            <Typography variant="caption" color="warning.main">
              No vision-capable models found on Ollama.
            </Typography>
          )}
          {!ollamaAvailable && (
            <Typography variant="caption" color="error.main">
              Ollama not available or not running at the specified URL.
            </Typography>
          )}
        </AccordionDetails>
      </Accordion>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography 
          variant="h6"
          sx={{ fontFamily: '"Karla", sans-serif' }}
        >
          Auto-Captioner
        </Typography>
        {/* Font size popover control */}
        <FontSizePopover
          fontSize={fontSize}
          adjustFontSize={adjustFontSize}
        />
      </Box>
      
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <FormControl fullWidth size="small" sx={{ flexGrow: 1 }}>
              <InputLabel sx={{ fontFamily: '"Karla", sans-serif' }}>Caption Style</InputLabel>
              <Select
                value={selectedPromptStyle}
                label="Caption Style"
                onChange={(e) => setPromptStyle(e.target.value)}
                sx={{ fontFamily: '"Inconsolata", monospace' }}
              >
                {promptOptions.map(option => (
                  <MenuItem
                    key={option.name}
                    value={option.name}
                    sx={{ fontFamily: '"Inconsolata", monospace' }}
                  >
                    {option.name}
                    {!option.isDefault && ' (Custom)'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Tooltip title="Manage system prompts">
              <IconButton
                color="primary"
                size="small"
                onClick={() => setPromptManagerOpen(true)}
                sx={{
                  border: theme => `1px solid ${theme.palette.divider}`,
                  borderRadius: 1,
                  height: '40px',
                  width: '40px'
                }}
                aria-label="Manage system prompts"
              >
                <ManageAccountsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography 
              variant="caption"
              sx={{ fontFamily: '"Karla", sans-serif' }}
            >
              Model
            </Typography>
            <Tooltip title="Refresh available models">
              <IconButton size="small" onClick={handleModelMenuOpen} sx={{ p: 0.5 }}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <TextField
            fullWidth
            size="small"
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            placeholder="Filter models"
            variant="standard"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FilterAltIcon fontSize="small" />
                </InputAdornment>
              ),
              sx: {
                fontFamily: '"Inconsolata", monospace'
              }
            }}
            sx={{ mb: 1 }}
          />
          <FormControl fullWidth size="small">
            <Select
              value={selectedModel}
              onChange={(e) => setModel(e.target.value)}
              sx={{ fontFamily: '"Inconsolata", monospace' }}
              renderValue={(value) => {
                const option = modelOptions.find(opt => opt.value === value);
                return option ? option.label : value;
              }}
            >
              {modelOptions.length === 0 ? (
                <MenuItem value="" disabled sx={{ fontFamily: '"Inconsolata", monospace' }}>
                  No models available
                </MenuItem>
              ) : (
                modelOptions.map(option => (
                  <MenuItem
                    key={option.value}
                    value={option.value}
                    sx={{ fontFamily: '"Inconsolata", monospace' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <Typography component="span" sx={{ fontFamily: '"Inconsolata", monospace' }}>
                        {option.label}
                      </Typography>
                      <Tooltip title={pinnedSet.has(option.value) ? 'Unpin model' : 'Pin model'}>
                        <IconButton
                          size="small"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            togglePinnedModel(option.value);
                          }}
                        >
                          {pinnedSet.has(option.value)
                            ? <StarIcon fontSize="small" color="warning" />
                            : <StarBorderIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <Menu
        anchorEl={modelMenuAnchor}
        open={Boolean(modelMenuAnchor)}
        onClose={handleModelMenuClose}
      >
        <MenuItem onClick={() => handleRefreshModels('openai')}>Refresh OpenAI Models</MenuItem>
        <MenuItem onClick={() => handleRefreshModels('anthropic')}>Refresh Anthropic Models</MenuItem>
        <MenuItem onClick={() => handleRefreshModels('gemini')}>Refresh Gemini Models</MenuItem>
        <MenuItem onClick={() => handleRefreshModels('lmstudio')}>Refresh LM Studio Models</MenuItem>
        <MenuItem onClick={() => handleRefreshModels('ollama')}>Refresh Ollama Models</MenuItem>
      </Menu>
      
      {/* Processing indicator and stop button removed - now handled by App.tsx */}
      
      {/* Caption text field with custom scrollbar */}
      <Box 
        sx={{ 
          flex: '1 1 auto',
          minHeight: '100px',
          maxHeight: 'calc(100% - 200px)', // Ensure space for buttons and modification section
          mb: 2,
          position: 'relative',
          // Add a border that matches the TextField outline
          border: '1px solid',
          borderColor: theme => 
            theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.23)' 
              : 'rgba(0, 0, 0, 0.23)',
          borderRadius: '4px',
          '&:hover': {
            borderColor: theme => 
              theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.5)' 
                : 'rgba(0, 0, 0, 0.5)',
          }
        }}
      >
        {/* Label positioned above the scrollable area */}
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            top: '-10px',
            left: '10px',
            backgroundColor: 'background.paper',
            px: 1,
            fontFamily: '"Karla", sans-serif'
          }}
        >
          Caption
        </Typography>
        
        {/* Scrollable content area */}
        <Box
          sx={{
            height: '100%',
            width: '100%',
            overflow: 'auto', // Make this container scrollable
            p: 2,
            // Scrollbar styling to match ImageList
            '&::-webkit-scrollbar': {
              width: '8px',
              backgroundColor: 'transparent',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: theme => 
                theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : 'rgba(0, 0, 0, 0.05)',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: theme => 
                theme.palette.mode === 'dark' 
                  ? 'rgba(0, 150, 136, 0.7)' // Primary color with opacity
                  : 'rgba(0, 150, 136, 0.6)',
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: theme => 
                  theme.palette.mode === 'dark' 
                    ? 'rgba(0, 150, 136, 0.9)' 
                    : 'rgba(0, 150, 136, 0.8)',
              }
            }
          }}
        >
          {/* Text content without TextField border */}
          <Box
            component="div"
            key={caption}
            sx={{
              fontSize: `${fontSize}px`,
              fontFamily: '"Inconsolata", monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              outline: 'none',
              width: '100%',
              minHeight: '100%'
            }}
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => {
              const newValue = e.currentTarget.textContent || '';
              if (newValue !== caption) {
                setCaption(newValue);
                if (selectedImage) {
                  updateCaption(selectedImage, newValue);
                  saveCaption(selectedImage, newValue);
                }
              }
            }}
            onInput={(e) => {
              const newValue = e.currentTarget.textContent || '';
              setCaption(newValue);
              if (selectedImage) {
                updateCaption(selectedImage, newValue);
              }
            }}
            dangerouslySetInnerHTML={{ __html: caption }}
          />
        </Box>
      </Box>
      
      {/* Non-scrollable section for buttons and caption modification */}
      <Box sx={{ flex: '0 0 auto' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleGenerateCaption}
          disabled={isGenerating || !isProviderReady}
          fullWidth
          sx={{ 
            mb: 2,
            bgcolor: theme => theme.palette.mode === 'dark' ? 'secondary.main' : 'primary.main',
            color: 'white',
            '&:hover': {
              bgcolor: theme => theme.palette.mode === 'dark' ? 'secondary.dark' : 'primary.dark',
            },
            fontFamily: '"Karla", sans-serif'
          }}
          startIcon={isGenerating ? null : <AutoAwesomeIcon />}
        >
          {isGenerating ? 'Generating...' : 'Generate Caption'}
        </Button>

        {/* Custom confirmation dialog for multi-image captioning */}
        <AlertDialog
          open={confirmDialogOpen}
          title="Confirm Caption Generation"
          message={`Generate captions for ${pendingImagesToProcess ? pendingImagesToProcess.length : 0} selected images?`}
          type="confirm"
          onClose={() => {
            setConfirmDialogOpen(false);
            setPendingImagesToProcess(null);
          }}
          onConfirm={() => {
            setConfirmDialogOpen(false);
            if (pendingImagesToProcess) {
              startCaptionGeneration(pendingImagesToProcess);
              setPendingImagesToProcess(null);
            }
          }}
          confirmLabel="Confirm"
          cancelLabel="Cancel"
        />
        {/* Themed alert dialog for info/error */}
        <AlertDialog
          open={alertDialogOpen}
          title={alertDialogTitle}
          message={alertDialogMessage}
          type={alertDialogType}
          onClose={() => setAlertDialogOpen(false)}
          onConfirm={alertDialogOnConfirm}
        />
      
        <Typography 
          variant="subtitle2" 
          sx={{ 
            mb: 1,
            fontFamily: '"Karla", sans-serif'
          }}
        >
          Caption Modification
        </Typography>
        
        <TextField
          label="Prepend Text"
          value={prefixText}
          onChange={(e) => useAppStore.setState({ prefixText: e.target.value })}
          fullWidth
          variant="outlined"
          size="small"
          sx={{ 
            mb: 2,
            '& .MuiInputBase-input': {
              fontFamily: '"Inconsolata", monospace'
            },
            '& .MuiInputLabel-root': {
              fontFamily: '"Karla", sans-serif'
            }
          }}
        />
        
        <TextField
          label="Append Text"
          value={suffixText}
          onChange={(e) => useAppStore.setState({ suffixText: e.target.value })}
          fullWidth
          variant="outlined"
          size="small"
          sx={{ 
            '& .MuiInputBase-input': {
              fontFamily: '"Inconsolata", monospace'
            },
            '& .MuiInputLabel-root': {
              fontFamily: '"Karla", sans-serif'
            }
          }}
        />
      </Box>
      </Paper>
      <SystemPromptManagerDialog
        open={isPromptManagerOpen}
        onClose={() => setPromptManagerOpen(false)}
      />
    </>
  );
};

export default CaptionEditor;
