'use client';

import { useEffect, useState } from 'react';

export default function ClientLogs() {
  const [logs, setLogs] = useState<string[]>([]);
  
  useEffect(() => {
    // Store original console methods
    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info
    };
    
    // Override console methods to capture logs
    const capturedLogs: string[] = [];
    
    console.log = function(...args) {
      capturedLogs.push(`LOG: ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ')}`);
      setLogs([...capturedLogs]);
      originalConsole.log.apply(console, args);
    };
    
    console.error = function(...args) {
      capturedLogs.push(`ERROR: ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ')}`);
      setLogs([...capturedLogs]);
      originalConsole.error.apply(console, args);
    };
    
    console.warn = function(...args) {
      capturedLogs.push(`WARN: ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ')}`);
      setLogs([...capturedLogs]);
      originalConsole.warn.apply(console, args);
    };
    
    console.info = function(...args) {
      capturedLogs.push(`INFO: ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ')}`);
      setLogs([...capturedLogs]);
      originalConsole.info.apply(console, args);
    };
    
    // Capture unhandled errors
    const handleError = (event: ErrorEvent) => {
      capturedLogs.push(`UNHANDLED ERROR: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`);
      setLogs([...capturedLogs]);
    };
    
    window.addEventListener('error', handleError);
    
    // Capture unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      capturedLogs.push(`UNHANDLED REJECTION: ${event.reason}`);
      setLogs([...capturedLogs]);
    };
    
    window.addEventListener('unhandledrejection', handleRejection);
    
    // Cleanup
    return () => {
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
      console.info = originalConsole.info;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Client-side Logs</h1>
      <p className="mb-4">This page captures and displays console logs and errors from the client side.</p>
      
      <div className="mb-4">
        <button 
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
          onClick={() => console.log('Test log message')}
        >
          Test Log
        </button>
        <button 
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mr-2"
          onClick={() => console.error('Test error message')}
        >
          Test Error
        </button>
        <button 
          className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded mr-2"
          onClick={() => console.warn('Test warning message')}
        >
          Test Warning
        </button>
        <button 
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => {
            try {
              throw new Error('Test exception');
            } catch (e) {
              console.error('Caught exception:', e);
            }
          }}
        >
          Test Exception
        </button>
      </div>
      
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Logs ({logs.length})</h2>
        <div className="max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-gray-500">No logs captured yet.</p>
          ) : (
            <ul className="space-y-1">
              {logs.map((log, index) => {
                const isError = log.startsWith('ERROR') || log.startsWith('UNHANDLED');
                const isWarning = log.startsWith('WARN');
                
                return (
                  <li 
                    key={index} 
                    className={`font-mono text-sm p-1 ${
                      isError ? 'text-red-600 bg-red-50' : 
                      isWarning ? 'text-yellow-600 bg-yellow-50' : 
                      'text-gray-800'
                    }`}
                  >
                    {log}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
} 