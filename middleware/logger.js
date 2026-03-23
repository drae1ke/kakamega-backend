import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

export const logger = (req, res, next) => {
  const start = Date.now();
  
  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      user: req.user ? req.user.id : 'unauthenticated',
    };
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`${log.method} ${log.url} - ${log.status} (${log.duration})`);
    }
    
    // Log to file
    const logFile = path.join(logsDir, `access-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, JSON.stringify(log) + '\n');
  });
  
  next();
};

// Error logging
export const logError = (error, req = null) => {
  const log = {
    timestamp: new Date().toISOString(),
    error: error.message,
    stack: error.stack,
    ...(req && {
      method: req.method,
      url: req.url,
      body: req.body,
      user: req.user ? req.user.id : null,
    }),
  };
  
  // Log to console
  console.error('Error:', log);
  
  // Log to file
  const errorLogFile = path.join(logsDir, `error-${new Date().toISOString().split('T')[0]}.log`);
  fs.appendFileSync(errorLogFile, JSON.stringify(log) + '\n');
};