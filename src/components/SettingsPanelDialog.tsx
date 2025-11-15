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
  Switch,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LinkIcon from '@mui/icons-material/Link';
import { useAppStore, type ProviderId } from '../context/AppStore';

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
    enabledProviders,
    setProviderEnabled,
  } = useAppStore();

  const renderApiKeyField = (
    label: string,
    value: string,
    setter: (value: string) => void,
    visible: boolean,
    toggleVisibility: () => void,
    placeholder: string,
    provider?: ProviderId
  ) => (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            fontFamily: '"Karla", sans-serif',
          }}
        >
          {label}
        </Typography>
        {provider && (
          <Tooltip title="Show provider models in the dropdown">
            <Switch
              size="small"
              checked={enabledProviders[provider]}
              onChange={(_, checked) => setProviderEnabled(provider, checked)}
            />
          </Tooltip>
        )}
      </Box>
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
    status: { available: boolean; emptyMessage: string; missingMessage: string },
    provider?: ProviderId
  ) => (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            fontFamily: '"Karla", sans-serif',
          }}
        >
          {label}
        </Typography>
        {provider && (
          <Tooltip title="Show provider models in the dropdown">
            <Switch
              size="small"
              checked={enabledProviders[provider]}
              onChange={(_, checked) => setProviderEnabled(provider, checked)}
            />
          </Tooltip>
        )}
      </Box>
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
          <IconButton
            color="primary"
            size="small"
            onClick={() => {
              void onCheck();
            }}
          >
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
          py: 2,
          px: { xs: 1.5, md: 2 },
          overflowY: 'auto',
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
                ? 'rgba(0, 150, 136, 0.7)'
                : 'rgba(0, 150, 136, 0.6)',
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: theme =>
                theme.palette.mode === 'dark'
                  ? 'rgba(0, 150, 136, 0.9)'
                  : 'rgba(0, 150, 136, 0.8)',
            },
          },
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

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" sx={{ fontFamily: '"Karla", sans-serif' }}>
          Provider Visibility
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Toggle which providers appear in the model picker. Your pinned models remain available even if their provider is hidden.
        </Typography>
        <Grid container spacing={2}>
          {providerToggleOptions.map(option => (
            <Grid item xs={12} sm={6} key={option.id}>
              <Box
                sx={{
                  border: theme => `1px solid ${theme.palette.divider}`,
                  borderRadius: 1,
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                <Box sx={{ maxWidth: '70%' }}>
                  <Typography variant="subtitle2" sx={{ fontFamily: '"Karla", sans-serif' }}>
                    {option.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.description}
                  </Typography>
                </Box>
                <Switch
                  size="small"
                  checked={enabledProviders[option.id]}
                  onChange={(_, checked) => setProviderEnabled(option.id, checked)}
                />
              </Box>
            </Grid>
          ))}
        </Grid>
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
