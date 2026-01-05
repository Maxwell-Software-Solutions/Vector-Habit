import Image from 'next/image';
import { FloorPlanEditor } from '@/components/FloorPlanEditor';
import { Toolbar } from '@/components/Toolbar';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import simpleRoomJson from '@/public/examples/simple-room.json';
import type { Project } from '@/lib/ir/schema';

export default function Home() {
  // Load example floor plan
  const exampleProject = simpleRoomJson as Project;

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* Full-screen Canvas */}
      <FloorPlanEditor project={exampleProject} width={undefined} height={undefined} />

      {/* Floating Toolbar - Top Center */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <Toolbar />
      </div>

      {/* Floating Properties Panel - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <PropertiesPanel />
      </div>
    </main>
  );
}
