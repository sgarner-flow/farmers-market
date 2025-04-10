import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';

// Configuration options for our resilient OpenAI client
interface ResilientOpenAIOptions {
  maxRetries?: number;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
  timeoutMs?: number;
  jitterFactor?: number;
}

// Default configuration values
const DEFAULT_CONFIG: ResilientOpenAIOptions = {
  maxRetries: 3,             // Exactly 3 retries for consistency
  initialRetryDelay: 1000,   // Start with a 1 second delay
  maxRetryDelay: 15000,      // Max retry delay of 15 seconds
  timeoutMs: 60000,          // Full 60 second timeout (maximum allowed by Vercel)
  jitterFactor: 0.25,        // Add random jitter to retry delay (±25%)
};

/**
 * Creates a configured OpenAI client with enhanced error handling
 */
export function createOpenAIClient(options?: Partial<ResilientOpenAIOptions>): OpenAI {
  // Get API key from environment
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  // Merge provided options with defaults
  const config = { ...DEFAULT_CONFIG, ...options };

  // Create an OpenAI client with our configuration
  return new OpenAI({
    apiKey,
    maxRetries: config.maxRetries,
    timeout: config.timeoutMs,
  });
}

/**
 * Error types that warrant a retry
 */
const RETRYABLE_ERROR_TYPES = [
  'timeout',
  'server_error',
  'service_unavailable',
  'connection_error',
];

const RETRYABLE_ERROR_CODES = [
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNABORTED',
  'ECONNREFUSED',
];

const RETRYABLE_ERROR_STATUSES = [408, 429, 500, 502, 503, 504];

/**
 * Makes a resilient API call to OpenAI with intelligent retry logic
 */
export async function callWithRetries<T>(
  apiCall: () => Promise<T>,
  options?: Partial<ResilientOpenAIOptions>
): Promise<T> {
  // Merge provided options with defaults
  const config = { ...DEFAULT_CONFIG, ...options };
  
  let lastError: any;
  let retryCount = 0;

  // Create a retry delay calculator with exponential backoff and jitter
  const getRetryDelay = (attempt: number) => {
    const baseDelay = Math.min(
      config.maxRetryDelay!,
      config.initialRetryDelay! * Math.pow(2, attempt)
    );
    
    // Add jitter to prevent synchronized retry storms
    const jitter = baseDelay * config.jitterFactor! * (Math.random() * 2 - 1);
    return Math.max(0, Math.floor(baseDelay + jitter));
  };

  // Determine if an error is retryable
  const isRetryableError = (error: any): boolean => {
    // Always retry AbortError (timeout)
    if (error.name === 'AbortError') return true;
    
    // Retry based on OpenAI error type
    if (RETRYABLE_ERROR_TYPES.includes(error.type)) return true;
    
    // Retry based on network error codes
    if (RETRYABLE_ERROR_CODES.includes(error.code)) return true;
    
    // Retry based on HTTP status codes
    if (RETRYABLE_ERROR_STATUSES.includes(error.status)) return true;
    
    return false;
  };

  // Attempt the call with retries
  while (retryCount <= config.maxRetries!) {
    try {
      // Set up AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);
      
      try {
        // Create a context for the API call
        const context = { signal: controller.signal };
        
        // Call the API
        const result = await apiCall();
        clearTimeout(timeoutId);
        return result;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error: any) {
      lastError = error;
      
      // Determine if we should retry
      const shouldRetry = retryCount < config.maxRetries! && isRetryableError(error);
      if (!shouldRetry) break;
      
      // Calculate retry delay with exponential backoff and jitter
      const delay = getRetryDelay(retryCount);
      retryCount++;
      
      console.warn(`OpenAI API call failed (attempt ${retryCount}/${config.maxRetries}), retrying in ${delay}ms`, {
        errorType: error.type,
        errorName: error.name,
        errorCode: error.code,
        errorStatus: error.status,
        errorMessage: error.message,
      });
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // If we got here, we've exhausted our retries
  console.error('OpenAI API call failed after all retry attempts', {
    maxRetries: config.maxRetries,
    errorType: lastError.type,
    errorName: lastError.name,
    errorCode: lastError.code,
    errorStatus: lastError.status,
    errorMessage: lastError.message,
  });
  
  throw lastError;
}

/**
 * Utility function for making OpenAI chat completions with resilience
 */
export async function createChatCompletion(
  messages: ChatCompletionMessageParam[],
  model: string = 'gpt-4o',
  options?: {
    temperature?: number;
    max_tokens?: number;
    apiOptions?: Partial<ResilientOpenAIOptions>;
  }
) {
  const openai = createOpenAIClient(options?.apiOptions);
  
  return callWithRetries(
    async () => {
      return await openai.chat.completions.create({
        model,
        messages,
        temperature: options?.temperature ?? 0.5,
        max_tokens: options?.max_tokens ?? 2000,
      });
    },
    options?.apiOptions
  );
} 