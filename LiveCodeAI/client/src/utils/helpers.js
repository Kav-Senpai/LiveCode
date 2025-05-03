/**
 * Simple ID generator to replace nanoid functionality
 * @param {number} length Length of the ID to generate
 * @returns {string} Random ID
 */
export function generateId(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Get the WebSocket URL for collaboration
 * @returns {string} WebSocket URL
 */
export function getWebSocketUrl() {
  try {
    // Use secure WebSockets for HTTPS, regular for HTTP
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // For development, use localhost, otherwise use the current host
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const host = isLocal ? 'localhost:5000' : window.location.host;
    
    return `${protocol}//${host}`;
  } catch (error) {
    console.error('Error getting WebSocket URL:', error);
    // Fallback to default WebSocket URL
    return 'ws://localhost:5000';
  }
} 