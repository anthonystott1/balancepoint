import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { BusinessProvider } from '@/contexts/BusinessContext';
import { Toaster } from '@/components/ui/toaster';
import Layout from '@/Layout';

// Pages
import Dashboard from '@/pages/Dashboard';
import BankAccounts from '@/pages/BankAccounts';
import Transactions from '@/pages/Transactions';
import Budgets from '@/pages/Budgets';
import RecurringTransactions from '@/pages/RecurringTransactions';
import Receipts from '@/pages/Receipts';
import Invoices from '@/pages/Invoices';
import Contractors from '@/pages/Contractors';
import Reports from '@/pages/Reports';
import Reconciliation from '@/pages/Reconciliation';
import Loans from '@/pages/Loans';
import OwnerEquity from '@/pages/OwnerEquity';
import ChartOfAccounts from '@/pages/ChartOfAccounts';
import TeamManagement from '@/pages/TeamManagement';
import BusinessSettings from '@/pages/BusinessSettings';
import Imports from './pages/Imports'
import BusinessSetup from '@/pages/BusinessSetup';

// Auth pages
import Login from '@/pages/Login';

// Create a client for TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Route wrapper that enforces auth
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center animate-pulse">
            <span className="text-white font-bold text-lg">B</span>
          </div>
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// Wraps a page in Layout with the correct active page name
function WithLayout({ page, children }) {
  return (
    <Layout currentPageName={page}>
      {children}
    </Layout>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />

      {/* BusinessSetup — authed but full-width (no sidebar) */}
      <Route path="/business-setup" element={
        <RequireAuth>
          <WithLayout page="BusinessSetup">
            <BusinessSetup />
          </WithLayout>
        </RequireAuth>
      } />

      {/* All app routes — authed + Layout */}
      <Route path="/" element={
        <RequireAuth>
          <WithLayout page="Dashboard">
            <Dashboard />
          </WithLayout>
        </RequireAuth>
      } />

      <Route path="/dashboard" element={
        <RequireAuth>
          <WithLayout page="Dashboard">
            <Dashboard />
          </WithLayout>
        </RequireAuth>
      } />

      <Route path="/bank-accounts" element={
        <RequireAuth>
          <WithLayout page="BankAccounts">
            <BankAccounts />
          </WithLayout>
        </RequireAuth>
      } />

      <Route path="/transactions" element={
        <RequireAuth>
          <WithLayout page="Transactions">
            <Transactions />
          </WithLayout>
        </RequireAuth>
      } />

      <Route path="/budgets" element={
        <RequireAuth>
          <WithLayout page="Budgets">
            <Budgets />
          </WithLayout>
        </RequireAuth>
      } />

      <Route path="/recurring-transactions" element={
        <RequireAuth>
          <WithLayout page="RecurringTransactions">
            <RecurringTransactions />
          </WithLayout>
        </RequireAuth>
      } />

      <Route path="/receipts" element={
        <RequireAuth>
          <WithLayout page="Receipts">
            <Receipts />
          </WithLayout>
        </RequireAuth>
      } />

      <Route path="/invoices" element={
        <RequireAuth>
          <WithLayout page="Invoices">
            <Invoices />
          </WithLayout>
        </RequireAuth>
      } />

      <Route path="/contractors" element={
        <RequireAuth>
          <WithLayout page="Contractors">
            <Contractors />
          </WithLayout>
        </RequireAuth>
      } />

      <Route path="/reports" element={
        <RequireAuth>
          <WithLayout page="Reports">
            <Reports />
          </WithLayout>
        </RequireAuth>
      } />

      <Route path="/reconciliation" element={
        <RequireAuth>
          <WithLayout page="Reconciliation">
            <Reconciliation />
          </WithLayout>
        </RequireAuth>
      } />

      <Route path="/loans" element={
        <RequireAuth>
          <WithLayout page="Loans">
            <Loans />
          </WithLayout>
        </RequireAuth>
      } />

      <Route path="/owner-equity" element={
        <RequireAuth>
          <WithLayout page="OwnerEquity">
            <OwnerEquity />
          </WithLayout>
        </RequireAuth>
      } />

      <Route path="/chart-of-accounts" element={
        <RequireAuth>
          <WithLayout page="ChartOfAccounts">
            <ChartOfAccounts />
          </WithLayout>
        </RequireAuth>
      } />

      <Route path="/team" element={
        <RequireAuth>
          <WithLayout page="TeamManagement">
            <TeamManagement />
          </WithLayout>
        </RequireAuth>
      } />

      <Route path="/settings" element={
        <RequireAuth>
          <WithLayout page="BusinessSettings">
            <BusinessSettings />
          </WithLayout>
        </RequireAuth>
      } />
      
      <Route path="/imports" element={
        <RequireAuth>
          <WithLayout page="Imports">
            <Imports />
          </WithLayout>
        </RequireAuth>
      } />
      
      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <BusinessProvider>
            <AppRoutes />
            <Toaster />
          </BusinessProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}