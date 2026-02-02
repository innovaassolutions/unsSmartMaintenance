#!/usr/bin/env tsx

/**
 * Simplified NASA Bearing Data Loader
 * Bypasses complex processing and uses proven working approach
 */

import { Pool } from 'pg'
import fs from 'fs/promises'
import path from 'path'
import pino from 'pino'

const logger = pino({
  name: 'simple-nasa-loader',
  level: 'info'
})

interface SimpleDataPoint {
  timestamp: Date
  test_set: number
  bearing_id: number
  channel_id: number
  axis: string
  accelerometer_value: number
  sample_index: number
  file_sequence: number
  failure_mode: string
}

export class SimpleNASALoader {
  private pool: Pool

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  }

  /**
   * Initialize schema (reuse existing schema)
   */
  async initializeSchema(): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      // Verify the existing schema
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'bearing_vibration_data'
        ) as table_exists
      `)
      
      if (!result.rows[0].table_exists) {
        throw new Error('bearing_vibration_data table does not exist. Please run the main NASA loader schema initialization first.')
      }
      
      logger.info('✅ Existing schema verified')
      
    } finally {
      client.release()
    }
  }

  /**
   * Simple filename parser
   */
  private parseFilename(filename: string): Date {
    const parts = filename.split('.')
    const [year, month, day, hour, minute, second] = parts.map(Number)
    return new Date(year, month - 1, day, hour, minute, second)
  }

  /**
   * Load NASA data using the proven working approach
   */
  async loadNASAData(options: {
    testSet?: number
    maxFiles?: number
    maxSamplesPerFile?: number
  } = {}): Promise<void> {
    const { testSet = 1, maxFiles = 10, maxSamplesPerFile = 1000 } = options

    logger.info(`🚀 Starting simplified NASA data loading`, { testSet, maxFiles, maxSamplesPerFile })

    // Get the dataset directory
    const testSetPaths = { 1: '1st_test', 2: '2nd_test', 3: '3rd_test' }
    const datasetDir = `/Users/toddabraham/Documents/Coding/UnsSmartMaintenance/data/nasa-bearing/data/nasa-bearing/4. Bearings/${testSetPaths[testSet]}`
    
    try {
      // Get all data files
      const files = await fs.readdir(datasetDir)
      const dataFiles = files
        .filter(f => /^\d{4}\.\d{2}\.\d{2}\.\d{2}\.\d{2}\.\d{2}$/.test(f))
        .sort()
        .slice(0, maxFiles)

      logger.info(`📁 Found ${dataFiles.length} files to process`)

      let totalPointsInserted = 0
      let totalFilesProcessed = 0

      // Process each file using the working approach
      for (const [fileIndex, filename] of dataFiles.entries()) {
        const filePath = path.join(datasetDir, filename)
        
        try {
          logger.info(`📄 Processing file ${fileIndex + 1}/${dataFiles.length}: ${filename}`)
          
          // Parse file content
          const content = await fs.readFile(filePath, 'utf-8')
          const lines = content.trim().split('\n').filter(line => line.trim())
          const baseTimestamp = this.parseFilename(filename)
          
          // Process limited samples per file
          const samplesToProcess = Math.min(lines.length, maxSamplesPerFile)
          const samplingIntervalMs = 1000 / 20000 // 20 kHz
          
          logger.debug(`  📊 Processing ${samplesToProcess} samples from ${lines.length} total`)

          // Insert data in batches using the proven working method
          const batchSize = 100
          let filePointsInserted = 0

          for (let startIdx = 0; startIdx < samplesToProcess; startIdx += batchSize) {
            const endIdx = Math.min(startIdx + batchSize, samplesToProcess)
            const batchPoints: SimpleDataPoint[] = []

            // Create batch of data points
            for (let sampleIdx = startIdx; sampleIdx < endIdx; sampleIdx++) {
              const line = lines[sampleIdx]
              const values = line.trim().split('\t').map(val => {
                const num = parseFloat(val)
                return isNaN(num) ? 0 : num
              })

              if (values.length !== 8) continue

              const sampleTimestamp = new Date(baseTimestamp.getTime() + (sampleIdx * samplingIntervalMs))

              // Process each channel (simplified - no complex bearing configuration)
              values.forEach((value, channelIndex) => {
                if (!isFinite(value)) return

                const channelId = channelIndex + 1
                const bearingId = Math.ceil(channelId / 2) // Simple mapping: channels 1-2 = bearing 1, 3-4 = bearing 2, etc.
                const axis = (channelId % 2 === 1) ? 'x' : 'y' // Odd channels = x, even = y

                batchPoints.push({
                  timestamp: sampleTimestamp,
                  test_set: testSet,
                  bearing_id: bearingId,
                  channel_id: channelId,
                  axis,
                  accelerometer_value: value,
                  sample_index: sampleIdx,
                  file_sequence: fileIndex + 1,
                  failure_mode: `Test Set ${testSet} - Simplified Load`
                })
              })
            }

            // Insert batch using proven individual insertion approach
            const insertedCount = await this.insertBatch(batchPoints)
            filePointsInserted += insertedCount
            totalPointsInserted += insertedCount

            logger.debug(`    ✅ Batch ${Math.floor(startIdx / batchSize) + 1}: ${insertedCount} points inserted`)
          }

          totalFilesProcessed++
          logger.info(`  ✅ File completed: ${filePointsInserted} points inserted`)

          // Progress update every 5 files
          if (totalFilesProcessed % 5 === 0) {
            logger.info(`📈 Progress: ${totalFilesProcessed}/${dataFiles.length} files, ${totalPointsInserted.toLocaleString()} total points`)
          }

        } catch (fileError: any) {
          logger.error(`❌ Failed to process file ${filename}:`, { error: fileError.message })
          continue
        }
      }

      logger.info(`🎉 Simplified NASA data loading completed!`)
      logger.info(`📊 Final stats:`)
      logger.info(`  - Files processed: ${totalFilesProcessed}/${dataFiles.length}`)
      logger.info(`  - Total data points: ${totalPointsInserted.toLocaleString()}`)
      logger.info(`  - Average per file: ${Math.round(totalPointsInserted / totalFilesProcessed).toLocaleString()}`)

      // Get final database stats
      const stats = await this.getStats()
      logger.info(`  - Database total: ${stats.total_points.toLocaleString()} points`)

    } catch (error: any) {
      logger.error('❌ Simplified NASA data loading failed:', { error: error.message })
      throw error
    }
  }

  /**
   * Insert batch using proven working method
   */
  private async insertBatch(dataPoints: SimpleDataPoint[]): Promise<number> {
    if (dataPoints.length === 0) return 0

    let successCount = 0
    const insertQuery = `
      INSERT INTO bearing_vibration_data 
      (time, test_set, bearing_id, channel_id, axis, accelerometer_value, sample_index, file_sequence, failure_mode, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `

    // Use individual insertions (proven to work)
    for (const point of dataPoints) {
      const client = await this.pool.connect()
      
      try {
        await client.query(insertQuery, [
          point.timestamp,
          point.test_set,
          point.bearing_id,
          point.channel_id,
          point.axis,
          point.accelerometer_value,
          point.sample_index,
          point.file_sequence,
          point.failure_mode,
          JSON.stringify({
            sampling_rate: 20000,
            simple_loader: true,
            loaded_at: new Date().toISOString()
          })
        ])
        
        successCount++
        
      } catch (error: any) {
        logger.debug(`Point insertion failed:`, {
          error: error.message,
          timestamp: point.timestamp.toISOString(),
          bearing: point.bearing_id,
          channel: point.channel_id,
          value: point.accelerometer_value
        })
        // Continue with next point
      } finally {
        client.release()
      }
    }

    return successCount
  }

  /**
   * Get loading statistics
   */
  async getStats(): Promise<any> {
    const client = await this.pool.connect()
    
    try {
      const result = await client.query(`
        SELECT 
          COUNT(*) as total_points,
          COUNT(DISTINCT bearing_id) as unique_bearings,
          COUNT(DISTINCT channel_id) as unique_channels,
          MIN(time) as earliest_timestamp,
          MAX(time) as latest_timestamp,
          COUNT(DISTINCT file_sequence) as processed_files
        FROM bearing_vibration_data 
        WHERE failure_mode LIKE 'Test Set%Simplified Load'
      `)

      return result.rows[0]
    } finally {
      client.release()
    }
  }

  /**
   * Clean up connection pool
   */
  async close(): Promise<void> {
    await this.pool.end()
  }
}

export default SimpleNASALoader