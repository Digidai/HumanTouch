'use client';

import { ReactNode } from 'react';
import { ApiKeyProvider } from '@/lib/api-client';

export function Providers({ children }: { children: ReactNode }) {
  return <ApiKeyProvider>{children}</ApiKeyProvider>;
}
