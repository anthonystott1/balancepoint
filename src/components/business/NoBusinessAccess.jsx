import React from 'react';
import { Building2, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function NoBusinessAccess() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
          <Building2 className="w-10 h-10 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-3">
          No Business Access
        </h2>
        <p className="text-gray-500 mb-8 leading-relaxed">
          You don't have access to any businesses yet. Create your first business to get started with your accounting.
        </p>
        <Link to={createPageUrl('BusinessSetup')}>
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Business
          </Button>
        </Link>
      </div>
    </div>
  );
}
