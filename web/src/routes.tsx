import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/layout/PageContainer';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/lib/constants';

const AnalyzePage = lazy(() => import('@/features/analyze/AnalyzePage'));
const ComparePage = lazy(() => import('@/features/compare/ComparePage'));
const BenchmarkPage = lazy(() => import('@/features/benchmark/BenchmarkPage'));
const MethodologyPage = lazy(() => import('@/features/methodology/MethodologyPage'));
const HistoryPage = lazy(() => import('@/features/history/HistoryPage'));

function RouteFallback() {
  return (
    <PageContainer>
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    </PageContainer>
  );
}

function withSuspense(Component: React.ComponentType) {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: ROUTES.analyze, element: withSuspense(AnalyzePage) },
      { path: ROUTES.compare, element: withSuspense(ComparePage) },
      { path: ROUTES.benchmark, element: withSuspense(BenchmarkPage) },
      { path: ROUTES.methodology, element: withSuspense(MethodologyPage) },
      { path: ROUTES.history, element: withSuspense(HistoryPage) },
    ],
  },
]);
