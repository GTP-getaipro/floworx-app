# FloWorx Design System

## Overview

The FloWorx Design System provides a comprehensive set of UI components and design tokens that ensure consistency, accessibility, and brand alignment across the entire application.

## Color System

### Brand Colors

- **Primary**: `#2563EB` (Deep Blue) - Used for primary CTAs, links, and brand elements
- **Primary Hover**: `#3B82F6` (Electric Blue) - Hover states for primary elements

### Neutral Colors

- **Ink**: `#111827` - Primary text, headings
- **Ink Sub**: `#6B7280` - Secondary text, labels
- **Ink Muted**: `#374151` - Tertiary text
- **Surface**: `#FFFFFF` - Cards, modals, containers
- **Surface Soft**: `#F9FAFB` - Page backgrounds
- **Surface Subtle**: `#F3F4F6` - Panels, info boxes
- **Surface Border**: `#E5E7EB` - Borders, dividers

### Feedback Colors

- **Success**: `#10B981` - Success states, confirmations
- **Warning**: `#F59E0B` - Warning states, cautions
- **Danger**: `#EF4444` - Error states, destructive actions
- **Info**: `#06B6D4` - Informational states

## Components

### Button

Primary action button with multiple variants and states.

```jsx
import { Button } from './ui';

<Button variant='primary' size='lg' loading={isLoading}>
  Continue
</Button>;
```

**Variants**: `primary`, `secondary`, `danger`, `ghost`, `link`
**Sizes**: `sm`, `md`, `lg`, `xl`

### Input

Form input component with validation states and accessibility features.

```jsx
import { Input } from './ui';

<Input
  label='Email Address'
  type='email'
  required
  error={errors.email}
  helperText="We'll never share your email"
/>;
```

### Alert

Contextual feedback component for different message types.

```jsx
import { Alert } from './ui';

<Alert variant='success' title='Success!' dismissible>
  Your changes have been saved.
</Alert>;
```

**Variants**: `success`, `warning`, `danger`, `info`

### Card

Container component for grouping related content.

```jsx
import { Card } from './ui';

<Card>
  <Card.Header>
    <Card.Title>Settings</Card.Title>
    <Card.Description>Manage your account preferences</Card.Description>
  </Card.Header>
  <Card.Content>{/* Content */}</Card.Content>
  <Card.Footer>{/* Actions */}</Card.Footer>
</Card>;
```

### Badge

Small status indicator component.

```jsx
import { Badge } from './ui';

<Badge variant='success'>Active</Badge>;
```

**Variants**: `default`, `primary`, `success`, `warning`, `danger`, `info`

### Link

Navigation component with external link support.

```jsx
import { Link } from './ui';

<Link to="/dashboard" variant="primary">Dashboard</Link>
<Link href="https://example.com" external>External Link</Link>
```

### ProgressBar

Visual progress indicator with customizable appearance.

```jsx
import { ProgressBar } from './ui';

<ProgressBar value={75} max={100} showLabel />;
```

## Accessibility Guidelines

### Color Contrast

- **Normal text**: Minimum 4.5:1 contrast ratio (WCAG AA)
- **Large text**: Minimum 3:1 contrast ratio (WCAG AA Large)
- All color combinations in the system meet these requirements

### Focus Management

- All interactive elements have visible focus rings
- Focus rings use `focus-visible:ring-2 focus-visible:ring-brand-primary-hover`
- Tab order follows logical content flow

### Keyboard Navigation

- All components are fully keyboard accessible
- Interactive elements respond to Enter and Space keys
- Modal dialogs trap focus appropriately

### Screen Reader Support

- Semantic HTML elements used throughout
- ARIA labels and descriptions provided where needed
- Form inputs properly associated with labels

## Usage Guidelines

### When to Use Each Color

**Brand Primary**

- Primary call-to-action buttons
- Active navigation items
- Links and interactive elements
- Progress indicators

**Feedback Colors**

- Success: Confirmations, completed states
- Warning: Cautions, non-critical issues
- Danger: Errors, destructive actions
- Info: Helpful information, tips

**Neutral Colors**

- Ink: Primary content, headings
- Ink Sub: Secondary content, labels
- Surface: Content containers
- Surface Soft: Page backgrounds

### Component Selection

**Buttons**

- Use `primary` for main actions
- Use `secondary` for alternative actions
- Use `danger` for destructive actions
- Use `ghost` for subtle actions

**Alerts**

- Use appropriate variant for message type
- Include clear, actionable messaging
- Provide dismissal option when appropriate

**Cards**

- Group related content logically
- Use headers for clear section identification
- Include actions in footers when needed

## Migration from Legacy Styles

When updating existing components:

1. Replace hardcoded colors with design tokens
2. Update class names to use Tailwind utilities
3. Ensure accessibility standards are met
4. Test keyboard navigation and screen reader compatibility
5. Verify color contrast ratios

## Browser Support

The design system supports:

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Considerations

- Components are tree-shakeable
- CSS custom properties enable runtime theming
- Tailwind CSS purges unused styles in production
- All components are optimized for minimal bundle impact
