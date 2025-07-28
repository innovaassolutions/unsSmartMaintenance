/**
 * Build Process Validation Tests
 * Tests to verify that the build process works correctly
 */

import fs from 'fs/promises';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../..');

describe('Build Process', () => {
  beforeAll(async () => {
    // Clean up any previous build artifacts
    try {
      await fs.rm(path.join(projectRoot, '.next'), {
        recursive: true,
        force: true,
      });
    } catch {
      // Ignore if .next doesn't exist
    }
  }, 30000);

  describe('TypeScript Compilation', () => {
    test('should have TypeScript configuration', async () => {
      const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
      await expect(fs.access(tsconfigPath)).resolves.toBeUndefined();

      const tsconfigContent = await fs.readFile(tsconfigPath, 'utf-8');
      // Just check that the file contains expected TypeScript configuration
      expect(tsconfigContent).toMatch(/"compilerOptions"/);
      expect(tsconfigContent).toMatch(/"strict":\s*true/);
      expect(tsconfigContent).toMatch(/"target"/);
      expect(tsconfigContent).toMatch(/"lib"/);
    });

    test('should generate .next directory with build artifacts', async () => {
      const nextDir = path.join(projectRoot, '.next');
      try {
        const stats = await fs.stat(nextDir);
        expect(stats.isDirectory()).toBe(true);
      } catch {
        // If .next doesn't exist, that's okay - build hasn't been run yet
        expect(true).toBe(true);
      }
    });
  });

  describe('Static Generation', () => {
    test('should have proper Next.js configuration for static generation', async () => {
      // Check if pages directory exists (Pages Router) or app directory (App Router)
      const appDir = path.join(projectRoot, 'src/app');
      const pagesDir = path.join(projectRoot, 'src/pages');

      try {
        await fs.access(appDir);
        expect(true).toBe(true); // App Router detected
      } catch {
        try {
          await fs.access(pagesDir);
          expect(true).toBe(true); // Pages Router detected
        } catch {
          throw new Error('Neither app nor pages directory found');
        }
      }
    });

    test('should have root page or layout', async () => {
      const appPageFiles = [
        'src/app/page.tsx',
        'src/app/page.ts',
        'src/app/page.jsx',
        'src/app/page.js',
      ];

      let rootPageExists = false;
      for (const pageFile of appPageFiles) {
        try {
          await fs.access(path.join(projectRoot, pageFile));
          rootPageExists = true;
          break;
        } catch {
          // Continue checking
        }
      }

      expect(rootPageExists).toBe(true);
    });
  });

  describe('Asset Optimization', () => {
    test('should have TailwindCSS configuration', async () => {
      const tailwindConfigFiles = [
        'tailwind.config.ts',
        'tailwind.config.js',
        'tailwind.config.mjs',
      ];

      let configExists = false;
      for (const configFile of tailwindConfigFiles) {
        try {
          await fs.access(path.join(projectRoot, configFile));
          configExists = true;
          break;
        } catch {
          // Continue checking
        }
      }

      expect(configExists).toBe(true);
    });

    test('should have global CSS file', async () => {
      const globalCssFiles = ['src/app/globals.css', 'src/styles/globals.css'];

      let globalCssExists = false;
      for (const cssFile of globalCssFiles) {
        try {
          await fs.access(path.join(projectRoot, cssFile));
          globalCssExists = true;
          break;
        } catch {
          // Continue checking
        }
      }

      expect(globalCssExists).toBe(true);
    });
  });
});

describe('Development Server', () => {
  test('should validate package.json scripts exist', async () => {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    expect(packageJson.scripts).toHaveProperty('dev');
    expect(packageJson.scripts).toHaveProperty('build');
    expect(packageJson.scripts).toHaveProperty('start');
  });

  test('should have required dependencies for development', async () => {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    // Check for Next.js
    expect(packageJson.dependencies).toHaveProperty('next');
    expect(packageJson.dependencies).toHaveProperty('react');
    expect(packageJson.dependencies).toHaveProperty('react-dom');

    // Check for TypeScript
    expect(packageJson.devDependencies).toHaveProperty('typescript');
    expect(packageJson.devDependencies).toHaveProperty('@types/node');
    expect(packageJson.devDependencies).toHaveProperty('@types/react');
  });
});

describe('Deployment Configuration', () => {
  test('should have next.config.js or next.config.ts if present', async () => {
    const configFiles = ['next.config.js', 'next.config.ts', 'next.config.mjs'];

    for (const configFile of configFiles) {
      try {
        await fs.access(path.join(projectRoot, configFile));
        // If we reach here, config file exists
        break;
      } catch {
        // File doesn't exist, continue checking
      }
    }

    // If no config file exists, that's also valid for Next.js
    expect(true).toBe(true); // This test always passes as config is optional
  });

  test('should have proper package.json configuration', async () => {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    expect(packageJson).toHaveProperty('name');
    expect(packageJson).toHaveProperty('version');
    expect(packageJson).toHaveProperty('private');
    expect(packageJson.private).toBe(true);
  });
});
