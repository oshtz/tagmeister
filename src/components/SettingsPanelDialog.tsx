import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
  Divider,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LinkIcon from '@mui/icons-material/Link';
import { useAppStore } from '../context/AppStore';

interface SettingsPanelDialogProps {
  open: boolean;
  onClose: () => void;
}

const SettingsPanelDialog: React.FC<SettingsPanelDialogProps> = ({ open, onClose }) => {
  const {
    apiKey,
    setApiKey,
    apiKeyVisible,
    toggleApiKeyVisibility,
    anthropicApiKey,
    setAnthropicApiKey,
    anthropicApiKeyVisible,
    toggleAnthropicApiKeyVisibility,
    geminiApiKey,
    setGeminiApiKey,
    geminiApiKeyVisible,
    toggleGeminiApiKeyVisibility,
    openRouterApiKey,
    setOpenRouterApiKey,
    openRouterApiKeyVisible,
    toggleOpenRouterApiKeyVisibility,
    lmStudioBaseUrl,
    setLMStudioBaseUrl,
    checkLMStudioConnection,
    fetchLMStudioModels,
    lmStudioAvailable,
    lmStudioModels,
    ollamaBaseUrl,
    setOllamaBaseUrl,
    checkOllamaConnection,
    fetchOllamaModels,
    ollamaAvailable,
    ollamaModels,
    showAlertDialog,
  } = useAppStore();

  const renderApiKeyField = (
    label: string,
    value: string,
    setter: (value: string) => void,
    visible: boolean,
    toggleVisibility: () => void,
    placeholder: string
  ) => (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          mb: 1,
          fontFamily: '"Karla", sans-serif',
        }}
      >
        {label}
      </Typography>
      <TextField
        fullWidth
        size="small"
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => setter(event.target.value)}
        placeholder={placeholder}
        variant="standard"
        InputLabelProps={{
          sx: { boxShadow: 'none !important' },
        }}
        InputProps={{
          sx: (theme) => ({
            fontFamily: '"Inconsolata", monospace',
            boxShadow: 'none !important',
            filter: 'none !important',
            ...(theme.palette.mode === 'light' && {
              background: 'transparent',
              '& svg': { filter: 'none !important' },
            }),
            '& fieldset': {
              boxShadow: 'none !important',
              border: 'none !important',
            },
          }),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={toggleVisibility}
                edge="end"
                size="small"
                sx={{
                  boxShadow: 'none !important',
                  border: 'none',
                }}
              >
                {visible ? <VisibilityOffIcon /> : <VisibilityIcon color="primary" />}
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={(theme) => ({
          boxShadow: 'none !important',
          filter: 'none !important',
          ...(theme.palette.mode === 'light' && {
            '& .MuiOutlinedInput-notchedOutline': {
              boxShadow: 'none !important',
              border: 'none !important',
            },
            '& .MuiInputBase-root': {
              boxShadow: 'none !important',
              border: 'none !important',
            },
          }),
        })}
      />
    </Box>
  );

  const renderServerField = (
    label: string,
    value: string,
    setter: (value: string) => void,
    placeholder: string,
    onCheck: () => Promise<void>,
    status: { available: boolean; emptyMessage: string; missingMessage: string }
  ) => (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          mb: 1,
          fontFamily: '"Karla", sans-serif',
        }}
      >
        {label}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          fullWidth
          size="small"
          value={value}
          onChange={(event) => setter(event.target.value)}
          placeholder={placeholder}
          variant="standard"
          InputLabelProps={{
            sx: { boxShadow: 'none !important' },
          }}
          InputProps={{
            sx: (theme) => ({
              fontFamily: '"Inconsolata", monospace',
              boxShadow: 'none !important',
              filter: 'none !important',
              ...(theme.palette.mode === 'light' && {
                background: 'transparent',
                '& svg': { filter: 'none !important' },
              }),
              '& fieldset': {
                boxShadow: 'none !important',
                border: 'none !important',
              },
            }),
          }}
        />
        <Tooltip title={`Check ${label} connection`}>
          <IconButton color="primary" size="small" onClick={onCheck}>
            <LinkIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ mt: 1 }}>
        {status.available && status.emptyMessage && (
          <Typography variant="caption" color="warning.main">
            {status.emptyMessage}
          </Typography>
        )}
        {!status.available && status.missingMessage && (
          <Typography variant="caption" color="error.main">
            {status.missingMessage}
          </Typography>
        )}
      </Box>
    </Box>
  );

  const handleLMStudioCheck = async () => {
    const ok = await checkLMStudioConnection();
    if (ok) {
      await fetchLMStudioModels();
      showAlertDialog('LM Studio connected and models loaded.', { type: 'info', title: 'LM Studio Connected' });
    } else {
      showAlertDialog('Could not connect to LM Studio at the specified URL.', { type: 'error', title: 'LM Studio Connection Failed' });
    }
  };

  const handleOllamaCheck = async () => {
    const ok = await checkOllamaConnection();
    if (ok) {
      await fetchOllamaModels();
      showAlertDialog('Ollama connected and models loaded.', { type: 'info', title: 'Ollama Connected' });
    } else {
      showAlertDialog('Could not connect to Ollama at the specified URL.', { type: 'error', title: 'Ollama Connection Failed' });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          height: { xs: '85vh', md: '75vh' },
          maxHeight: '90vh',
          width: '100%',
          backgroundColor: (theme) =>
            theme.palette.mode === 'dark'
              ? theme.palette.grey[900]
              : theme.palette.background.paper,
        },
      }}
    >
      <DialogTitle>Settings</DialogTitle>
      <DialogContent
        dividers
        sx={{
          py: 3,
          px: { xs: 2, md: 3 },
        }}
      >
        <Typography variant="subtitle1" sx={{ fontFamily: '"Karla", sans-serif', mb: 2 }}>
          Remote APIs
        </Typography>
        {renderApiKeyField('OpenAI API Key', apiKey, setApiKey, apiKeyVisible, toggleApiKeyVisibility, 'Enter OpenAI API Key')}
        {renderApiKeyField('Anthropic API Key', anthropicApiKey, setAnthropicApiKey, anthropicApiKeyVisible, toggleAnthropicApiKeyVisibility, 'Enter Anthropic API Key')}
        {renderApiKeyField('OpenRouter API Key', openRouterApiKey, setOpenRouterApiKey, openRouterApiKeyVisible, toggleOpenRouterApiKeyVisibility, 'Enter OpenRouter API Key')}
        {renderApiKeyField('Gemini API Key', geminiApiKey, setGeminiApiKey, geminiApiKeyVisible, toggleGeminiApiKeyVisibility, 'Enter Gemini API Key')}

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" sx={{ fontFamily: '"Karla", sans-serif', mb: 2 }}>
          Local Runtimes
        </Typography>
        {renderServerField(
          'LM Studio Server URL',
          lmStudioBaseUrl,
          setLMStudioBaseUrl,
          'http://localhost:1234/v1',
          handleLMStudioCheck,
          {
            available: lmStudioAvailable && lmStudioModels.length === 0,
            emptyMessage: 'No vision-capable models found on LM Studio.',
            missingMessage: !lmStudioAvailable ? 'LM Studio not available or not running at the specified URL.' : '',
          }
        )}
        {renderServerField(
          'Ollama Server URL',
          ollamaBaseUrl,
          setOllamaBaseUrl,
          'http://localhost:11434',
          handleOllamaCheck,
          {
            available: ollamaAvailable && ollamaModels.length === 0,
            emptyMessage: 'No vision-capable models found on Ollama.',
            missingMessage: !ollamaAvailable ? 'Ollama not available or not running at the specified URL.' : '',
          }
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="contained" color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsPanelDialog;
