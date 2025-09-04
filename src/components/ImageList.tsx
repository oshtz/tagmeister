import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../context/AppStore';
import { 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemText, 
  ListItemAvatar, 
  Avatar, 
  Typography, 
  Box, 
  Paper,
  Button,
  IconButton,
  LinearProgress,
  CircularProgress
} from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import { invoke } from '@tauri-apps/api/core';

// LRU cache for thumbnails with size limit
class ThumbnailCache {
  private cache = new Map<string, string>();
  private maxSize = 500; // Maximum number of cached thumbnails
  
  get(key: string): string | undefined {
    const value = this.cache.get(key);
    if (value) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }
  
  set(key: string, value: string): void {
    // Remove if already exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // Add to end
    this.cache.set(key, value);
    
    // Evict oldest if over limit
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        console.log(`Evicted thumbnail from cache: ${firstKey}`);
      }
    }
  }
  
  size(): number {
    return this.cache.size;
  }
}

const thumbnailCache = new ThumbnailCache();

const ImageList: React.FC = () => {
  const {
    currentDirectory,
    selectedImages,
    selectedImage,
    captions,
    imageFiles,
    handleImageClick,
    selectAll,
    isProcessing,
    processedCount,
    totalToProcess,
    selectDirectory,
    isLoadingImages
  } = useAppStore();
  
  const listRef = useRef<HTMLUListElement>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [loadingThumbnails, setLoadingThumbnails] = useState<boolean>(false);
  
  // Load thumbnails for all images with parallel processing and caching
  useEffect(() => {
    if (imageFiles.length === 0) return;
    
    console.log('Starting to load thumbnails for', imageFiles.length, 'images');
    
    // Check cache first
    const cachedUrls: Record<string, string> = {};
    const filesToLoad: typeof imageFiles = [];
    
    imageFiles.forEach(file => {
      const cached = thumbnailCache.get(file.path);
      if (cached) {
        cachedUrls[file.path] = cached;
      } else {
        filesToLoad.push(file);
      }
    });
    
    // Set cached thumbnails immediately
    if (Object.keys(cachedUrls).length > 0) {
      console.log(`Found ${Object.keys(cachedUrls).length} cached thumbnails`);
      setImageUrls(cachedUrls);
    }
    
    // If all thumbnails are cached, we're done
    if (filesToLoad.length === 0) {
      console.log('All thumbnails were cached');
      setLoadingThumbnails(false);
      return;
    }
    
    console.log(`Need to load ${filesToLoad.length} new thumbnails`);
    setLoadingThumbnails(true);
    
    // Load thumbnails in parallel batches for better performance
    const loadThumbnailsBatch = async () => {
      const batchSize = 10; // Process 10 images concurrently for maximum speed
      const newImageUrls: Record<string, string> = { ...cachedUrls };
      
      for (let i = 0; i < filesToLoad.length; i += batchSize) {
        const batch = filesToLoad.slice(i, i + batchSize);
        console.log(`Loading batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(filesToLoad.length / batchSize)} (${batch.length} images)`);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (file) => {
          try {
            // Use smaller thumbnail size (64px) and lower quality for faster loading
            const base64 = await invoke<string>('read_thumbnail_as_base64', {
              path: file.path,
              maxSize: 64,
              quality: 60
            });
            return { path: file.path, base64, success: true };
          } catch (err) {
            console.error(`Error loading thumbnail for ${file.name}:`, err);
            return { path: file.path, base64: '', success: false };
          }
        });
        
        // Wait for batch to complete
        const batchResults = await Promise.all(batchPromises);
        
        // Update URLs and cache for successful loads
        batchResults.forEach(result => {
          if (result.success && result.base64) {
            const dataUrl = `data:image/jpeg;base64,${result.base64}`;
            newImageUrls[result.path] = dataUrl;
            // Cache the thumbnail with LRU eviction
            thumbnailCache.set(result.path, dataUrl);
          }
        });
        
        // Update state after each batch for progressive loading
        setImageUrls({ ...newImageUrls });
        
        // Small delay between batches to prevent overwhelming the system
        if (i + batchSize < filesToLoad.length) {
          await new Promise(resolve => setTimeout(resolve, 30));
        }
      }
      
      console.log(`Finished loading thumbnails. Successfully loaded: ${Object.keys(newImageUrls).length}/${imageFiles.length}. Cache size: ${thumbnailCache.size()}`);
      setLoadingThumbnails(false);
    };
    
    loadThumbnailsBatch();
  }, [imageFiles]);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+A to select all images, but only if no text input is focused
      if (e.ctrlKey && e.key === 'a') {
        // Check if the active element is a text input field
        const activeElement = document.activeElement;
        const isTextInputFocused = activeElement instanceof HTMLInputElement || 
                                  activeElement instanceof HTMLTextAreaElement || 
                                  (activeElement as HTMLElement)?.isContentEditable;
        
        // Only select all images if no text input is focused
        if (!isTextInputFocused) {
          e.preventDefault();
          selectAll();
        }
        // If a text input is focused, let the browser handle the Ctrl+A (select all text)
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectAll]);
  
  // Render the image list content
  const renderContent = () => {
    if (!currentDirectory) {
      return (
        <Box sx={{ flexGrow: 1 }}></Box>
      );
    }
    
    return (
      <List 
        ref={listRef} 
        dense 
        sx={{ 
          p: 0, 
          overflow: 'auto',
          flexGrow: 1,
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
        {imageFiles.map((file) => {
          const path = file.path;
          const isSelected = selectedImage === path;
          const caption = captions[path];
          
          // Use the name from the file info
          const fileName = file.name;
          
          return (
            <ListItem 
              key={path}
              disablePadding
            >
              <ListItemButton
                selected={isSelected}
                onClick={(e) => {
                  const isCtrlPressed = e.ctrlKey;
                  const isShiftPressed = e.shiftKey;
                  handleImageClick(path, { isCtrlPressed, isShiftPressed });
                }}
                sx={{
                  '&.Mui-selected': {
                    bgcolor: 'primary.light',
                  },
                  py: 1,
                  position: 'relative'
                }}
              >
                <ListItemAvatar>
                  <Avatar 
                    variant="rounded" 
                    src={imageUrls[path] || ''}
                    sx={{ 
                      width: 60, 
                      height: 60, 
                      mr: 1,
                      borderRadius: '4px'
                    }}
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={fileName}
                  secondary={caption}
                  primaryTypographyProps={{
                    noWrap: true,
                    variant: 'body2',
                    sx: { 
                      color: theme => theme.palette.mode === 'dark' ? 'white' : 'black',
                      fontWeight: 500
                    }
                  }}
                  secondaryTypographyProps={{
                    noWrap: true,
                    variant: 'caption',
                    sx: { 
                      color: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }
                  }}
                />
                
                {/* Selection indicator - squircle shape */}
                {selectedImages.has(path) && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 16,
                      height: 16,
                      borderRadius: '6px',
                      bgcolor: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}
                  >
                    ✓
                  </Box>
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    );
  };
  
  const isBlocking = isLoadingImages || loadingThumbnails;

  return (
    <Box 
      sx={{ 
        height: '100%', 
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
      aria-busy={isBlocking}
    >
      {(isLoadingImages || loadingThumbnails) && (
        <LinearProgress 
          color="primary"
          sx={{ position: 'sticky', top: 0, left: 0, right: 0, zIndex: 3, borderRadius: 0 }}
        />
      )}
      {/* Header with squircle buttons */}
      <Box 
        sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        {/* Left side - Directory info or prompt */}
        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
          {currentDirectory ? (
            <Typography 
              variant="body2" 
              noWrap 
              title={currentDirectory}
              sx={{ 
                fontFamily: '"Inconsolata", monospace',
                opacity: 0.7
              }}
            >
              {currentDirectory.split(/[\/\\]/).pop()}
            </Typography>
          ) : (
            <Typography 
              variant="body2" 
              sx={{ 
                fontFamily: '"Inconsolata", monospace',
                opacity: 0.7
              }}
            >
              Select a directory
            </Typography>
          )}
        </Box>
        
        {/* Right side - Action buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* Select All button moved to bottom */}
          
          <Tooltip title="Open Directory">
            <IconButton 
              onClick={() => {
                console.log('Folder button clicked');
                selectDirectory();
              }} 
              size="small"
              sx={{
                borderRadius: '12px',
                padding: '6px',
                backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                '&:hover': {
                  backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'
                }
              }}
            >
              <FolderOpenIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {renderContent()}
      
      {/* Anchored Select All button at the bottom */}
      {currentDirectory && (
        <Box
          sx={{
            position: 'sticky',
            bottom: 0,
            left: 0,
            width: '100%',
            bgcolor: theme => theme.palette.background.paper,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            py: 1,
            borderTop: 1,
            borderColor: 'divider',
            zIndex: 2
          }}
        >
          <Button
            onClick={selectAll}
            startIcon={<SelectAllIcon fontSize="small" />}
            // variant="outlined"
            size="medium"
            sx={{
              borderRadius: '12px',
              padding: '8px 16px',
              backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
              '&:hover': {
                backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'
              },
              fontWeight: 600,
              textTransform: 'none'
            }}
          >
            Select All
          </Button>
        </Box>
      )}
      
      {/* Processing overlay removed - now handled by App.tsx */}

      {/* Interaction-blocking overlay while loading */}
      {isBlocking && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 4,
            bgcolor: theme => theme.palette.mode === 'dark' 
              ? 'rgba(0,0,0,0.35)'
              : 'rgba(255,255,255,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto',
            cursor: 'wait'
          }}
        >
          <CircularProgress size={24} />
        </Box>
      )}
    </Box>
  );
};

export default ImageList;
