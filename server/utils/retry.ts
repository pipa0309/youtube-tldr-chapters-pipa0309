interface RetryOptions {
  maxRetries: number;
  delay: number;
  backoffMultiplier?: number;
  maxDelay?: number;
}

export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxRetries, delay, backoffMultiplier = 2, maxDelay = 30000 } = options;
  
  let lastError: Error;
  let currentDelay = delay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }

      console.warn(`Operation failed (attempt ${attempt + 1}/${maxRetries + 1}):`, lastError.message);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      
      // Increase delay for next attempt (exponential backoff)
      currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError!;
}

export async function retryWithCondition<T>(
  operation: () => Promise<T>,
  shouldRetry: (error: Error, attempt: number) => boolean,
  options: Omit<RetryOptions, 'maxRetries'> & { maxRetries?: number }
): Promise<T> {
  const { maxRetries = 3, delay, backoffMultiplier = 2, maxDelay = 30000 } = options;
  
  let lastError: Error;
  let currentDelay = delay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we should retry this specific error
      if (attempt === maxRetries || !shouldRetry(lastError, attempt)) {
        throw lastError;
      }

      console.warn(`Operation failed (attempt ${attempt + 1}/${maxRetries + 1}):`, lastError.message);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      
      // Increase delay for next attempt
      currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError!;
}
