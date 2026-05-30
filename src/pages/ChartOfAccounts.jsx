// //src\pages\ChartOfAccounts.jsx
// import React, { useState } from 'react';
// // base44 removed
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { useBusiness } from '../contexts/BusinessContext';
// import RequireBusinessAccess from '@/components/business/RequireBusinessAccess';
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Plus, Search, Loader2, BookOpen, Info } from 'lucide-react';
// import AccountForm from '@/components/accounts/AccountForm';
// import AccountRow from '@/components/accounts/AccountRow';
// import AccountTypeIcon from '@/components/accounts/AccountTypeIcon';
// import { Term } from '@/components/accounting/AccountingTooltip';

// function ChartOfAccountsContent() {
//   const { currentBusiness, canEdit } = useBusiness();
//   const queryClient = useQueryClient();
//   const [searchQuery, setSearchQuery] = useState('');
//   const [selectedType, setSelectedType] = useState('all');
//   const [isFormOpen, setIsFormOpen] = useState(false);
//   const [editingAccount, setEditingAccount] = useState(null);

//   const { data: accounts = [], isLoading } = useQuery({
//     queryKey: ['accounts', currentBusiness?.id],
//     queryFn: () => base44.entities.Account.filter({
//       business_id: currentBusiness.id
//     }),
//     enabled: !!currentBusiness?.id
//   });

//   const createAccountMutation = useMutation({
//     mutationFn: (accountData) => base44.entities.Account.create({
//       ...accountData,
//       business_id: currentBusiness.id,
//       is_active: true
//     }),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['accounts', currentBusiness.id] });
//       setIsFormOpen(false);
//       setEditingAccount(null);
//     }
//   });

//   const updateAccountMutation = useMutation({
//     mutationFn: ({ id, data }) => base44.entities.Account.update(id, data),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['accounts', currentBusiness.id] });
//       setIsFormOpen(false);
//       setEditingAccount(null);
//     }
//   });

//   const handleSubmit = (formData) => {
//     if (editingAccount) {
//       updateAccountMutation.mutate({ id: editingAccount.id, data: formData });
//     } else {
//       createAccountMutation.mutate(formData);
//     }
//   };

//   const handleEdit = (account) => {
//     setEditingAccount(account);
//     setIsFormOpen(true);
//   };

//   const handleToggleActive = (account) => {
//     updateAccountMutation.mutate({
//       id: account.id,
//       data: { is_active: !account.is_active }
//     });
//   };

//   const handleCloseForm = () => {
//     setIsFormOpen(false);
//     setEditingAccount(null);
//   };

//   // Filter and organize accounts
//   const filteredAccounts = accounts.filter(account => {
//     const matchesSearch = account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
//                          account.account_number?.includes(searchQuery) ||
//                          account.description?.toLowerCase().includes(searchQuery.toLowerCase());
//     const matchesType = selectedType === 'all' || account.type === selectedType;
//     return matchesSearch && matchesType;
//   });

//   // Build hierarchy
//   const buildHierarchy = (parentId = null) => {
//     return filteredAccounts
//       .filter(acc => (parentId ? acc.parent_account_id === parentId : !acc.parent_account_id))
//       .sort((a, b) => {
//         // Sort by account number if both have it, otherwise by name
//         if (a.account_number && b.account_number) {
//           return a.account_number.localeCompare(b.account_number);
//         }
//         return a.name.localeCompare(b.name);
//       });
//   };

//   const renderAccountHierarchy = (parentId = null, level = 0) => {
//     const accountsAtLevel = buildHierarchy(parentId);
    
//     return accountsAtLevel.map(account => (
//       <React.Fragment key={account.id}>
//         <AccountRow
//           account={account}
//           level={level}
//           onEdit={handleEdit}
//           onToggleActive={handleToggleActive}
//           canEdit={canEdit()}
//         >
//           {renderAccountHierarchy(account.id, level + 1)}
//         </AccountRow>
//       </React.Fragment>
//     ));
//   };

//   // Group accounts by type for the summary
//   const accountsByType = {
//     asset: accounts.filter(a => a.type === 'asset' && a.is_active),
//     liability: accounts.filter(a => a.type === 'liability' && a.is_active),
//     equity: accounts.filter(a => a.type === 'equity' && a.is_active),
//     income: accounts.filter(a => a.type === 'income' && a.is_active),
//     expense: accounts.filter(a => a.type === 'expense' && a.is_active)
//   };

//   const typeLabels = {
//     asset: 'Assets',
//     liability: 'Liabilities',
//     equity: 'Equity',
//     income: 'Income',
//     expense: 'Expenses'
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-6 md:p-10">
//       <div className="max-w-6xl mx-auto">
//         {/* Header */}
//         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
//           <div>
//             <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
//               <BookOpen className="w-8 h-8 text-indigo-600" />
//               <Term term="chart_of_accounts" />
//             </h1>
//             <p className="text-gray-500 mt-1">
//               Organize how you track money in your business
//             </p>
//           </div>

