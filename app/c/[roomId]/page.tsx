import dynamic from 'next/dynamic';

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

async function getRoomData(roomId: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/rooms/${roomId}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('[Page] Failed to fetch room data:', err);
  }
  return { roomId, code: '', language: 'javascript' };
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
        initialLanguage={roomData.language}
        isReadOnly={isReadOnly}
        isEmbed={isEmbed}
      />
    </div>
  );
}
