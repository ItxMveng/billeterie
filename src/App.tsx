import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AppRouter } from '@/app/router';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
