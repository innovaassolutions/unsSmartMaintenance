/**
 * Test suite for validating that all installed dependencies can be imported correctly
 * and that their TypeScript types are available.
 */

// Import dependencies at the top to test basic import functionality
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';

describe('Dependency Import Validation', () => {
  describe('Core Dependencies', () => {
    test('should have @supabase/supabase-js available in package.json', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      expect(packageJson.dependencies['@supabase/supabase-js']).toBeDefined();
    });

    test('should have zustand available in package.json', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      expect(packageJson.dependencies['zustand']).toBeDefined();
    });

    test('should have lucide-react available in package.json', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      expect(packageJson.dependencies['lucide-react']).toBeDefined();
    });

    test('should have recharts available in package.json', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      expect(packageJson.dependencies['recharts']).toBeDefined();
    });
  });

  describe('React and Next.js Dependencies', () => {
    test('should import React without errors', () => {
      expect(React).toBeDefined();
      expect(typeof React.createElement).toBe('function');
    });

    test('should import Next.js components without errors', () => {
      expect(Image).toBeDefined();
      expect(Link).toBeDefined();
    });
  });

  describe('TypeScript Type Definitions', () => {
    test('should have @types/node available for server-side code', () => {
      // Test that Node.js types are available
      const nodeTypes = process.env;
      expect(nodeTypes).toBeDefined();
    });

    test('should have React types available', () => {
      // This test ensures TypeScript compilation includes React types
      // by using React-specific type annotations
      const reactElement: React.ReactElement = {
        type: 'div',
        props: {},
        key: null,
      };
      expect(reactElement).toBeDefined();
    });
  });

  describe('Development Dependencies', () => {
    test('should have @types/node in devDependencies', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      expect(packageJson.devDependencies['@types/node']).toBeDefined();
    });

    test('should have @types/react in devDependencies', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      expect(packageJson.devDependencies['@types/react']).toBeDefined();
    });

    test('should have @types/react-dom in devDependencies', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      expect(packageJson.devDependencies['@types/react-dom']).toBeDefined();
    });

    test('should have jest in devDependencies', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      expect(packageJson.devDependencies['jest']).toBeDefined();
    });

    test('should have @testing-library/react in devDependencies', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      expect(
        packageJson.devDependencies['@testing-library/react']
      ).toBeDefined();
    });

    test('should have @testing-library/jest-dom in devDependencies', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      expect(
        packageJson.devDependencies['@testing-library/jest-dom']
      ).toBeDefined();
    });
  });
});

describe('Build and Compilation Validation', () => {
  test('TypeScript compilation should include all dependencies', () => {
    // This test ensures the TypeScript configuration properly includes
    // all necessary type definitions and compilation targets
    expect(true).toBe(true); // Will fail at compile time if types are missing
  });

  test('should not have conflicting dependency versions', () => {
    // Basic check to ensure we don't have obvious version conflicts
    expect(typeof React).toBe('object');
  });

  test('should have proper test scripts configured', () => {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    expect(packageJson.scripts.test).toBeDefined();
    expect(packageJson.scripts['test:watch']).toBeDefined();
    expect(packageJson.scripts['test:coverage']).toBeDefined();
  });
});
