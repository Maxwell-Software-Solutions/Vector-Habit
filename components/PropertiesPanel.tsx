/**
 * PropertiesPanel Component
 *
 * Displays and allows editing of properties for selected elements.
 */

'use client';

import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useEditorStore } from '@/lib/store/editorStore';
import { commandHistory, UpdateOpeningCommand, UpdateWallCommand } from '@/lib/commands';

export function PropertiesPanel() {
  const { project, selectedElement, selectElement, updateProject } = useEditorStore();

  const selectedData = useMemo(() => {
    if (!project || !selectedElement) return null;

    const level = project.levels[selectedElement.levelIndex];
    if (!level) return null;

    if (selectedElement.type === 'wall') {
      const wall = level.walls.find((w) => w.id === selectedElement.id);
      if (!wall) return null;

      const length = Math.sqrt(Math.pow(wall.b.x - wall.a.x, 2) + Math.pow(wall.b.y - wall.a.y, 2));

      return {
        type: 'wall' as const,
        id: wall.id,
        startX: wall.a.x,
        startY: wall.a.y,
        endX: wall.b.x,
        endY: wall.b.y,
        thickness: wall.thicknessMm,
        length: Math.round(length),
      };
    } else if (selectedElement.type === 'opening') {
      const opening = level.openings.find((o) => o.id === selectedElement.id);
      if (!opening) return null;

      const parentWall = level.walls.find((w) => w.id === opening.wallId);
      const parentWallId = parentWall?.id || 'Unknown';

      return {
        type: 'opening' as const,
        id: opening.id,
        openingType: opening.type,
        parentWallId,
        offset: Math.round(opening.offsetMm),
        width: opening.widthMm,
      };
    }

    return null;
  }, [project, selectedElement]);

  if (!selectedData) {
    return (
      <Card className="p-4 w-80">
        <p className="text-sm text-gray-500 text-center">No element selected</p>
        <p className="text-xs text-gray-400 text-center mt-2">
          Click a wall or opening to view properties
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 w-80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">
          {selectedData.type === 'wall' ? 'Wall Properties' : 'Opening Properties'}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => selectElement(null)}
          className="h-8 w-8 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {selectedData.type === 'wall' ? (
          <>
            <PropertyRow label="ID" value={selectedData.id} readOnly />
            <PropertyRow label="Start X" value={`${selectedData.startX} mm`} readOnly />
            <PropertyRow label="Start Y" value={`${selectedData.startY} mm`} readOnly />
            <PropertyRow label="End X" value={`${selectedData.endX} mm`} readOnly />
            <PropertyRow label="End Y" value={`${selectedData.endY} mm`} readOnly />
            <EditablePropertyRow
              label="Thickness"
              value={selectedData.thickness}
              unit="mm"
              onSave={(value) => {
                if (!project || !selectedElement) return;
                const command = new UpdateWallCommand(
                  selectedElement.id,
                  { thicknessMm: value },
                  project,
                  selectedElement.levelIndex
                );
                commandHistory.execute(command);
                updateProject((p) => ({ ...p }));
              }}
            />
            <PropertyRow label="Length" value={`${selectedData.length} mm`} readOnly />
          </>
        ) : (
          <>
            <PropertyRow label="ID" value={selectedData.id} readOnly />
            <PropertyRow
              label="Type"
              value={selectedData.openingType === 'door' ? 'Door' : 'Window'}
              readOnly
            />
            <PropertyRow label="Parent Wall" value={selectedData.parentWallId} readOnly />
            <PropertyRow label="Offset" value={`${selectedData.offset} mm`} readOnly />
            <EditablePropertyRow
              label="Width"
              value={selectedData.width}
              unit="mm"
              onSave={(value) => {
                if (!project || !selectedElement) return;
                const command = new UpdateOpeningCommand(
                  selectedElement.id,
                  { widthMm: value },
                  project,
                  selectedElement.levelIndex
                );
                commandHistory.execute(command);
                updateProject((p) => ({ ...p }));
              }}
            />
          </>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">Press Delete or Backspace to remove this element</p>
      </div>
    </Card>
  );
}

function PropertyRow({ label, value, readOnly }: { label: string; value: string; readOnly?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm font-medium text-gray-700">{label}:</span>
      <span className="text-sm text-gray-900 font-mono">{value}</span>
    </div>
  );
}

function EditablePropertyRow({
  label,
  value,
  unit,
  onSave,
}: {
  label: string;
  value: number;
  unit: string;
  onSave: (value: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());

  const handleSave = () => {
    const numValue = parseInt(editValue, 10);
    if (!isNaN(numValue) && numValue > 0) {
      onSave(numValue);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value.toString());
      setIsEditing(false);
    }
  };

  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm font-medium text-gray-700">{label}:</span>
      {isEditing ? (
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            autoFocus
            className="w-20 px-2 py-1 text-sm border border-blue-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-500">{unit}</span>
        </div>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="text-sm text-gray-900 font-mono hover:bg-gray-100 px-2 py-1 rounded transition-colors"
        >
          {value} {unit}
        </button>
      )}
    </div>
  );
}
