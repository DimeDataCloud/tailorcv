// Model Manager — handles downloading, caching, and loading the Qwen2.5-1.5B
// GGUF model for on-device inference via llama.rn.
//
// On first launch: downloads ~1GB GGUF from HuggingFace, caches in app docs dir.
// On subsequent launches: loads from cache instantly.
// Provides progress callback for UI feedback.

import { Platform } from 'react-native';

// Lazy-load native modules — wrapped in functions so they're never called
// at import time. A missing native module won't crash the app.
function getInitLlama(): any {
  if (Platform.OS === 'web') return null;
  try {
    return require('llama.rn').initLlama;
  } catch {
    return null;
  }
}

function getFileSystem(): any {
  if (Platform.OS === 'web') return null;
  try {
    return require('expo-file-system');
  } catch {
    return null;
  }
}

// Model config — Qwen2.5-1.5B-Instruct, Q4_K_M quantization (~1GB)
// Downloads on first launch from HuggingFace, caches in app's document directory.
// This keeps the APK small (~50MB instead of ~1GB+).
const MODEL_URL = 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf';
const MODEL_FILENAME = 'qwen2.5-1.5b-instruct-q4_k_m.gguf';
const MODEL_CACHE_DIR = 'models';

export type DownloadProgress = (progress: number) => void; // 0.0 to 1.0

let cachedContext: any = null; // Singleton — keep model loaded between calls

/**
 * Get the local file path for the cached model.
 */
async function getModelPath(): Promise<string> {
  const FileSystem = getFileSystem();
  if (!FileSystem) throw new Error('expo-file-system not available');
  const docDir = FileSystem.documentDirectory;
  const modelDir = `${docDir}${MODEL_CACHE_DIR}`;
  const dirInfo = await FileSystem.getInfoAsync(modelDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });
  }
  return `${modelDir}/${MODEL_FILENAME}`;
}

/**
 * Check if the model is already downloaded and cached.
 */
export async function isModelDownloaded(): Promise<boolean> {
  if (Platform.OS === 'web') return true; // Web uses Ollama
  const FileSystem = getFileSystem();
  if (!FileSystem) return false;
  try {
    const path = await getModelPath();
    const info = await FileSystem.getInfoAsync(path);
    return info.exists && info.size > 100_000_000;
  } catch {
    return false;
  }
}

/**
 * Download the model from HuggingFace. Reports progress via callback.
 * This is a ~1GB download — show a progress bar to the user.
 */
export async function downloadModel(onProgress?: DownloadProgress): Promise<string> {
  const FileSystem = getFileSystem();
  if (!FileSystem) throw new Error('expo-file-system not available');

  const path = await getModelPath();

  // Check if already downloaded
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists && info.size > 100_000_000) {
    onProgress?.(1);
    return path;
  }

  // Download using expo-file-system's downloadAsync with progress
  // Note: FileSystem.downloadAsync doesn't support progress callbacks directly,
  // so we use a polling approach on the download result.
  const callback = (downloadProgress: any) => {
    if (onProgress && downloadProgress.totalBytesExpectedToWrite > 0) {
      const pct = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
      onProgress(Math.min(pct, 0.99));
    }
  };

  const result = await FileSystem.downloadAsync(
    MODEL_URL,
    path,
    {},
    callback
  );

  if (result.status !== 200) {
    throw new Error(`Download failed: HTTP ${result.status}`);
  }

  onProgress?.(1);
  return result.uri;
}

/**
 * Load the model into memory via llama.rn and return a context for inference.
 * Uses a singleton pattern — the model stays loaded between calls.
 */
export async function getLlamaContext(): Promise<any> {
  if (cachedContext) return cachedContext;
  const initLlama = getInitLlama();
  if (!initLlama) throw new Error('llama.rn not available (requires EAS dev build)');
  const FileSystem = getFileSystem();
  if (!FileSystem) throw new Error('expo-file-system not available');

  const modelPath = await getModelPath();
  const info = await FileSystem.getInfoAsync(modelPath);
  if (!info.exists) {
    throw new Error('Model not downloaded. Call downloadModel() first.');
  }

  // Load the model from the downloaded file in the app's document directory
  const context = await initLlama({
    model: modelPath,
    is_model_asset: false,
    n_ctx: 4096,        // Context window
    n_gpu_layers: 0,    // CPU-only for broad compatibility (adjust per-device)
    use_mlock: true,    // Lock model in RAM to prevent swapping
    use_mmap: true,     // Memory-map the file (faster load, less RAM)
  });

  cachedContext = context;
  return context;
}

/**
 * Check if on-device AI is available (llama.rn installed + model downloaded).
 */
export async function isAIAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return true; // Web uses Ollama on localhost
  if (!getInitLlama() || !getFileSystem()) return false;
  return await isModelDownloaded();
}

/**
 * Release the model from memory (frees RAM).
 */
export async function releaseModel(): Promise<void> {
  if (cachedContext) {
    try {
      await cachedContext.release();
    } catch {}
    cachedContext = null;
  }
}
