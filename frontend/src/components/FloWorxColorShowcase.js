import React, { useState } from 'react';
import { Button, Input, Alert, Card, Badge, Link, ProgressBar, Toast } from './ui';

const FloWorxColorShowcase = () => {
  const [showToast, setShowToast] = useState(false);
  const [toastVariant, setToastVariant] = useState('success');

  const handleShowToast = (variant) => {
    setToastVariant(variant);
    setShowToast(true);
  };

  return (
    <div className="min-h-screen bg-surface-soft p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-ink mb-4">FloWorx Design System</h1>
          <p className="text-xl text-ink-sub">Visual QA & Component Showcase</p>
        </div>

        {/* Color Palette */}
        <Card>
          <Card.Header>
            <Card.Title>Color Palette</Card.Title>
            <Card.Description>FloWorx brand colors and design tokens</Card.Description>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {/* Brand Colors */}
              <div className="space-y-3">
                <h4 className="font-semibold text-ink">Brand</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-brand-primary rounded-lg border border-surface-border"></div>
                    <span className="text-sm text-ink-sub">Primary</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-brand-primary-hover rounded-lg border border-surface-border"></div>
                    <span className="text-sm text-ink-sub">Hover</span>
                  </div>
                </div>
              </div>

              {/* Neutral Colors */}
              <div className="space-y-3">
                <h4 className="font-semibold text-ink">Neutrals</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-ink rounded-lg border border-surface-border"></div>
                    <span className="text-sm text-ink-sub">Ink</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-ink-sub rounded-lg border border-surface-border"></div>
                    <span className="text-sm text-ink-sub">Sub</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-surface-subtle rounded-lg border border-surface-border"></div>
                    <span className="text-sm text-ink-sub">Subtle</span>
                  </div>
                </div>
              </div>

              {/* Feedback Colors */}
              <div className="space-y-3">
                <h4 className="font-semibold text-ink">Feedback</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-success rounded-lg border border-surface-border"></div>
                    <span className="text-sm text-ink-sub">Success</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-warning rounded-lg border border-surface-border"></div>
                    <span className="text-sm text-ink-sub">Warning</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-danger rounded-lg border border-surface-border"></div>
                    <span className="text-sm text-ink-sub">Danger</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-info rounded-lg border border-surface-border"></div>
                    <span className="text-sm text-ink-sub">Info</span>
                  </div>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Buttons */}
        <Card>
          <Card.Header>
            <Card.Title>Buttons</Card.Title>
            <Card.Description>All button variants and states</Card.Description>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-ink">Primary</h4>
                <div className="space-y-2">
                  <Button variant="primary" size="sm">Small</Button>
                  <Button variant="primary" size="md">Medium</Button>
                  <Button variant="primary" size="lg">Large</Button>
                  <Button variant="primary" disabled>Disabled</Button>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-ink">Secondary</h4>
                <div className="space-y-2">
                  <Button variant="secondary" size="sm">Small</Button>
                  <Button variant="secondary" size="md">Medium</Button>
                  <Button variant="secondary" size="lg">Large</Button>
                  <Button variant="secondary" disabled>Disabled</Button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-ink">Other Variants</h4>
                <div className="space-y-2">
                  <Button variant="danger">Danger</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link Button</Button>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Form Elements */}
        <Card>
          <Card.Header>
            <Card.Title>Form Elements</Card.Title>
            <Card.Description>Input fields and form components</Card.Description>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Email Address"
                type="email"
                placeholder="Enter your email"
                helperText="We'll never share your email"
              />
              <Input
                label="Password"
                type="password"
                placeholder="Enter password"
                required
              />
              <Input
                label="Error State"
                type="text"
                placeholder="This field has an error"
                error="This field is required"
              />
              <Input
                label="Disabled Input"
                type="text"
                placeholder="Disabled input"
                disabled
              />
            </div>
          </Card.Content>
        </Card>

        {/* Alerts */}
        <Card>
          <Card.Header>
            <Card.Title>Alerts</Card.Title>
            <Card.Description>Contextual feedback messages</Card.Description>
          </Card.Header>
          <Card.Content>
            <div className="space-y-4">
              <Alert variant="success" title="Success!">
                Your changes have been saved successfully.
              </Alert>
              <Alert variant="warning" title="Warning">
                Please review your settings before continuing.
              </Alert>
              <Alert variant="danger" title="Error">
                There was an error processing your request.
              </Alert>
              <Alert variant="info" title="Information">
                This is some helpful information for you.
              </Alert>
            </div>
          </Card.Content>
        </Card>

        {/* Badges and Progress */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <Card.Header>
              <Card.Title>Badges</Card.Title>
              <Card.Description>Status indicators</Card.Description>
            </Card.Header>
            <Card.Content>
              <div className="flex flex-wrap gap-3">
                <Badge variant="default">Default</Badge>
                <Badge variant="primary">Primary</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="danger">Danger</Badge>
                <Badge variant="info">Info</Badge>
              </div>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>Progress Bars</Card.Title>
              <Card.Description>Progress indicators</Card.Description>
            </Card.Header>
            <Card.Content>
              <div className="space-y-4">
                <ProgressBar value={25} max={100} variant="primary" showLabel />
                <ProgressBar value={50} max={100} variant="success" showLabel />
                <ProgressBar value={75} max={100} variant="warning" showLabel />
                <ProgressBar value={90} max={100} variant="danger" showLabel />
              </div>
            </Card.Content>
          </Card>
        </div>

        {/* Links and Toast Demo */}
        <Card>
          <Card.Header>
            <Card.Title>Links & Toasts</Card.Title>
            <Card.Description>Navigation and notification components</Card.Description>
          </Card.Header>
          <Card.Content>
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-ink mb-3">Links</h4>
                <div className="space-x-4">
                  <Link to="#" variant="primary">Primary Link</Link>
                  <Link to="#" variant="secondary">Secondary Link</Link>
                  <Link href="https://example.com" external>External Link</Link>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-ink mb-3">Toast Notifications</h4>
                <div className="space-x-2">
                  <Button size="sm" onClick={() => handleShowToast('success')}>Success Toast</Button>
                  <Button size="sm" onClick={() => handleShowToast('warning')}>Warning Toast</Button>
                  <Button size="sm" onClick={() => handleShowToast('danger')}>Error Toast</Button>
                  <Button size="sm" onClick={() => handleShowToast('info')}>Info Toast</Button>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Toast Component */}
        {showToast && (
          <Toast
            variant={toastVariant}
            onClose={() => setShowToast(false)}
            duration={3000}
          >
            This is a {toastVariant} toast notification!
          </Toast>
        )}
      </div>
    </div>
  );
};

export default FloWorxColorShowcase;
