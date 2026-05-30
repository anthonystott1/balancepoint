import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Eye, Edit, Calculator, Lock } from 'lucide-react';

const PERMISSIONS = [
  {
    level: 'readonly',
    name: 'View Only',
    icon: Eye,
    color: 'bg-gray-100 text-gray-700',
    description: 'Can view all transactions, reports, and data',
    capabilities: [
      'View transactions and reports',
      'Export data',
      'View receipts and documents'
    ]
  },
  {
    level: 'editor',
    name: 'Editor',
    icon: Edit,
    color: 'bg-blue-100 text-blue-700',
    description: 'Can add and edit transactions (respects period locks)',
    capabilities: [
      'All View Only permissions',
      'Create and edit transactions',
      'Upload receipts',
      'Add comments',
      'Create invoices and payments'
    ]
  },
  {
    level: 'accountant',
    name: 'Accountant',
    icon: Calculator,
    color: 'bg-orange-100 text-orange-700',
    description: 'Special access for accountants and bookkeepers',
    capabilities: [
      'All Editor permissions',
      'Post adjustment entries to locked periods',
      'Access full audit log',
      'View activity history',
      'Export complete chart of accounts'
    ]
  },
  {
    level: 'admin',
    name: 'Administrator',
    icon: Lock,
    color: 'bg-violet-100 text-violet-700',
    description: 'Full control over the business',
    capabilities: [
      'All Accountant permissions',
      'Lock and unlock periods',
      'Manage team members',
      'Change business settings',
      'Close business'
    ]
  }
];

export default function PermissionInfo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Permission Levels
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {PERMISSIONS.map(perm => {
          const Icon = perm.icon;
          return (
            <div key={perm.level} className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded flex items-center justify-center ${perm.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold">{perm.name}</h3>
                  <p className="text-sm text-gray-600">{perm.description}</p>
                </div>
              </div>
              <ul className="ml-11 space-y-1">
                {perm.capabilities.map((cap, i) => (
                  <li key={i} className="text-sm text-gray-600">
                    • {cap}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
