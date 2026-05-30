import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from 'lucide-react';
import { ACCOUNTING_TERMS } from './accountingTerms';

export default function AccountingTooltip({ term, children, explanation, className = '' }) {
  // If term key is provided, look up the explanation
  const termData = term ? ACCOUNTING_TERMS[term] : null;
  const displayText = termData?.term || children;
  const tooltipText = explanation || termData?.explanation;

  if (!tooltipText) {
    return <span className={className}>{displayText}</span>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-1.5 cursor-help ${className}`}>
            {displayText}
            <HelpCircle className="w-3.5 h-3.5 text-gray-400 hover:text-indigo-600 transition-colors" />
          </span>
        </TooltipTrigger>
        <TooltipContent 
          className="max-w-xs bg-white border-indigo-200 shadow-lg"
          side="top"
          sideOffset={5}
        >
          <div className="space-y-1">
            {termData?.term && (
              <p className="font-semibold text-gray-900 text-sm">{termData.term}</p>
            )}
            <p className="text-gray-700 text-sm leading-relaxed">{tooltipText}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Convenience component for inline term usage
export function Term({ term, className = '' }) {
  return <AccountingTooltip term={term} className={className} />;
}
