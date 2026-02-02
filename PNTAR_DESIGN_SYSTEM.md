# NovaPredict - Design System Documentation

## Overview

This document describes the complete styling and design system for the NovaPredict platform, covering both the login page and main dashboard system. This information will be used to upgrade the frontend to Next.js 15 + TypeScript + TailwindCSS + shadcn/ui while maintaining the existing design language and user experience.

## Design Philosophy

The NovaPredict platform follows a **modern, professional design approach** that emphasizes:

- **Clean, minimalist aesthetics** with ample white space
- **High contrast** for excellent readability
- **Consistent color scheme** throughout the application
- **Responsive design** that works across all device sizes
- **Intuitive navigation** with clear visual hierarchy

## Color Palette

### Primary Colors

- **Orange Accent**: `#FF6B35` (Primary brand color)
- **Orange Gradient**: `linear-gradient(135deg, #FF6B35 0%, #FF8E53 100%)`
- **Dark Blue**: `#1e3a8a` (Secondary brand color)
- **Blue Gradient**: `linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)`

### Background Colors

- **Page Background**: `#374151` (Flat, neutral gray)
- **Right Panel Dark**: `#0d1a21` (Deep dark blue)
- **Main Content**: `#fafafa` (Light gray)
- **White**: `#ffffff` (Pure white)

### Text Colors

- **Primary Text**: `#1a1a1a` (Dark text on light backgrounds)
- **Secondary Text**: `#666666` (Medium gray for subtitles)
- **Light Text**: `#9ca3af` (Light gray for secondary information)
- **White Text**: `#ffffff` (White text on dark backgrounds)

### UI Element Colors

- **Borders**: `#e5e5e5` (Light gray borders)
- **Hover States**: `#f8f8f8` (Light hover backgrounds)
- **Active States**: `#fff5f2` (Light orange background for active items)
- **Success**: `#22c55e` (Green for positive indicators)
- **Warning**: `#f59e0b` (Orange for warnings)
- **Error**: `#ef4444` (Red for errors)

## Typography

### Font Stack

```css
font-family:
  -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
  Arial, sans-serif;
```

### Font Sizes

- **Page Titles**: `24px` (font-weight: 600)
- **Card Titles**: `16px` (font-weight: 600)
- **Section Headers**: `28px` (font-weight: 600)
- **Body Text**: `14px` (font-weight: 400)
- **Small Text**: `12px` (font-weight: 500)
- **Large Numbers**: `32px` (font-weight: 600)

### Font Weights

- **Light**: 400
- **Medium**: 500
- **Semi-bold**: 600
- **Bold**: 700

## Login Page Design

### Layout Structure

- **Two-panel design**: Left panel (white) + Right panel (dark)
- **Responsive container**: 1000px × 600px with rounded corners
- **Shadow**: `0 25px 50px rgba(0, 0, 0, 0.15)`

### Left Panel (White Background)

- **Background**: Pure white (`#ffffff`)
- **Content**: NovaPredict Logo + Mascot + Branding
- **Logo Size**: 315px × 157.5px
- **Mascot Size**: 220px × 220px
- **Text Color**: `#0d1a21` (matching right panel)
- **Alignment**: Centered content with proper spacing

### Right Panel (Dark Background)

- **Background**: `#0d1a21` (Deep dark blue)
- **Form Elements**:
  - Input backgrounds: `#1f2937`
  - Input borders: `#374151`
  - Focus states: `#3b82f6`
- **Text Colors**: White titles, light gray labels
- **Button**: Orange gradient with hover effects

### Form Styling

- **Input Fields**: Rounded corners (12px), 2px borders
- **Focus States**: Blue border with subtle shadow
- **Button**: Orange gradient, hover lift effect
- **Error Handling**: Red borders and backgrounds for validation

## Main Dashboard Design

### Layout Structure

- **Fixed Sidebar**: 280px width, full height
- **Main Content**: Flexible width with left margin
- **Header**: Fixed position, 64px height
- **Content Area**: Padded with max-width constraints

### Sidebar Navigation

#### Structure

```html
<aside class="sidebar">
  <nav class="sidebar-nav">
    <div class="nav-section">
      <ul class="nav-items">
        <li class="nav-item">
          <a href="#" class="nav-link">
            <svg class="nav-icon">...</svg>
            Navigation Text
          </a>
        </li>
      </ul>
    </div>
  </nav>
</aside>
```

#### Styling

- **Background**: White (`#ffffff`)
- **Border**: Right border (`#e5e5e5`)
- **Navigation Items**:
  - Padding: `10px 20px`
  - Hover: Light gray background (`#f8f8f8`)
  - Active: Orange background (`#fff5f2`) with left border
- **Icons**: 18px × 18px, opacity 0.7 (1.0 when active)
- **Section Titles**: Uppercase, small text, gray color

#### Logo Overlay

- **Position**: Fixed overlay on top of sidebar
- **Background**: White with bottom border
- **Logo**: 60px × 30px (NovaPredict Logo)
- **Height**: 64px (matches header height)

### Header Design

#### Structure

```html
<header class="header">
  <div class="breadcrumb">Page Title</div>
  <div class="header-actions">
    <div class="status-dot"></div>
    <span>Status Message</span>
    <div class="user-profile-dropdown">...</div>
  </div>
</header>
```

#### Styling

- **Background**: White (`#ffffff`)
- **Border**: Bottom border (`#e5e5e5`)
- **Height**: 64px
- **Position**: Fixed, positioned to right of sidebar
- **Content**: Breadcrumb navigation + Status + User menu

