/**
 * TimescaleDB Authentication - Sign In
 */

import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database/timescale-connection'
import crypto from 'crypto'

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Get user from database
    const userQuery = `
      SELECT
        id,
        email,
        password_hash,
        role,
        full_name,
        created_at,
        last_login,
        is_active
      FROM users
      WHERE email = $1 AND is_active = true
    `
    const userResult = await executeQuery(userQuery, [email.toLowerCase()])
    const user = userResult.rows[0]

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Hash the provided password and compare
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex')

    if (hashedPassword !== user.password_hash) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Update last login
    await executeQuery(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    )

    // Create session token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Store session
    await executeQuery(
      `INSERT INTO sessions (id, user_id, token, expires_at)
       VALUES (gen_random_uuid(), $1, $2, $3)`,
      [user.id, token, expiresAt]
    )

    // Return user data (without password hash)
    const { password_hash, ...userWithoutPassword } = user

    return NextResponse.json({
      user: {
        ...userWithoutPassword,
        last_login: new Date()
      },
      token,
      expires_at: expiresAt
    })

  } catch (error) {
    console.error('Sign in error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}