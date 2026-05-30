import React, { useState } from 'react';
// base44 removed
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '../../contexts/BusinessContext';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { X, Plus, Tag as TagIcon } from 'lucide-react';

const TAG_COLORS = {
  gray: 'bg-gray-100 text-gray-700 border-gray-300',
  blue: 'bg-blue-100 text-blue-700 border-blue-300',
  green: 'bg-green-100 text-green-700 border-green-300',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  red: 'bg-red-100 text-red-700 border-red-300',
  purple: 'bg-purple-100 text-purple-700 border-purple-300',
  pink: 'bg-pink-100 text-pink-700 border-pink-300',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-300'
};

export default function TagSelector({ selectedTags = [], onChange }) {
  const { currentBusiness } = useBusiness();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  const { data: allTags = [] } = useQuery({
    queryKey: ['tags', currentBusiness?.id],
    queryFn: () => base44.entities.Tag.filter({
      business_id: currentBusiness.id,
      is_active: true
    }),
    enabled: !!currentBusiness?.id
  });

  const createTagMutation = useMutation({
    mutationFn: (tagName) => base44.entities.Tag.create({
      business_id: currentBusiness.id,
      name: tagName,
      color: 'blue',
      is_active: true
    }),
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: ['tags', currentBusiness.id] });
      onChange([...selectedTags, newTag.id]);
      setNewTagName('');
    }
  });

  const handleToggleTag = (tagId) => {
    if (selectedTags.includes(tagId)) {
      onChange(selectedTags.filter(id => id !== tagId));
    } else {
      onChange([...selectedTags, tagId]);
    }
  };

  const handleCreateTag = () => {
    if (newTagName.trim()) {
      createTagMutation.mutate(newTagName.trim());
    }
  };

  const selectedTagObjects = allTags.filter(tag => selectedTags.includes(tag.id));

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {selectedTagObjects.map(tag => (
          <Badge
            key={tag.id}
            variant="outline"
            className={`${TAG_COLORS[tag.color] || TAG_COLORS.gray} flex items-center gap-1`}
          >
            {tag.category && (
              <span className="text-xs opacity-70">{tag.category}:</span>
            )}
            {tag.name}
            <button
              type="button"
              onClick={() => handleToggleTag(tag.id)}
              className="ml-1 hover:bg-black/10 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 border-dashed"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Create new tag..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateTag();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim()}
                  size="sm"
                >
                  Create
                </Button>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Existing Tags</p>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {allTags.map(tag => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className={`cursor-pointer ${
                        selectedTags.includes(tag.id)
                          ? TAG_COLORS[tag.color] || TAG_COLORS.gray
                          : 'bg-white hover:bg-gray-50'
                      }`}
                      onClick={() => handleToggleTag(tag.id)}
                    >
                      {tag.category && (
                        <span className="text-xs opacity-70">{tag.category}:</span>
                      )}
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