//           {canEdit() && (
//             <Button 
//               className="bg-indigo-600 hover:bg-indigo-700"
//               onClick={() => {
//                 setEditingAccount(null);
//                 setIsFormOpen(true);
//               }}
//             >
//               <Plus className="w-4 h-4 mr-2" />
//               Add Account
//             </Button>
//           )}
//         </div>

//         {/* Info Banner */}
//         <Card className="mb-6 border-l-4 border-l-blue-500 bg-blue-50/50">
//           <CardContent className="p-4">
//             <div className="flex gap-3">
//               <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
//               <div>
//                 <p className="font-medium text-blue-900">What is a Chart of Accounts?</p>
//                 <p className="text-sm text-blue-700 mt-1">
//                   Think of it as categories for organizing your business finances. Every time money moves, 
//                   you'll assign it to one of these accounts. This helps you understand where your money comes 
//                   from and where it goes.
//                 </p>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Summary Cards */}
//         <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
//           {Object.entries(accountsByType).map(([type, accs]) => (
//             <Card 
//               key={type} 
//               className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
//               onClick={() => setSelectedType(type)}
//             >
//               <CardContent className="p-4">
//                 <div className="flex items-center gap-3">
//                   <AccountTypeIcon type={type} className="w-5 h-5" />
//                   <div>
//                     <p className="text-2xl font-bold text-gray-900">{accs.length}</p>
//                     <p className="text-xs text-gray-500">{typeLabels[type]}</p>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           ))}
//         </div>

//         {/* Filters */}
//         <Card className="border-0 shadow-lg bg-white/80 backdrop-blur mb-6">
//           <CardContent className="p-6">
//             <div className="flex flex-col md:flex-row gap-4">
//               <div className="flex-1 relative">
//                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
//                 <Input
//                   placeholder="Search accounts by name or number..."
//                   value={searchQuery}
//                   onChange={(e) => setSearchQuery(e.target.value)}
//                   className="pl-10"
//                 />
//               </div>
              
//               <Tabs value={selectedType} onValueChange={setSelectedType} className="w-full md:w-auto">
//                 <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
//                   <TabsTrigger value="all">All</TabsTrigger>
//                   <TabsTrigger value="asset">Assets</TabsTrigger>
//                   <TabsTrigger value="liability">Liabilities</TabsTrigger>
//                   <TabsTrigger value="equity">Equity</TabsTrigger>
//                   <TabsTrigger value="income">Income</TabsTrigger>
//                   <TabsTrigger value="expense">Expenses</TabsTrigger>
//                 </TabsList>
//               </Tabs>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Accounts List */}
//         <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
//           <CardHeader>
//             <CardTitle>Your Accounts</CardTitle>
//             <CardDescription>
//               {filteredAccounts.length} account{filteredAccounts.length !== 1 ? 's' : ''}
//               {searchQuery && ' matching your search'}
//             </CardDescription>
//           </CardHeader>
//           <CardContent className="p-0">
//             {isLoading ? (
//               <div className="flex items-center justify-center py-12">
//                 <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
//               </div>
//             ) : filteredAccounts.length === 0 ? (
//               <div className="text-center py-12">
//                 <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
//                 <p className="text-gray-500">
//                   {searchQuery 
//                     ? 'No accounts match your search' 
//                     : 'No accounts yet. Add your first account to get started.'}
//                 </p>
//               </div>
//             ) : (
//               <div className="divide-y divide-gray-100">
//                 {renderAccountHierarchy()}
//               </div>
//             )}
//           </CardContent>
//         </Card>

//         {/* Account Form Dialog */}
//         <AccountForm
//           account={editingAccount}
//           isOpen={isFormOpen}
//           onClose={handleCloseForm}
//           onSubmit={handleSubmit}
//           isSubmitting={createAccountMutation.isPending || updateAccountMutation.isPending}
//           accounts={accounts}
//         />
//       </div>
//     </div>
//   );
// }

// export default function ChartOfAccounts() {
//   return (
//     <RequireBusinessAccess requiredPermission="readonly">
//       <ChartOfAccountsContent />
//     </RequireBusinessAccess>
//   );
// }


import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Using root-relative paths to resolve import issues in the current environment
import { supabase } from '@/lib/supabase';
import { useBusiness } from '@/contexts/BusinessContext';
import RequireBusinessAccess from '@/components/business/RequireBusinessAccess';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Loader2, BookOpen, Info } from 'lucide-react';
import AccountForm from '@/components/accounts/AccountForm';
import AccountRow from '@/components/accounts/AccountRow';
import AccountTypeIcon from '@/components/accounts/AccountTypeIcon';
import { Term } from '@/components/accounting/AccountingTooltip';