#### User Profile Dropdown

- **Trigger**: FC avatar button (32px × 32px, orange background)
- **Dropdown**: White background, subtle shadow, rounded corners
- **Items**: Profile and Logout with icons
- **Hover Effects**: Light gray backgrounds
- **Positioning**: Absolute positioning below avatar

### Content Area

#### Card System

- **Background**: White (`#ffffff`)
- **Borders**: Light gray (`#e5e5e5`)
- **Border Radius**: 12px
- **Padding**: 24px
- **Shadows**: Subtle hover effects with orange accents
- **Hover States**: Border color changes to orange, slight lift

#### Grid Layouts

- **Stats Grid**: Auto-fit columns with 280px minimum
- **Production Lines**: 400px minimum columns
- **Device Grid**: 300px minimum columns
- **Agent Grid**: 320px minimum columns

#### Data Visualization

- **Charts**: Placeholder containers with gradient overlays
- **Sparklines**: Simple colored bars for machine status
- **Status Indicators**: Color-coded badges (green, orange, red)
- **Progress Bars**: Gradient fills with percentage displays

## Component Styling

### Buttons

#### Primary Button

```css
.btn-primary {
  background: linear-gradient(135deg, #ff6b35 0%, #ff8e53 100%);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.15s ease;
}

.btn-primary:hover {
  background: #e55a2b;
  transform: translateY(-1px);
}
```

#### Secondary Button

```css
.btn-secondary {
  background: #f8f9fa;
  color: #1a1a1a;
  border: 1px solid #e5e5e5;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.15s ease;
}
```

### Form Elements

#### Input Fields

```css
.form-input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 16px;
  transition: all 0.2s ease;
  background: #f9fafb;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  background: white;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
```

### Status Indicators

#### Status Dots

```css
.status-dot {
  width: 8px;
  height: 8px;
  background: #22c55e;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

#### Status Badges

```css
.status-optimal {
  background: #dcfce7;
  color: #15803d;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}
```

## Responsive Design

### Breakpoints

- **Desktop**: 1200px+ (Full layout)
- **Tablet**: 768px - 1199px (Adjusted grids)
- **Mobile**: < 768px (Stacked layout, hidden sidebar)

### Mobile Adaptations

- **Sidebar**: Hidden by default, transform slide-in
- **Grids**: Single column layouts
- **Cards**: Reduced padding and margins
- **Navigation**: Collapsible menu system

### Responsive Utilities

```css
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }

  .main-content {
    margin-left: 0;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
```

## Animation System

### Transitions

- **Default Duration**: 0.15s ease
- **Hover Effects**: 0.2s ease
- **Page Transitions**: 0.3s ease

### Hover Effects

- **Cards**: Subtle lift (`translateY(-2px)`)
- **Buttons**: Color changes and slight movement
- **Navigation**: Background color changes
- **Icons**: Opacity and color transitions

### Page Animations

```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.screen.active {
  display: block;
  animation: fadeIn 0.3s ease;
}
```

## Icon System

### SVG Icons

- **Size**: 18px × 18px for navigation, 20px × 20px for stats
- **Stroke Width**: 2px
- **Colors**: Inherit from parent (`currentColor`)
- **Hover States**: Opacity and color changes

### Icon Usage

```html
<svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    d="..."
  ></path>
</svg>
```

## Accessibility Features

### Color Contrast

- **Text**: Minimum 4.5:1 contrast ratio
- **Interactive Elements**: Clear hover and focus states
- **Status Indicators**: Color + text for redundancy

### Keyboard Navigation

- **Tab Order**: Logical flow through interface
- **Focus Indicators**: Clear visual feedback
- **Shortcuts**: Ctrl/Cmd + number keys for navigation

### Screen Reader Support

- **Alt Text**: Descriptive text for images
- **ARIA Labels**: Proper labeling for interactive elements
- **Semantic HTML**: Proper heading hierarchy and landmarks

## Implementation Notes for Next.js Upgrade

### TailwindCSS Classes

- **Colors**: Use custom color palette in `tailwind.config.js`
- **Spacing**: Match existing padding/margin system
- **Typography**: Implement custom font weights and sizes
- **Shadows**: Create custom shadow utilities

### shadcn/ui Components

- **Button**: Extend with custom color variants
- **Card**: Implement existing card styling
- **Input**: Match form input styling
- **Dropdown**: Customize user profile dropdown
- **Navigation**: Implement sidebar navigation system

### TypeScript Interfaces

```typescript
interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  active?: boolean;
}

interface DashboardCard {
  title: string;
  value: string | number;
  change?: string;
  icon?: React.ReactNode;
  status?: 'optimal' | 'warning' | 'error';
}
```

### State Management

- **Navigation State**: Active screen tracking
- **User State**: Authentication and profile data
- **Theme State**: Dark/light mode preferences
- **Responsive State**: Mobile/desktop layout management

## File Structure for Next.js

```
src/
├── components/
│   ├── ui/           # shadcn/ui components
│   ├── layout/       # Layout components
│   ├── navigation/   # Sidebar and header
│   └── dashboard/    # Dashboard-specific components
├── styles/
│   ├── globals.css   # Global styles and Tailwind
│   └── components/   # Component-specific styles
├── lib/
│   ├── utils.ts      # Utility functions
│   └── constants.ts  # Design system constants
└── types/
    └── dashboard.ts  # TypeScript interfaces
```

This design system provides a comprehensive foundation for upgrading the NovaPredict platform to modern frontend technologies while maintaining the existing visual identity and user experience.
