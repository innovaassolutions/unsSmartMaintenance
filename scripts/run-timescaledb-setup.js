#!/usr/bin/env node

/**
 * TimescaleDB Setup Runner
 * Executes the TimescaleDB setup SQL script using environment variables
 */

const { readFileSync } = require('fs');
const { Client } = require('pg');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function setupTimescaleDB() {
  console.log('🚀 Setting up TimescaleDB Cloud database...');

  // Validate environment variables
  const requiredEnvVars = [
    'TIMESCALEDB_URL'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`❌ Missing environment variable: ${envVar}`);
      process.exit(1);
    }
  }

  // Create PostgreSQL client
  const client = new Client({
    connectionString: process.env.TIMESCALEDB_URL,
    ssl: {
      rejectUnauthorized: false // TimescaleDB Cloud requires SSL but uses self-signed certificates
    }
  });

  try {
    // Connect to database
    console.log('📡 Connecting to TimescaleDB Cloud...');
    await client.connect();
    console.log('✅ Connected to TimescaleDB Cloud successfully');

    // Read and execute SQL setup script
    const sqlScript = readFileSync(
      path.join(__dirname, 'setup-timescaledb.sql'), 
      'utf-8'
    );

    console.log('📝 Executing TimescaleDB setup script...');
    await client.query(sqlScript);
    console.log('✅ TimescaleDB setup completed successfully');

    // Verify hypertables were created
    console.log('🔍 Verifying hypertables...');
    const hypertablesResult = await client.query(`
      SELECT hypertable_name, hypertable_schema 
      FROM timescaledb_information.hypertables;
    `);

    console.log('📊 Created hypertables:');
    hypertablesResult.rows.forEach(row => {
      console.log(`  - ${row.hypertable_schema}.${row.hypertable_name}`);
    });

    // Verify continuous aggregates
    console.log('🔍 Verifying continuous aggregates...');
    const aggregatesResult = await client.query(`
      SELECT view_name, materialized_only 
      FROM timescaledb_information.continuous_aggregates;
    `);

    console.log('📈 Created continuous aggregates:');
    aggregatesResult.rows.forEach(row => {
      console.log(`  - ${row.view_name} (materialized: ${row.materialized_only})`);
    });

    console.log('🎉 TimescaleDB setup completed successfully!');

  } catch (error) {
    console.error('❌ Error setting up TimescaleDB:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('connection')) {
      console.error('💡 Check your TIMESCALEDB_URL and network connection');
    } else if (error.message.includes('authentication')) {
      console.error('💡 Check your TimescaleDB username and password');
    } else if (error.message.includes('does not exist')) {
      console.error('💡 Make sure the database exists in your TimescaleDB Cloud project');
    }
    
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the setup
setupTimescaleDB();