import { useState } from 'react';

import { Button, Input, Alert, Card, Badge, Link, ProgressBar } from './ui';

const ComponentShowcase = () => {
  const [inputValue, setInputValue] = useState('');
  const [showAlert, setShowAlert] = useState(true);

  return (
    <div className='min-h-screen bg-surface-soft p-8'>
      <div className='max-w-6xl mx-auto space-y-12'>
        {/* Header */}
        <div className='text-center'>
          <h1 className='text-4xl font-bold text-ink mb-4'>FloWorx Design System</h1>
          <p className='text-xl text-ink-sub'>Component Library & Style Guide</p>
        </div>

        {/* Color Palette */}
        <Card>
          <Card.Header>
            <Card.Title>Color Palette</Card.Title>
            <Card.Description>Brand colors and design tokens</Card.Description>
          </Card.Header>
          <Card.Content>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-6'>
              <div>
                <h4 className='font-semibold text-ink mb-3'>Brand</h4>
                <div className='space-y-2'>
                  <div className='flex items-center space-x-3'>
                    <div className='w-8 h-8 bg-brand-primary rounded' />
                    <span className='text-sm text-ink-sub'>Primary</span>
                  </div>
                  <div className='flex items-center space-x-3'>
                    <div className='w-8 h-8 bg-brand-primary-hover rounded' />
                    <span className='text-sm text-ink-sub'>Primary Hover</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className='font-semibold text-ink mb-3'>Neutrals</h4>
                <div className='space-y-2'>
                  <div className='flex items-center space-x-3'>
                    <div className='w-8 h-8 bg-ink rounded' />
                    <span className='text-sm text-ink-sub'>Ink</span>
                  </div>
                  <div className='flex items-center space-x-3'>
                    <div className='w-8 h-8 bg-surface border border-surface-border rounded' />
                    <span className='text-sm text-ink-sub'>Surface</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className='font-semibold text-ink mb-3'>Feedback</h4>
                <div className='space-y-2'>
                  <div className='flex items-center space-x-3'>
                    <div className='w-8 h-8 bg-success rounded' />
                    <span className='text-sm text-ink-sub'>Success</span>
                  </div>
                  <div className='flex items-center space-x-3'>
                    <div className='w-8 h-8 bg-danger rounded' />
                    <span className='text-sm text-ink-sub'>Danger</span>
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
            <Card.Description>Interactive button components with various states</Card.Description>
          </Card.Header>
          <Card.Content>
            <div className='space-y-6'>
              <div>
                <h4 className='font-medium text-ink mb-3'>Variants</h4>
                <div className='flex flex-wrap gap-3'>
                  <Button variant='primary'>Primary</Button>
                  <Button variant='secondary'>Secondary</Button>
                  <Button variant='danger'>Danger</Button>
                  <Button variant='ghost'>Ghost</Button>
                  <Button variant='link'>Link</Button>
                </div>
              </div>
              <div>
                <h4 className='font-medium text-ink mb-3'>Sizes</h4>
                <div className='flex flex-wrap items-center gap-3'>
                  <Button size='sm'>Small</Button>
                  <Button size='md'>Medium</Button>
                  <Button size='lg'>Large</Button>
                  <Button size='xl'>Extra Large</Button>
                </div>
              </div>
              <div>
                <h4 className='font-medium text-ink mb-3'>States</h4>
                <div className='flex flex-wrap gap-3'>
                  <Button loading>Loading</Button>
                  <Button disabled>Disabled</Button>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Form Inputs */}
        <Card>
          <Card.Header>
            <Card.Title>Form Inputs</Card.Title>
            <Card.Description>Input components with validation states</Card.Description>
          </Card.Header>
          <Card.Content>
            <div className='grid md:grid-cols-2 gap-6'>
              <Input
                label='Email Address'
                type='email'
                placeholder='Enter your email'
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                helperText="We'll never share your email"
              />
              <Input label='Password' type='password' placeholder='Enter password' required />
              <Input
                label='Error State'
                type='text'
                placeholder='This field has an error'
                error='This field is required'
              />
              <Input label='Disabled Input' type='text' placeholder='Disabled input' disabled />
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
            <div className='space-y-4'>
              <Alert variant='success' title='Success!'>
                Your changes have been saved successfully.
              </Alert>
              <Alert variant='warning' title='Warning'>
                Please review your settings before continuing.
              </Alert>
              <Alert variant='danger' title='Error'>
                There was a problem processing your request.
              </Alert>
              <Alert variant='info' title='Information'>
                This is some helpful information for you.
              </Alert>
              {showAlert && (
                <Alert
                  variant='info'
                  title='Dismissible Alert'
                  dismissible
                  onDismiss={() => setShowAlert(false)}
                >
                  This alert can be dismissed by clicking the X button.
                </Alert>
              )}
            </div>
          </Card.Content>
        </Card>

        {/* Badges */}
        <Card>
          <Card.Header>
            <Card.Title>Badges</Card.Title>
            <Card.Description>Status indicators and labels</Card.Description>
          </Card.Header>
          <Card.Content>
            <div className='space-y-4'>
              <div>
                <h4 className='font-medium text-ink mb-3'>Variants</h4>
                <div className='flex flex-wrap gap-2'>
                  <Badge variant='default'>Default</Badge>
                  <Badge variant='primary'>Primary</Badge>
                  <Badge variant='success'>Success</Badge>
                  <Badge variant='warning'>Warning</Badge>
                  <Badge variant='danger'>Danger</Badge>
                  <Badge variant='info'>Info</Badge>
                </div>
              </div>
              <div>
                <h4 className='font-medium text-ink mb-3'>Sizes</h4>
                <div className='flex flex-wrap items-center gap-2'>
                  <Badge size='sm'>Small</Badge>
                  <Badge size='md'>Medium</Badge>
                  <Badge size='lg'>Large</Badge>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Links */}
        <Card>
          <Card.Header>
            <Card.Title>Links</Card.Title>
            <Card.Description>Navigation and external links</Card.Description>
          </Card.Header>
          <Card.Content>
            <div className='space-y-4'>
              <div className='flex flex-wrap gap-4'>
                <Link to='/dashboard' variant='primary'>
                  Primary Link
                </Link>
                <Link to='/settings' variant='secondary'>
                  Secondary Link
                </Link>
                <Link to='/help' variant='muted'>
                  Muted Link
                </Link>
                <Link href='https://example.com' external variant='primary'>
                  External Link
                </Link>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Progress Bars */}
        <Card>
          <Card.Header>
            <Card.Title>Progress Bars</Card.Title>
            <Card.Description>Visual progress indicators</Card.Description>
          </Card.Header>
          <Card.Content>
            <div className='space-y-6'>
              <ProgressBar value={25} showLabel />
              <ProgressBar value={50} variant='success' showLabel />
              <ProgressBar value={75} variant='warning' showLabel />
              <ProgressBar value={90} variant='danger' showLabel />
            </div>
          </Card.Content>
        </Card>

        {/* Typography */}
        <Card>
          <Card.Header>
            <Card.Title>Typography</Card.Title>
            <Card.Description>Text styles and hierarchy</Card.Description>
          </Card.Header>
          <Card.Content>
            <div className='space-y-4'>
              <h1 className='text-4xl font-bold text-ink'>Heading 1</h1>
              <h2 className='text-3xl font-bold text-ink'>Heading 2</h2>
              <h3 className='text-2xl font-semibold text-ink'>Heading 3</h3>
              <h4 className='text-xl font-semibold text-ink'>Heading 4</h4>
              <p className='text-base text-ink'>
                This is regular body text. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              </p>
              <p className='text-sm text-ink-sub'>
                This is secondary text with reduced opacity for less important information.
              </p>
              <p className='text-xs text-ink-muted'>
                This is muted text for captions and fine print.
              </p>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

export default ComponentShowcase;
