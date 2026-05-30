// src/components/business/BusinessSwitcher.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '../../contexts/BusinessContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { ChevronDown, Building2, Check } from 'lucide-react';

export default function BusinessSwitcher() {
  const { businesses, currentBusiness, switchBusiness } = useBusiness();
  const navigate = useNavigate();

  if (!currentBusiness) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors max-w-[200px]">
          <Building2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />
          <span className="truncate">{currentBusiness.display_name}</span>
          {businesses.length > 1 && (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          )}
        </button>
      </DropdownMenuTrigger>

      {businesses.length > 1 && (
        <DropdownMenuContent align="start" className="w-56">
          {businesses.map((access) => (
            <DropdownMenuItem
              key={access.business.id}
              onClick={() => switchBusiness(access.business.id)}
              className="cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{access.business.display_name}</span>
                </div>
                {access.business.id === currentBusiness.id && (
                  <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => navigate('/business-setup')}
            className="cursor-pointer text-indigo-600"
          >
            + Add business
          </DropdownMenuItem>
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}