import React from 'react';
import { Card } from './ui';

const Settings = () => {
  return (
    <div className='min-h-screen bg-surface-soft'>
      <div className='max-w-6xl mx-auto px-6 py-8'>
        <Card>
          <Card.Header>
            <Card.Title>Settings</Card.Title>
          </Card.Header>
          <Card.Content>
            <p className='text-ink-sub'>Settings page content goes here.</p>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
