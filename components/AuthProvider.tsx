'use client';

import { SessionProvider } from 'next-auth/react';
import { InteractionMotionProvider } from './InteractionMotion';

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider><InteractionMotionProvider>{children}</InteractionMotionProvider></SessionProvider>;
}
