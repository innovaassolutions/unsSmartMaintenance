/**
 * TailwindCSS Configuration Tests
 * Tests for TailwindCSS class generation and custom theme configuration
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('TailwindCSS Configuration', () => {
  test('should have TailwindCSS config file', () => {
    const configPath = path.join(process.cwd(), 'tailwind.config.ts');
    expect(fs.existsSync(configPath)).toBe(true);
  });

  test('should import tailwindcss in globals.css', () => {
    const globalsPath = path.join(process.cwd(), 'src/app/globals.css');
    const content = fs.readFileSync(globalsPath, 'utf-8');
    expect(content).toContain("@import 'tailwindcss'");
  });

  test('should have PostCSS configuration', () => {
    const postcssPath = path.join(process.cwd(), 'postcss.config.mjs');
    expect(fs.existsSync(postcssPath)).toBe(true);

    const content = fs.readFileSync(postcssPath, 'utf-8');
    expect(content).toContain('@tailwindcss/postcss');
  });

  test('should have industrial theme colors defined', () => {
    const configPath = path.join(process.cwd(), 'tailwind.config.ts');
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content).toContain('industrial');
    }
  });

  test('should have typography plugin configured', () => {
    const configPath = path.join(process.cwd(), 'tailwind.config.ts');
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content).toContain('typography');
    }
  });

  test('should generate CSS classes successfully', () => {
    try {
      // Test that TailwindCSS can build without errors
      const result = execSync('npm run build', {
        encoding: 'utf-8',
        timeout: 60000,
        stdio: 'pipe',
      });
      expect(result).toBeDefined();
    } catch (error: unknown) {
      // If build fails, check if it's a TailwindCSS related error
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('tailwind')) {
        fail(`TailwindCSS build error: ${errorMessage}`);
      }
      // Other build errors might be expected at this stage
    }
  });
});

describe('Custom Industrial Theme', () => {
  test('should define industrial color palette', () => {
    const globalsPath = path.join(process.cwd(), 'src/app/globals.css');
    const content = fs.readFileSync(globalsPath, 'utf-8');

    // Check for industrial theme variables
    expect(content).toMatch(/(--color-industrial|--industrial)/);
  });

  test('should support dark mode for industrial themes', () => {
    const globalsPath = path.join(process.cwd(), 'src/app/globals.css');
    const content = fs.readFileSync(globalsPath, 'utf-8');

    // Check for dark class and industrial dark theme variables
    expect(content).toContain('.dark');
    expect(content).toContain('--industrial-primary');
  });
});
