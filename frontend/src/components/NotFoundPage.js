import { Link } from 'react-router-dom';
import Card from './ui/Card';
import Button from './ui/Button';

const NotFoundPage = () => {
  return (
    <div className='min-h-screen flex items-center justify-center bg-background p-4'>
      <Card className='max-w-md w-full text-center'>
        <Card.Content>
          <div className='mb-6'>
            <h1 className='text-6xl font-bold text-primary mb-2'>404</h1>
            <h2 className='text-2xl font-semibold text-ink mb-4'>Page Not Found</h2>
            <p className='text-ink-sub mb-6'>
              Sorry, the page you're looking for doesn't exist. It might have been moved, deleted,
              or you entered the wrong URL.
            </p>
          </div>

          <div className='space-y-3'>
            <Button as={Link} to='/dashboard' variant='primary' className='w-full'>
              Go to Dashboard
            </Button>
            <Button as={Link} to='/login' variant='outline' className='w-full'>
              Back to Login
            </Button>
          </div>

          <div className='mt-6 pt-6 border-t border-surface-border'>
            <p className='text-sm text-ink-sub'>
              Need help?{' '}
              <Link to='/support' className='text-primary hover:underline'>
                Contact Support
              </Link>
            </p>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};

export default NotFoundPage;
