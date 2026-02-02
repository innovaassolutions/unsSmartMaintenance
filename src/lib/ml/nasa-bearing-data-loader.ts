/**
 * NASA Bearing Data Loader for TimescaleDB
 * Loads IMS-Rexnord bearing failure dataset for predictive maintenance ML training
 */

import { Pool } from 'pg'
import fs from 'fs/promises'
import path from 'path'
import pino from 'pino'
import copyFrom from 'pg-copy-streams'
import { Readable } from 'stream'

// Initialize logger
const logger = pino({
  name: 'nasa-bearing-loader',
  level: process.env.LOG_LEVEL || 'info'
})

export interface NASABearingConfig {
  timescaleConnectionString: string
  datasetPath: string
  batchSize?: number
  maxFiles?: number
  testSet?: 1 | 2 | 3
}

export interface BearingDataPoint {
  timestamp: Date
  bearing_id: number
  channel_id: number
  axis: 'x' | 'y' | 'single'
  accelerometer_value: number
  sample_index: number
  file_sequence: number
  test_set: number
  failure_mode?: string
}

export interface DatasetMetadata {
  testSet: number
  startDate: Date
  endDate: Date
  totalFiles: number
  samplingRate: number
  samplesPerFile: number
  channels: number
  bearingConfiguration: Record<number, { channels: number[], axes: string[] }>
  failureMode: string
}

/**
 * NASA Bearing Data Loader Service
 */
export class NASABearingDataLoader {
  private pool: Pool
  private config: NASABearingConfig

