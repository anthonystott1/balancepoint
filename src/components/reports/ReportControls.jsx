import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Download } from 'lucide-react';

export default function ReportControls({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange,
  onPresetSelect,
  onExport,
  showComparison = false,
  comparisonEnabled = false,
  onToggleComparison
}) {
  const presets = [
    { value: 'this-month', label: 'This Month' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'this-quarter', label: 'This Quarter' },
    { value: 'last-quarter', label: 'Last Quarter' },
    { value: 'this-year', label: 'This Year' },
    { value: 'last-year', label: 'Last Year' },
    { value: 'ytd', label: 'Year to Date' },
    { value: 'custom', label: 'Custom Range' }
  ];

  return (
    <Card className="border-0 shadow-md bg-white/80 backdrop-blur">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Date Preset Selector */}
          <div className="w-full md:w-48">
            <Label className="text-xs text-gray-500 mb-1.5 block">Quick Select</Label>
            <Select onValueChange={onPresetSelect} defaultValue="this-month">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {presets.map(preset => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="flex-1 grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500 mb-1.5 block">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1.5 block">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-end gap-2">
            {showComparison && (
              <Button
                variant={comparisonEnabled ? "default" : "outline"}
                onClick={onToggleComparison}
                className="whitespace-nowrap"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Compare
              </Button>
            )}
            
            <Button variant="outline" onClick={onExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
