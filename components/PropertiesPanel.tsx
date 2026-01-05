/**
 * PropertiesPanel Component
 *
 * Displays and allows editing of properties for selected elements.
 */

'use client';

import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useEditorStore } from '@/lib/store/editorStore';

export function PropertiesPanel() {
  const { project, selectedElement, selectElement } = useEditorStore();

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
            <PropertyRow label="ID" value={selectedData.id} />
            <PropertyRow label="Start X" value={`${selectedData.startX} mm`} />
            <PropertyRow label="Start Y" value={`${selectedData.startY} mm`} />
            <PropertyRow label="End X" value={`${selectedData.endX} mm`} />
            <PropertyRow label="End Y" value={`${selectedData.endY} mm`} />
            <PropertyRow label="Thickness" value={`${selectedData.thickness} mm`} />
            <PropertyRow label="Length" value={`${selectedData.length} mm`} />
          </>
        ) : (
          <>
            <PropertyRow label="ID" value={selectedData.id} />
            <PropertyRow
              label="Type"
              value={selectedData.openingType === 'door' ? 'Door' : 'Window'}
            />
            <PropertyRow label="Parent Wall" value={selectedData.parentWallId} />
            <PropertyRow label="Offset" value={`${selectedData.offset} mm`} />
            <PropertyRow label="Width" value={`${selectedData.width} mm`} />
          </>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">Press Delete or Backspace to remove this element</p>
      </div>
    </Card>
  );
}

function PropertyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm font-medium text-gray-700">{label}:</span>
      <span className="text-sm text-gray-900 font-mono">{value}</span>
    </div>
  );
}
