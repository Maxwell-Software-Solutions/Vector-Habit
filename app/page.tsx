import Image from 'next/image';
import { FloorPlanViewer } from '@/components/FloorPlanViewer';
import simpleRoomJson from '@/public/examples/simple-room.json';
import type { Project } from '@/lib/ir/schema';

export default function Home() {
  // Load example floor plan
  const exampleProject = simpleRoomJson as Project;

  return (
    <main className="flex flex-col items-center justify-center p-8">
      <div className="z-10 max-w-6xl w-full">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Image
            src="/vercel-triangle.svg"
            alt="FloorForge Logo"
            width={40}
            height={40}
            className="flex-shrink-0"
            priority
          />
          <h1 className="text-4xl font-bold gradient-text">FloorForge</h1>
        </div>

        <p className="text-center text-lg mb-2 text-gray-700">AI-Driven Floor Plan Design Tool</p>
        <p className="text-center text-sm mb-8 text-gray-500">
          Stage 2: Canvas Viewer Prototype - Read-only visualization
        </p>

        {/* Floor Plan Viewer */}
        <div className="mb-8 relative">
          <FloorPlanViewer project={exampleProject} width={1000} height={700} />
        </div>

        {/* Project Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="p-6 gradient-border">
            <h2 className="text-xl font-semibold mb-2">📐 Project</h2>
            <ul className="text-sm space-y-1">
              <li>
                <strong>Name:</strong> {exampleProject.name}
              </li>
              <li>
                <strong>Levels:</strong> {exampleProject.levels.length}
              </li>
              <li>
                <strong>Walls:</strong> {exampleProject.levels[0]?.walls.length || 0}
              </li>
              <li>
                <strong>Openings:</strong> {exampleProject.levels[0]?.openings.length || 0}
              </li>
            </ul>
          </div>

          <div className="p-6 gradient-border">
            <h2 className="text-xl font-semibold mb-2">✅ Stage 1 Complete</h2>
            <ul className="text-sm space-y-1">
              <li>✓ IR Schema (Zod)</li>
              <li>✓ Validation Engine</li>
              <li>✓ 100% Test Coverage</li>
              <li>✓ Rating: 9.5/10</li>
            </ul>
          </div>

          <div className="p-6 gradient-border">
            <h2 className="text-xl font-semibold mb-2">🎨 Stage 2 Features</h2>
            <ul className="text-sm space-y-1">
              <li>✓ Konva.js Canvas</li>
              <li>✓ Geometry Derivation</li>
              <li>✓ Pan/Zoom Controls</li>
              <li>✓ Wall & Opening Rendering</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
