/**
 * Supabase Client Configuration for UNS Smart Maintenance System
 * Provides centralized database connection and client initialization
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

// Environment variables for Supabase connection
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Database calls will fail until NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.');
}

// Singleton Supabase client
let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create Supabase client instance
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return supabaseClient;
}

// Singleton Prisma client
let prismaClient: PrismaClient | null = null;

/**
 * Get or create Prisma client instance
 */
export function getPrismaClient(): PrismaClient {
  if (!prismaClient) {
    prismaClient = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return prismaClient;
}

/**
 * Close database connections gracefully
 */
export async function closeDatabaseConnections(): Promise<void> {
  if (prismaClient) {
    await prismaClient.$disconnect();
    prismaClient = null;
  }
  
  // Supabase client doesn't need explicit closing
  supabaseClient = null;
}

// Types for database operations
export type DatabaseClient = {
  supabase: SupabaseClient;
  prisma: PrismaClient;
};

/**
 * Get both database clients
 */
export function getDatabaseClients(): DatabaseClient {
  return {
    supabase: getSupabaseClient(),
    prisma: getPrismaClient(),
  };
}