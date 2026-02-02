/**
 * Demo Login - No Authentication Required
 * For development/demo purposes
 */

import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database/timescale-connection'

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { role = 'factory_manager' } = await request.json()

    // Get the first user with the specified role, or create a demo user
    let userQuery = `
      SELECT
        id,
        email,
        role,
        full_name,
        created_at,
        last_login
      FROM users
      WHERE role = $1
      LIMIT 1
    `
    let userResult = await executeQuery(userQuery, [role])
    let user = userResult.rows[0]

    // If no user exists for this role, create a demo user
    if (!user) {
      const demoUsers = {
        factory_manager: {
          email: 'demo.factory.manager@acme.com',
          full_name: 'Demo Factory Manager'
        },
        production_manager: {
          email: 'demo.production.manager@acme.com',
          full_name: 'Demo Production Manager'
        },
        maintenance_technician: {
          email: 'demo.maintenance@acme.com',
          full_name: 'Demo Maintenance Technician'
        },
        executive: {
          email: 'demo.executive@acme.com',
          full_name: 'Demo Executive'
        }
      }

      const demoUser = demoUsers[role as keyof typeof demoUsers] || demoUsers.factory_manager

      const createUserQuery = `
        INSERT INTO users (id, email, password_hash, role, full_name, is_active)
        VALUES (gen_random_uuid(), $1, 'demo', $2, $3, true)
        RETURNING id, email, role, full_name, created_at, last_login
      `

      const createResult = await executeQuery(createUserQuery, [
        demoUser.email,
        role,
        demoUser.full_name
      ])

      user = createResult.rows[0]
    }

    // Create a demo session
    const token = 'demo-session-token'
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    return NextResponse.json({
      user: {
        ...user,
        last_login: new Date()
      },
      token,
      expires_at: expiresAt,
      demo: true
    })

  } catch (error) {
    console.error('Demo login error:', error)
    return NextResponse.json(
      { error: 'Demo login failed' },
      { status: 500 }
    )
  }
}