'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';

export type ProfileDetails = {
  id: string;
  username: string;
  displayName?: string;
  email: string;
  role: string;
  tags: string[];
  avatar?: string;
  banner?: string;
  verified?: boolean;
  minecraftUsername?: string;
  minecraftUuid?: string;
  minecraftLinkedAt?: string | null;
  isBanned: boolean;
  bannedReason?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string | null;
  followersCount?: number;
  followingCount?: number;
};

type ProfileContextValue = {
  session: any;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  details: ProfileDetails | null;
  loadingDetails: boolean;
  refresh: () => Promise<void>;
  setDetails: (next: ProfileDetails | null) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [details, setDetails] = useState<ProfileDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const refresh = useCallback(async () => {
    if (status !== 'authenticated') return;

    setLoadingDetails(true);
    try {
      const res = await fetch('/api/profile', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error al cargar perfil');
      setDetails(data as ProfileDetails);
    } catch (err: any) {
      toast.error(err?.message || 'Error al cargar perfil');
      setDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  }, [status]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=/perfil');
    }
  }, [status, router]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<ProfileContextValue>(
    () => ({
      session,
      status,
      details,
      loadingDetails,
      refresh,
      setDetails,
    }),
    [session, status, details, loadingDetails, refresh]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
