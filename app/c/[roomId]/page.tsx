import dynamic from 'next/dynamic';
import { connectDB } from '@/lib/mongodb';
import Room from '@/models/Room';

// Dynamic imports for client components (no SSR for Monaco)
const EditorWrapper = dynamic(() => import('@/components/EditorWrapper'), {
  ssr: false,
  loading: () => (
    <div className="editor-skeleton">
      <div className="editor-skeleton-pulse" />
    </div>
  ),
});

interface PageProps {
  params: { roomId: string };
  searchParams: { view?: string; embed?: string };
}

// Bypasses HTTP loopback requests on Vercel by querying MongoDB directly
async function getRoomData(roomId: string) {
  try {
    await connectDB();
    let room = await Room.findOne({ roomId });

    // Auto-create room if it doesn't exist (upsert pattern)
    if (!room) {
      room = await Room.create({
        roomId,
        code: '',
        language: 'javascript',
      });
    }

    return {
      roomId: room.roomId,
      code: room.code,
      roomLanguage: room.language || 'javascript', // avoid conflict with react/next variables
      createdAt: room.createdAt ? room.createdAt.toISOString() : new Date().toISOString(),
    };
  } catch (err: any) {
    console.error('[Page] Direct DB fetch failed, using fallback:', err.message);
  }
  return { roomId, code: '', roomLanguage: 'javascript', createdAt: new Date().toISOString() };
}

export default async function RoomPage({ params, searchParams }: PageProps) {
  const { roomId } = params;
  const isReadOnly = searchParams.view === '1';
  const isEmbed = searchParams.embed === '1';
  const roomData = await getRoomData(roomId);

  return (
    <div className="flex h-screen flex-col" style={{ background: 'var(--bg-base)' }}>
      <EditorWrapper
        roomId={roomId}
        initialCode={roomData.code}
        initialLanguage={roomData.roomLanguage}
        initialCreatedAt={roomData.createdAt}
        isReadOnly={isReadOnly}
        isEmbed={isEmbed}
      />
    </div>
  );
}
