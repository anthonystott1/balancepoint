// src/Layout.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBusiness } from './contexts/BusinessContext';
import { useAuth } from './contexts/AuthContext';
import BusinessSwitcher from './components/business/BusinessSwitcher';
import { Button } from './components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu';
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  Plus,
  ChevronDown,
  BookOpen,
  Receipt,
  GitCompare,
  HandCoins,
  FileText,
  BarChart3,
  RefreshCw,
  Target,
} from 'lucide-react';

// Map page names to their URL paths
const PAGE_URLS = {
  Dashboard:            '/dashboard',
  BankAccounts:         '/bank-accounts',
  Transactions:         '/transactions',
  Budgets:              '/budgets',
  RecurringTransactions:'/recurring-transactions',
  Receipts:             '/receipts',
  Invoices:             '/invoices',
  Contractors:          '/contractors',
  Reports:              '/reports',
  Reconciliation:       '/reconciliation',
  Loans:                '/loans',
  OwnerEquity:          '/owner-equity',
  ChartOfAccounts:      '/chart-of-accounts',
  TeamManagement:       '/team',
  BusinessSettings:     '/settings',
  BusinessSetup:        '/business-setup',
};

export function createPageUrl(pageName) {
  return PAGE_URLS[pageName] ?? '/';
}

const navItems = [
  { name: 'Dashboard',         icon: LayoutDashboard, page: 'Dashboard' },
  { name: 'Bank Accounts',     icon: Building2,        page: 'BankAccounts' },
  { name: 'Transactions',      icon: Receipt,          page: 'Transactions' },
  { name: 'Budgets',           icon: Target,           page: 'Budgets' },
  { name: 'Recurring',         icon: RefreshCw,        page: 'RecurringTransactions' },
  { name: 'Receipts',          icon: FileText,         page: 'Receipts' },
  { name: 'Invoices',          icon: FileText,         page: 'Invoices' },
  { name: 'Contractors',       icon: Users,            page: 'Contractors' },
  { name: 'Reports',           icon: BarChart3,        page: 'Reports' },
  { name: 'Reconciliation',    icon: GitCompare,       page: 'Reconciliation' },
  { name: 'Loans',             icon: HandCoins,        page: 'Loans' },
  { name: "Owner's Equity",    icon: Users,            page: 'OwnerEquity' },
  { name: 'Chart of Accounts', icon: BookOpen,         page: 'ChartOfAccounts' },
  { name: 'Team',              icon: Users,            page: 'TeamManagement' },
  { name: 'Settings',          icon: Settings,         page: 'BusinessSettings' },
];

export default function Layout({ children, currentPageName }) {
  const { currentBusiness } = useBusiness();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // BusinessSetup renders full-width without sidebar
  if (currentPageName === 'BusinessSetup') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 md:px-6 h-16">
          {/* Left — Logo + Business Switcher */}
          <div className="flex items-center gap-4">
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900 hidden sm:block">BalancePoint</span>
            </Link>

            <div className="hidden md:block h-6 w-px bg-gray-200 mx-2" />

            <div className="hidden md:block">
              <BusinessSwitcher />
            </div>
          </div>

          {/* Right — New Business + User Menu */}
          <div className="flex items-center gap-4">
            <Link to="/business-setup">
              <Button variant="outline" size="sm" className="hidden sm:flex">
                <Plus className="w-4 h-4 mr-1" />
                New Business
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-medium text-sm">
                    {user?.email?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-500 hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="font-medium text-sm truncate">{user?.email ?? 'User'}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Business Switcher */}
        <div className="md:hidden px-4 pb-3">
          <BusinessSwitcher />
        </div>
      </header>

      <div className="flex">
        {/* Sidebar — Desktop */}
        <aside className="hidden md:block w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-64px)] sticky top-16 overflow-y-auto">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-indigo-600' : ''}`} />
                  <span className="font-medium text-sm">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 top-16">
            <div
              className="absolute inset-0 bg-black/20"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="absolute left-0 top-0 w-64 bg-white h-full shadow-xl overflow-y-auto">
              <nav className="p-4 space-y-1">
                {navItems.map((item) => {
                  const isActive = currentPageName === item.page;
                  return (
                    <Link
                      key={item.page}
                      to={createPageUrl(item.page)}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-indigo-600' : ''}`} />
                      <span className="font-medium text-sm">{item.name}</span>
                    </Link>
                  );
                })}
                <div className="pt-4 mt-4 border-t">
                  <Link
                    to="/business-setup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-indigo-600 hover:bg-indigo-50"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="font-medium text-sm">New Business</span>
                  </Link>
                </div>
              </nav>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-64px)]">
          {children}
        </main>
      </div>
    </div>
  );
}
