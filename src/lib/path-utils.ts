import path from 'path';
import fs from 'fs';

/**
 * Resolves a file path relative to the project root directory
 * Works in both development and production environments
 */
export function resolvePublicFilePath(filePath: string): string {
  // Try different path strategies until we find one that works
  const possiblePaths = [
    // Standard path relative to project root
    path.resolve(process.cwd(), filePath),
    
    // In Vercel, sometimes we need to look in the .next directory
    path.resolve(process.cwd(), '.next/server', filePath),
    
    // Another possible Vercel path
    path.resolve(process.cwd(), '.vercel/output', filePath),
    
    // Direct relative path (as a fallback)
    filePath
  ];

  // Try each path until we find one that exists
  for (const tryPath of possiblePaths) {
    try {
      if (fs.existsSync(tryPath)) {
        return tryPath;
      }
    } catch (error) {
      // Ignore errors and try the next path
    }
  }

  // If all else fails, return the original path and let the caller handle errors
  console.warn(`Could not resolve file path: ${filePath}`);
  return filePath;
}

/**
 * Safely reads a file from the public directory
 * Works in both development and production environments
 */
export function readPublicFile(filePath: string): Buffer {
  try {
    const resolvedPath = resolvePublicFilePath(filePath);
    return fs.readFileSync(resolvedPath);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    // Return an empty buffer as a fallback
    return Buffer.from('');
  }
} 