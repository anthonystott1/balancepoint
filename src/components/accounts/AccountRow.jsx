import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Archive, ArchiveRestore, ChevronRight } from 'lucide-react';
import AccountTypeIcon from './AccountTypeIcon';

export default function AccountRow({ 
  account, 
  level = 0, 
  onEdit, 
  onToggleActive,
  canEdit,
  children 
}) {
  const indentClass = level > 0 ? `ml-${level * 8}` : '';
  
  return (
    <>
      <div 
        className={`group flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
          !account.is_active ? 'opacity-60' : ''
        }`}
        style={{ paddingLeft: `${level * 2 + 1}rem` }}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {level > 0 && (
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
          
          <AccountTypeIcon type={account.type} className="w-4 h-4" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <p className="font-medium text-gray-900 truncate">
                {account.name}
              </p>
              {!account.is_active && (
                <Badge variant="outline" className="text-gray-500 border-gray-300">
                  Inactive
                </Badge>
              )}
              {account.is_system_account && (
                <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50">
                  Default
                </Badge>
              )}
            </div>
            {account.description && (
              <p className="text-sm text-gray-500 mt-0.5 truncate">
                {account.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {account.account_number && (
            <span className="text-sm font-mono text-gray-500 hidden sm:block">
              {account.account_number}
            </span>
          )}
          
          <Badge variant="outline" className="capitalize hidden md:block">
            {account.type}
          </Badge>

          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(account)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onToggleActive(account)}
                  className={account.is_active ? 'text-orange-600' : 'text-green-600'}
                >
                  {account.is_active ? (
                    <>
                      <Archive className="w-4 h-4 mr-2" />
                      Deactivate Account
                    </>
                  ) : (
                    <>
                      <ArchiveRestore className="w-4 h-4 mr-2" />
                      Reactivate Account
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      {children}
    </>
  );
}
