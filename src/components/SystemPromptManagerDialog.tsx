import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveIcon from '@mui/icons-material/Save';
import CheckIcon from '@mui/icons-material/Check';
import { useAppStore } from '../context/AppStore';

const NEW_PROMPT_ID = '__new_prompt__';

type FormState = {
  name: string;
  description: string;
  text: string;
  isDefault: boolean;
  originalName?: string;
};

const blankFormState: FormState = {
  name: '',
  description: '',
  text: '',
  isDefault: false,
};

interface SystemPromptManagerDialogProps {
  open: boolean;
  onClose: () => void;
}

const SystemPromptManagerDialog: React.FC<SystemPromptManagerDialogProps> = ({ open, onClose }) => {
  const {
    selectedPromptStyle,
    setPromptStyle,
    getSystemPromptOptions,
    saveCustomSystemPrompt,
    deleteCustomSystemPrompt,
  } = useAppStore();
  const promptOptions = getSystemPromptOptions();
  const [activePromptName, setActivePromptName] = useState<string>(selectedPromptStyle);
  const [formState, setFormState] = useState<FormState>({ ...blankFormState });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setActivePromptName(selectedPromptStyle);
    }
  }, [open, selectedPromptStyle]);

  useEffect(() => {
    if (!open) return;
    if (activePromptName === NEW_PROMPT_ID) {
      setFormState({ ...blankFormState });
      setError(null);
      return;
    }
    const prompt = promptOptions.find(p => p.name === activePromptName) ?? promptOptions[0];
    if (prompt) {
      setFormState({
        name: prompt.name,
        description: prompt.description || '',
        text: prompt.text,
        isDefault: prompt.isDefault,
        originalName: prompt.isDefault ? undefined : prompt.name,
      });
      setError(null);
    }
  }, [activePromptName, promptOptions, open]);

  useEffect(() => {
    if (!open || activePromptName === NEW_PROMPT_ID) return;
    const exists = promptOptions.some(prompt => prompt.name === activePromptName);
    if (!exists && promptOptions.length > 0) {
      setActivePromptName(promptOptions[0].name);
    }
  }, [promptOptions, activePromptName, open]);

  const handleCreateNewPrompt = () => {
    setActivePromptName(NEW_PROMPT_ID);
    setFormState({ ...blankFormState });
    setError(null);
  };

  const handleInputChange = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormState(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSave = (): string | null => {
    if (formState.isDefault) {
      setError('Default prompts cannot be edited.');
      return null;
    }
    const trimmedName = formState.name.trim();
    const trimmedText = formState.text.trim();
    const trimmedDescription = formState.description.trim();
    if (!trimmedName || !trimmedText) {
      setError('Name and prompt text are required.');
      return null;
    }
    const duplicate = promptOptions.find(
      prompt => prompt.name === trimmedName && prompt.name !== formState.originalName
    );
    if (duplicate) {
      setError('A prompt with this name already exists.');
      return null;
    }

    saveCustomSystemPrompt({
      name: trimmedName,
      description: trimmedDescription,
      text: trimmedText,
      originalName: formState.originalName,
    });

    setFormState({
      name: trimmedName,
      description: trimmedDescription,
      text: trimmedText,
      isDefault: false,
      originalName: trimmedName,
    });
    setActivePromptName(trimmedName);
    setError(null);
    return trimmedName;
  };

  const handleDelete = () => {
    if (!formState.originalName) {
      return;
    }
    const confirmed = window.confirm(`Delete "${formState.originalName}" permanently?`);
    if (!confirmed) {
      return;
    }
    deleteCustomSystemPrompt(formState.originalName);
    setError(null);
    setActivePromptName(selectedPromptStyle);
  };

  const handleUsePrompt = () => {
    let promptNameToUse = formState.name;
    if (!promptNameToUse) {
      setError('Save the prompt before using it.');
      return;
    }
    if (!formState.isDefault) {
      const savedName = handleSave();
      if (!savedName) {
        return;
      }
      promptNameToUse = savedName;
    }
    setPromptStyle(promptNameToUse);
    onClose();
  };

  const canSave = !formState.isDefault && Boolean(formState.name.trim()) && Boolean(formState.text.trim());
  const canDelete = Boolean(formState.originalName);
  const canUsePrompt = activePromptName !== NEW_PROMPT_ID || !!formState.originalName;

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
          backgroundColor: theme =>
            theme.palette.mode === 'dark'
              ? theme.palette.background.default
              : theme.palette.background.paper,
        },
      }}
    >
      <DialogTitle>Manage System Prompts</DialogTitle>
      <DialogContent
        dividers
        sx={{
          minHeight: 420,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Grid container spacing={3} sx={{ flexGrow: 1, minHeight: 0 }}>
          <Grid item xs={12} md={4} sx={{ height: '100%', minHeight: 0 }}>
            <Stack spacing={1.5} sx={{ height: '100%', minHeight: 0 }}>
              <Typography variant="body2" color="text.secondary">
                Choose a prompt to preview or edit. Defaults are read-only.
              </Typography>
              <Box
                sx={{
                  border: theme => `1px solid ${theme.palette.divider}`,
                  borderRadius: 1,
                  overflow: 'hidden',
                  flexGrow: 1,
                  minHeight: 0,
                }}
              >
                <List dense disablePadding sx={{ maxHeight: '100%', overflowY: 'auto' }}>
                  {promptOptions.map(prompt => (
                    <ListItemButton
                      key={prompt.name}
                      selected={activePromptName === prompt.name}
                      onClick={() => setActivePromptName(prompt.name)}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: prompt.isDefault ? 600 : 500 }}>
                            {prompt.name}
                          </Typography>
                        }
                        secondary={prompt.description || (prompt.isDefault ? 'Default prompt' : 'Custom prompt')}
                      />
                      <Chip
                        label={prompt.isDefault ? 'Default' : 'Custom'}
                        size="small"
                        color={prompt.isDefault ? 'default' : 'primary'}
                      />
                    </ListItemButton>
                  ))}
                  {promptOptions.length === 0 && (
                    <Box sx={{ p: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        No prompts available.
                      </Typography>
                    </Box>
                  )}
                </List>
              </Box>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleCreateNewPrompt}
              >
                New Custom Prompt
              </Button>
            </Stack>
          </Grid>
          <Grid item xs={12} md={8} sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Stack spacing={2} sx={{ height: '100%', minHeight: 0 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {formState.isDefault ? 'Default Prompt' : formState.originalName ? 'Edit Custom Prompt' : 'New Custom Prompt'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formState.isDefault
                    ? 'Default prompts cannot be edited.'
                    : 'Name and store your own captioning instructions locally.'}
                </Typography>
              </Box>
              <TextField
                label="Prompt Name"
                value={formState.name}
                onChange={handleInputChange('name')}
                fullWidth
                disabled={formState.isDefault}
                InputProps={{ sx: { fontFamily: '"Karla", sans-serif' } }}
              />
              <TextField
                label="Description (optional)"
                value={formState.description}
                onChange={handleInputChange('description')}
                fullWidth
                disabled={formState.isDefault}
                InputProps={{ sx: { fontFamily: '"Karla", sans-serif' } }}
              />
              <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <TextField
                  label="System Prompt"
                  value={formState.text}
                  onChange={handleInputChange('text')}
                  fullWidth
                  multiline
                  minRows={8}
                  sx={{
                    flexGrow: 1,
                    '& .MuiInputBase-root': {
                      flexGrow: 1,
                      height: '100%',
                      alignItems: 'stretch',
                    },
                  }}
                  InputProps={{
                    readOnly: formState.isDefault,
                    sx: {
                      fontFamily: '"Inconsolata", monospace',
                      '& .MuiInputBase-inputMultiline': {
                        flexGrow: 1,
                        height: '100% !important',
                        overflowY: 'auto',
                        fontFamily: '"Inconsolata", monospace',
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
                        },
                        '&::-webkit-scrollbar-thumb:hover': {
                          backgroundColor: theme =>
                            theme.palette.mode === 'dark'
                              ? 'rgba(0, 150, 136, 0.9)'
                              : 'rgba(0, 150, 136, 0.8)',
                        },
                      },
                    },
                  }}
                />
              </Box>
              {error && (
                <Typography variant="body2" color="error">
                  {error}
                </Typography>
              )}
              {!formState.isDefault && (
                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    disabled={!canSave}
                  >
                    Save Prompt
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteOutlineIcon />}
                    onClick={handleDelete}
                    disabled={!canDelete}
                  >
                    Delete
                  </Button>
                </Stack>
              )}
            </Stack>
          </Grid>
        </Grid>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          startIcon={<CheckIcon />}
          onClick={handleUsePrompt}
          disabled={!canUsePrompt}
        >
          Use Prompt
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SystemPromptManagerDialog;
