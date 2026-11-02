'use client';

import { useParams } from 'next/navigation';
import GamePlay from '@/components/games/GamePlay';

export default function PlayGame() {
  const params = useParams<{ gameId: string }>();
  return <GamePlay gameId={params.gameId} />;
}
