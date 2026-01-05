/**
 * Toolbar Component
 *
 * Tool selection buttons for the floor plan editor.
 */

'use client';

import React from 'react';
import { MousePointer2, Pen, DoorOpen, RectangleHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/lib/store/editorStore';
import { cn } from '@/lib/utils';
import type { EditorTool } from '@/lib/store/types';

export function Toolbar() {
  const { currentTool, setCurrentTool } = useEditorStore();

  const tools: Array<{ id: EditorTool; label: string; icon: React.ReactNode }> = [
    { id: 'select', label: 'Select', icon: <MousePointer2 className="w-4 h-4" /> },
    { id: 'draw-wall', label: 'Draw Wall', icon: <Pen className="w-4 h-4" /> },
    { id: 'add-door', label: 'Add Door', icon: <DoorOpen className="w-4 h-4" /> },
    { id: 'add-window', label: 'Add Window', icon: <RectangleHorizontal className="w-4 h-4" /> },
  ];

  return (
    <div className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
      {tools.map((tool) => (
        <Button
          key={tool.id}
          variant={currentTool === tool.id ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCurrentTool(tool.id)}
          className={cn(
            'flex items-center gap-2',
            currentTool === tool.id && 'bg-blue-600 hover:bg-blue-700'
          )}
        >
          {tool.icon}
          <span>{tool.label}</span>
        </Button>
      ))}
    </div>
  );
}
