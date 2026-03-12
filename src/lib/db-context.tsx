import React, { createContext, useContext, useEffect, useState } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';

import { initDatabase } from '@/lib/db';

interface DatabaseContextType {
  db: SQLiteDatabase;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);

  useEffect(() => {
    try {
      const database = initDatabase();
      setDb(database);
    } catch (err) {
      console.error('Failed to initialize database:', err);
    }
  }, []);

  // Don't render children until DB is ready
  if (!db) return null;

  return (
    <DatabaseContext.Provider value={{ db }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase(): SQLiteDatabase {
  const ctx = useContext(DatabaseContext);
  if (!ctx) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return ctx.db;
}
