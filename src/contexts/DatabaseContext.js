import React, {createContext, useContext, useEffect, useState} from 'react';
import DatabaseService from '../services/DatabaseService';

const DatabaseContext = createContext();

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

export const DatabaseProvider = ({children}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeDatabase();
  }, []);

  const initializeDatabase = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const success = await DatabaseService.initDatabase();
      setIsInitialized(success);
      if (!success) {
        setError('Failed to initialize database');
      }
    } catch (err) {
      setError(err.message);
      setIsInitialized(false);
    } finally {
      setIsLoading(false);
    }
  };

  const executeQuery = async (query, params = []) => {
    if (!isInitialized) {
      throw new Error('Database not initialized');
    }
    return await DatabaseService.executeQuery(query, params);
  };

  const value = {
    isInitialized,
    isLoading,
    error,
    executeQuery,
    initializeDatabase
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};
