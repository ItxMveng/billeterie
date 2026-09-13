import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { AuthFlowRedirect } from '@/features/auth/AuthFlowRedirect';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AppRouter } from '@/app/router';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AuthFlowRedirect />
          <AppRouter />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
