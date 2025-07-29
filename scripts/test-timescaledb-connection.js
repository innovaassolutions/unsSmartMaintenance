#!/usr/bin/env node

/**
 * TimescaleDB Connection Test
 * Simple test to verify TimescaleDB Cloud connection
 */

const { Client } = require('pg');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  console.log('Testing TimescaleDB Cloud connection...');
  
  // Log connection details (without password)
  console.log('Host:', process.env.TIMESCALEDB_HOST);
  console.log('Port:', process.env.TIMESCALEDB_PORT);
  console.log('Database:', process.env.TIMESCALEDB_DATABASE);
  console.log('Username:', process.env.TIMESCALEDB_USERNAME);
  console.log('Password length:', process.env.TIMESCALEDB_PASSWORD?.length || 0);
  
  const client = new Client({
    host: process.env.TIMESCALEDB_HOST,
    port: parseInt(process.env.TIMESCALEDB_PORT),
    database: process.env.TIMESCALEDB_DATABASE,
    user: process.env.TIMESCALEDB_USERNAME,
    password: process.env.TIMESCALEDB_PASSWORD,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // Test basic query
    const result = await client.query('SELECT version();');
    console.log('Database version:', result.rows[0].version);
    
    // Test TimescaleDB extension
    const tsResult = await client.query('SELECT extname FROM pg_extension WHERE extname = \'timescaledb\';');
    if (tsResult.rows.length > 0) {
      console.log('✅ TimescaleDB extension is available');
    } else {
      console.log('⚠️  TimescaleDB extension not found - will need to install');
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
  } finally {
    await client.end();
  }
}

testConnection();