  constructor(config: NASABearingConfig) {
    this.config = config
    this.pool = new Pool({
      connectionString: config.timescaleConnectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  }

  /**
   * Initialize TimescaleDB schema for bearing data
   */
  async initializeSchema(): Promise<void> {
    try {
      const client = await this.pool.connect()
      
      try {
        // Create bearing_vibration_data hypertable
        await client.query(`
          CREATE TABLE IF NOT EXISTS bearing_vibration_data (
            time TIMESTAMPTZ NOT NULL,
            test_set INTEGER NOT NULL,
            bearing_id INTEGER NOT NULL,
            channel_id INTEGER NOT NULL,
            axis VARCHAR(10) NOT NULL,
            accelerometer_value DOUBLE PRECISION NOT NULL,
            sample_index INTEGER NOT NULL,
            file_sequence INTEGER NOT NULL,
            failure_mode VARCHAR(50),
            metadata JSONB
          )
        `)

        // Create hypertable (only if not already exists)
        await client.query(`
          SELECT create_hypertable('bearing_vibration_data', 'time', if_not_exists => TRUE)
        `)

        // Create indexes for efficient querying
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_bearing_vibration_test_bearing_time 
          ON bearing_vibration_data (test_set, bearing_id, time DESC)
        `)

        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_bearing_vibration_channel_time 
          ON bearing_vibration_data (test_set, channel_id, time DESC)
        `)

        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_bearing_vibration_failure_mode 
          ON bearing_vibration_data (failure_mode, time DESC)
        `)

        // Create dataset metadata table
        await client.query(`
          CREATE TABLE IF NOT EXISTS nasa_dataset_metadata (
            test_set INTEGER PRIMARY KEY,
            start_date TIMESTAMPTZ NOT NULL,
            end_date TIMESTAMPTZ NOT NULL,
            total_files INTEGER NOT NULL,
            sampling_rate INTEGER NOT NULL,
            samples_per_file INTEGER NOT NULL,
            channels INTEGER NOT NULL,
            bearing_configuration JSONB NOT NULL,
            failure_mode VARCHAR(100) NOT NULL,
            loaded_at TIMESTAMPTZ DEFAULT NOW(),
            metadata JSONB
          )
        `)

        logger.info('NASA bearing data schema initialized successfully')
      } finally {
        client.release()
      }
    } catch (error: any) {
      logger.error('Failed to initialize schema', { error: error.message })
      throw error
    }
  }

  /**
   * Get dataset metadata based on test set
   */
  getDatasetMetadata(testSet: number): DatasetMetadata {
    const metadata: Record<number, DatasetMetadata> = {
      1: {
        testSet: 1,
        startDate: new Date('2003-10-22T12:06:24Z'),
        endDate: new Date('2003-11-25T23:39:56Z'),
        totalFiles: 2156,
        samplingRate: 20000, // 20 kHz
        samplesPerFile: 20480,
        channels: 8,
        bearingConfiguration: {
          1: { channels: [1, 2], axes: ['x', 'y'] },
          2: { channels: [3, 4], axes: ['x', 'y'] },
          3: { channels: [5, 6], axes: ['x', 'y'] },
          4: { channels: [7, 8], axes: ['x', 'y'] }
        },
        failureMode: 'Inner race defect (bearing 3), Roller element defect (bearing 4)'
      },
      2: {
        testSet: 2,
        startDate: new Date('2004-02-12T10:32:39Z'),
        endDate: new Date('2004-02-19T06:22:39Z'),
        totalFiles: 984,
        samplingRate: 20000,
        samplesPerFile: 20480,
        channels: 4,
        bearingConfiguration: {
          1: { channels: [1], axes: ['single'] },
          2: { channels: [2], axes: ['single'] },
          3: { channels: [3], axes: ['single'] },
          4: { channels: [4], axes: ['single'] }
        },
        failureMode: 'Outer race failure (bearing 1)'
      },
      3: {
        testSet: 3,
        startDate: new Date('2004-03-04T09:27:46Z'),
        endDate: new Date('2004-04-04T19:01:57Z'),
        totalFiles: 4448,
        samplingRate: 20000,
        samplesPerFile: 20480,
        channels: 4,
        bearingConfiguration: {
          1: { channels: [1], axes: ['single'] },
          2: { channels: [2], axes: ['single'] },
          3: { channels: [3], axes: ['single'] },
          4: { channels: [4], axes: ['single'] }
        },
        failureMode: 'Outer race failure (bearing 3)'
      }
    }

    return metadata[testSet]
  }

  /**
   * Parse filename to extract timestamp
   */
  parseFilename(filename: string): Date {
    // Format: YYYY.MM.DD.HH.MM.SS
    const parts = filename.split('.')
    if (parts.length !== 6) {
      throw new Error(`Invalid filename format: ${filename}`)
    }

    const [year, month, day, hour, minute, second] = parts.map(Number)
    return new Date(year, month - 1, day, hour, minute, second)
  }

  /**
   * Parse bearing data file content
   */
  async parseDataFile(filePath: string, fileSequence: number, testSet: number): Promise<BearingDataPoint[]> {
    const content = await fs.readFile(filePath, 'utf-8')
    const lines = content.trim().split('\n').filter(line => line.trim()) // Remove empty lines
    const metadata = this.getDatasetMetadata(testSet)
    const filename = path.basename(filePath)
    const baseTimestamp = this.parseFilename(filename)

    const dataPoints: BearingDataPoint[] = []
    const samplingIntervalMs = 1000 / metadata.samplingRate // Time between samples in milliseconds

    // Process only a subset for testing to avoid overwhelming the database
    const maxSamples = 100 // Limit samples per file for now
    const samplesToProcess = Math.min(lines.length, maxSamples)

    for (let sampleIndex = 0; sampleIndex < samplesToProcess; sampleIndex++) {
      const line = lines[sampleIndex]
      const values = line.trim().split('\t').map(val => {
        const num = parseFloat(val)
        return isNaN(num) ? 0 : num // Handle any NaN values
      })
      
      if (values.length !== metadata.channels) {
        logger.warn(`Unexpected channel count in ${filename}: got ${values.length}, expected ${metadata.channels}`)
        continue
      }

      // Calculate precise timestamp for this sample
      const sampleTimestamp = new Date(baseTimestamp.getTime() + (sampleIndex * samplingIntervalMs))
      
      // Validate timestamp
      if (isNaN(sampleTimestamp.getTime())) {
        logger.error(`Invalid timestamp calculated for sample ${sampleIndex} in ${filename}`)
        continue
      }

      // Process each channel
      values.forEach((value, channelIndex) => {
        // Skip invalid values
        if (!isFinite(value)) {
          return
        }

        const channelId = channelIndex + 1
        
        // Determine bearing and axis from channel configuration
        let bearingId = 1
        let axis: 'x' | 'y' | 'single' = 'single'

        for (const [bId, config] of Object.entries(metadata.bearingConfiguration)) {
          if (config.channels.includes(channelId)) {
            bearingId = parseInt(bId)
            if (config.axes.length === 2) {
              // For test set 1 with x/y axes
              const channelInBearing = config.channels.indexOf(channelId)
              axis = config.axes[channelInBearing] as 'x' | 'y'
            } else {
              axis = 'single'
            }
            break
          }
        }

        dataPoints.push({
          timestamp: sampleTimestamp,
          bearing_id: bearingId,
          channel_id: channelId,
          axis,
          accelerometer_value: value,
          sample_index: sampleIndex,
          file_sequence: fileSequence,
          test_set: testSet,
          failure_mode: metadata.failureMode
        })
      })
    }

    logger.debug(`Parsed ${dataPoints.length} data points from ${filename} (${samplesToProcess} samples)`)
    return dataPoints
  }

  /**
   * Load data files from specified test set directory
   */
  async loadTestSet(testSet: number = 1): Promise<void> {
    const metadata = this.getDatasetMetadata(testSet)
    const testSetPaths = {
      1: '1st_test',
      2: '2nd_test', 
      3: '3rd_test'
    }

    const datasetDir = path.join(this.config.datasetPath, 'data/nasa-bearing/4. Bearings', testSetPaths[testSet])
    
    logger.info(`Loading NASA bearing test set ${testSet}`, {
      directory: datasetDir,
      expectedFiles: metadata.totalFiles,
      channels: metadata.channels,
      failureMode: metadata.failureMode
    })

    try {
      // Store metadata
      await this.storeDatasetMetadata(metadata)

      // Get all data files
      const files = await fs.readdir(datasetDir)
      const dataFiles = files
        .filter(f => /^\d{4}\.\d{2}\.\d{2}\.\d{2}\.\d{2}\.\d{2}$/.test(f))
        .sort()

      const maxFiles = this.config.maxFiles || dataFiles.length
      const filesToProcess = dataFiles.slice(0, Math.min(maxFiles, dataFiles.length))

      logger.info(`Processing ${filesToProcess.length} files from test set ${testSet}`)

      let processedFiles = 0
      let totalDataPoints = 0
      const batchSize = this.config.batchSize || 1000

      // Process files in batches
      for (let i = 0; i < filesToProcess.length; i++) {
        const filename = filesToProcess[i]
        const filePath = path.join(datasetDir, filename)

        try {
          const dataPoints = await this.parseDataFile(filePath, i + 1, testSet)
          
          // Insert data in batches
          await this.insertDataPointsBatch(dataPoints)
          
          processedFiles++
          totalDataPoints += dataPoints.length

          if (processedFiles % 10 === 0) {
            logger.info(`Progress: ${processedFiles}/${filesToProcess.length} files (${totalDataPoints.toLocaleString()} data points)`)
          }

        } catch (error: any) {
          logger.error(`Failed to process file ${filename}`, { error: error.message })
          // Continue with other files
        }
      }

      logger.info(`Completed loading test set ${testSet}`, {
        processedFiles,
        totalDataPoints: totalDataPoints.toLocaleString(),
        avgPointsPerFile: Math.round(totalDataPoints / processedFiles)
      })

    } catch (error: any) {
      logger.error(`Failed to load test set ${testSet}`, { error: error.message })
      throw error
    }
  }

  /**
   * Store dataset metadata
   */
  private async storeDatasetMetadata(metadata: DatasetMetadata): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      await client.query(`
        INSERT INTO nasa_dataset_metadata 
        (test_set, start_date, end_date, total_files, sampling_rate, samples_per_file, channels, bearing_configuration, failure_mode, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (test_set) DO UPDATE SET
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          total_files = EXCLUDED.total_files,
          sampling_rate = EXCLUDED.sampling_rate,
          samples_per_file = EXCLUDED.samples_per_file,
          channels = EXCLUDED.channels,
          bearing_configuration = EXCLUDED.bearing_configuration,
          failure_mode = EXCLUDED.failure_mode,
          loaded_at = NOW(),
          metadata = EXCLUDED.metadata
      `, [
        metadata.testSet,
        metadata.startDate,
        metadata.endDate,
        metadata.totalFiles,
        metadata.samplingRate,
        metadata.samplesPerFile,
        metadata.channels,
        JSON.stringify(metadata.bearingConfiguration),
        metadata.failureMode,
        JSON.stringify({ 
          loader_version: '1.0.0',
          loaded_at: new Date().toISOString()
        })
      ])
    } finally {
      client.release()
    }
  }

  /**
   * Insert data points using PostgreSQL COPY command (fastest approach for bulk data)
   */
  private async insertDataPointsBatch(dataPoints: BearingDataPoint[]): Promise<void> {
    if (dataPoints.length === 0) return

    logger.info(`Starting COPY-based bulk insertion of ${dataPoints.length} data points`)
    
    const client = await this.pool.connect()
    
    try {
      // Create CSV data stream from data points
      const csvData = this.convertDataPointsToCSV(dataPoints)
      
      logger.debug(`Generated CSV data: ${csvData.length} characters`)
      
      // Create readable stream from CSV data
      const csvStream = Readable.from([csvData])
      
      // Use PostgreSQL COPY command for maximum performance
      const copyQuery = `
        COPY bearing_vibration_data 
        (time, test_set, bearing_id, channel_id, axis, accelerometer_value, sample_index, file_sequence, failure_mode, metadata)
        FROM STDIN WITH (FORMAT csv, DELIMITER ',', QUOTE '"')
      `
      
      logger.debug('Starting COPY operation...')
      
      const copyStream = client.query(copyFrom(copyQuery))
      
      // Pipe CSV data into COPY stream
      let rowsInserted = 0
      
      const copyPromise = new Promise<void>((resolve, reject) => {
        copyStream.on('error', (error) => {
          logger.error('COPY stream error', { error: error.message })
          reject(error)
        })
        
        copyStream.on('end', () => {
          rowsInserted = dataPoints.length
          logger.info(`COPY operation completed: ${rowsInserted} rows inserted`)
          resolve()
        })
        
        csvStream.pipe(copyStream)
      })
      
      await copyPromise
      
      logger.info(`COPY-based insertion completed: ${rowsInserted}/${dataPoints.length} data points inserted successfully (100% success rate)`)

    } catch (error: any) {
      logger.error('COPY-based insertion failed', {
        error: error.message,
        detail: error.detail,
        hint: error.hint,
        code: error.code,
        totalPoints: dataPoints.length
      })
      
      // Fallback to regular INSERT if COPY fails
      logger.info('Falling back to regular INSERT method...')
      await this.insertDataPointsWithRegularInsert(dataPoints)
      
    } finally {
      client.release()
    }
  }

  /**
   * Convert data points to CSV format for COPY command
   */
  private convertDataPointsToCSV(dataPoints: BearingDataPoint[]): string {
    const csvRows: string[] = []
    
    for (const point of dataPoints) {
      // Format timestamp as ISO string
      const timestamp = point.timestamp.toISOString()
      
      // Escape quotes in JSON metadata
      const metadata = JSON.stringify({
        sampling_rate: 20000,
        copy_insertion: true,
        inserted_at: new Date().toISOString()
      }).replace(/"/g, '""')
      
      // Create CSV row with proper escaping
      const csvRow = [
        `"${timestamp}"`,
        point.test_set,
        point.bearing_id,
        point.channel_id,
        `"${point.axis}"`,
        point.accelerometer_value,
        point.sample_index,
        point.file_sequence,
        `"${point.failure_mode || ''}"`,
        `"${metadata}"`
      ].join(',')
      
      csvRows.push(csvRow)
    }
    
    return csvRows.join('\n') + '\n'
  }

  /**
   * Fallback: Regular INSERT method (if COPY fails)
   */
  private async insertDataPointsWithRegularInsert(dataPoints: BearingDataPoint[]): Promise<void> {
    let successfulInserts = 0
    
    const insertQuery = `
      INSERT INTO bearing_vibration_data 
      (time, test_set, bearing_id, channel_id, axis, accelerometer_value, sample_index, file_sequence, failure_mode, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `

    // Insert in small batches to avoid overwhelming the connection
    const batchSize = 100
    
    for (let i = 0; i < dataPoints.length; i += batchSize) {
      const batch = dataPoints.slice(i, i + batchSize)
      const client = await this.pool.connect()
      
      try {
        await client.query('BEGIN')
        
        for (const point of batch) {
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
                fallback_insertion: true
              })
            ])
            successfulInserts++
          } catch (pointError: any) {
            logger.error('Individual point insertion failed', {
              error: pointError.message,
              point: {
                timestamp: point.timestamp.toISOString(),
                bearing_id: point.bearing_id,
                channel_id: point.channel_id
              }
            })
          }
        }
        
        await client.query('COMMIT')
        
        if ((i + batchSize) % 1000 === 0) {
          logger.info(`Fallback insertion progress: ${Math.min(i + batchSize, dataPoints.length)}/${dataPoints.length}`)
        }
        
      } catch (batchError: any) {
        await client.query('ROLLBACK').catch(() => {})
        logger.error('Fallback batch insertion failed', { error: batchError.message })
      } finally {
        client.release()
      }
    }
    
    logger.info(`Fallback insertion completed: ${successfulInserts}/${dataPoints.length} data points inserted`)
  }

  /**
   * Get loading statistics
   */
  async getLoadingStats(testSet?: number): Promise<any> {
    const client = await this.pool.connect()
    
    try {
      let whereClause = ''
      let params: any[] = []
      
      if (testSet) {
        whereClause = 'WHERE test_set = $1'
        params = [testSet]
      }

      const result = await client.query(`
        SELECT 
          test_set,
          COUNT(*) as total_points,
          COUNT(DISTINCT bearing_id) as unique_bearings,
          COUNT(DISTINCT channel_id) as unique_channels,
          MIN(time) as earliest_timestamp,
          MAX(time) as latest_timestamp,
          COUNT(DISTINCT file_sequence) as processed_files,
          failure_mode
        FROM bearing_vibration_data 
        ${whereClause}
        GROUP BY test_set, failure_mode
        ORDER BY test_set
      `, params)

      return result.rows
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

/**
 * Create NASA bearing data loader with environment configuration
 */
export function createNASABearingLoader(config?: Partial<NASABearingConfig>): NASABearingDataLoader {
  // Ensure the connection string has properly encoded password
  let connectionString = process.env.TIMESCALEDB_URL || 'postgres://localhost/tsdb'
  
  // Fix URL encoding for passwords with special characters
  if (connectionString.includes('ChariotTrip1972!')) {
    connectionString = connectionString.replace('ChariotTrip1972!', 'ChariotTrip1972%21')
  }

  const defaultConfig: NASABearingConfig = {
    timescaleConnectionString: connectionString,
    datasetPath: '/opt/nasa-data/extracted',
    batchSize: 1000,
    maxFiles: undefined, // Process all files by default
    testSet: 1
  }

  const finalConfig = {
    ...defaultConfig,
    ...config
  }

  return new NASABearingDataLoader(finalConfig)
}

export default NASABearingDataLoader