function ChartOfAccountsContent() {
  const { currentBusiness, canEdit } = useBusiness();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts', currentBusiness?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('business_id', currentBusiness.id);
      if (error) throw error;
      return data;
    },
    enabled: !!currentBusiness?.id
  });

  const createAccountMutation = useMutation({
    mutationFn: async (accountData) => {
      const { data, error } = await supabase
        .from('accounts')
        .insert([{ ...accountData, business_id: currentBusiness.id, is_active: true }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', currentBusiness.id] });
      setIsFormOpen(false);
      setEditingAccount(null);
    }
  });

  const updateAccountMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { error } = await supabase
        .from('accounts')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', currentBusiness.id] });
      setIsFormOpen(false);
      setEditingAccount(null);
    }
  });

  const handleSubmit = (formData) => {
    if (editingAccount) {
      updateAccountMutation.mutate({ id: editingAccount.id, data: formData });
    } else {
      createAccountMutation.mutate(formData);
    }
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setIsFormOpen(true);
  };

  const handleToggleActive = (account) => {
    updateAccountMutation.mutate({
      id: account.id,
      data: { is_active: !account.is_active }
    });
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingAccount(null);
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = (account.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         account.code?.includes(searchQuery));
    const matchesType = selectedType === 'all' || account.type === selectedType;
    return matchesSearch && matchesType;
  });

  const buildHierarchy = (parentId = null) => {
    return filteredAccounts
      .filter(acc => (parentId ? acc.parent_account_id === parentId : !acc.parent_account_id))
      .sort((a, b) => (a.code || '').localeCompare(b.code || ''));
  };

  const renderAccountHierarchy = (parentId = null, level = 0) => {
    const accountsAtLevel = buildHierarchy(parentId);
    return accountsAtLevel.map(account => (
      <React.Fragment key={account.id}>
        <AccountRow
          account={account}
          level={level}
          onEdit={handleEdit}
          onToggleActive={handleToggleActive}
          canEdit={canEdit()}
        >
          {renderAccountHierarchy(account.id, level + 1)}
        </AccountRow>
      </React.Fragment>
    ));
  };

  const accountsByType = {
    asset: accounts.filter(a => a.type === 'asset' && a.is_active),
    liability: accounts.filter(a => a.type === 'liability' && a.is_active),
    equity: accounts.filter(a => a.type === 'equity' && a.is_active),
    income: accounts.filter(a => (a.type === 'income' || a.type === 'revenue') && a.is_active),
    expense: accounts.filter(a => a.type === 'expense' && a.is_active)
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-indigo-600" />
              Chart of Accounts
            </h1>
            <p className="text-gray-500 mt-1">Organize how you track money in your business</p>
          </div>
          {canEdit() && (
            <Button className="bg-indigo-600" onClick={() => { setEditingAccount(null); setIsFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Add Account
            </Button>
          )}
        </div>

        <Card className="mb-6 border-l-4 border-l-blue-500 bg-blue-50/50">
          <CardContent className="p-4 flex gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <p className="text-sm text-blue-700">
              Categories for organizing your business finances. Every transaction is assigned to one of these accounts.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {['asset', 'liability', 'equity', 'income', 'expense'].map((type) => (
            <Card 
              key={type} 
              className={`shadow-sm cursor-pointer hover:shadow-md transition-all ${selectedType === type ? 'ring-2 ring-indigo-500 bg-indigo-50/30' : ''}`} 
              onClick={() => setSelectedType(type)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <AccountTypeIcon type={type} className="w-5 h-5" />
                <div>
                  <p className="text-2xl font-bold">{accountsByType[type]?.length || 0}</p>
                  <p className="text-xs text-gray-500 capitalize">{type}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="shadow-lg bg-white mb-6 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search accounts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={selectedType} onValueChange={setSelectedType}>
              <TabsList className="bg-slate-100">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="asset">Assets</TabsTrigger>
                <TabsTrigger value="liability">Liabilities</TabsTrigger>
                <TabsTrigger value="equity">Equity</TabsTrigger>
                <TabsTrigger value="income">Income</TabsTrigger>
                <TabsTrigger value="expense">Expenses</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </Card>

        <Card className="shadow-lg">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-600 w-8 h-8" /></div>
            ) : filteredAccounts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No accounts found matching your filters.</div>
            ) : (
              <div className="divide-y">{renderAccountHierarchy()}</div>
            )}
          </CardContent>
        </Card>

        {isFormOpen && (
          <AccountForm
            account={editingAccount}
            isOpen={isFormOpen}
            onClose={handleCloseForm}
            onSubmit={handleSubmit}
            isSubmitting={createAccountMutation.isPending || updateAccountMutation.isPending}
            accounts={accounts}
          />
        )}
      </div>
    </div>
  );
}

export default function ChartOfAccounts() {
  return (
    <RequireBusinessAccess requiredPermission="readonly">
      <ChartOfAccountsContent />
    </RequireBusinessAccess>
  );
}