'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

export type PublicProfileDetails = {
  id: string;
  username: string;
  displayName?: string;
  role: string;
  tags: string[];
  badges?: string[];
  avatar?: string;
  banner?: string;
  verified?: boolean;
  createdAt?: string;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isSelf: boolean;
};

type PublicProfileContextValue = {
  usernameParam: string;
  profile: PublicProfileDetails | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setProfile: (next: PublicProfileDetails | null) => void;
};

const PublicProfileContext = createContext<PublicProfileContextValue | null>(null);

export function PublicProfileProvider({
  username,
  children,
}: {
  username: string;
  children: React.ReactNode;
}) {
  const usernameParam = String(username || '').trim();
  const [profile, setProfile] = useState<PublicProfileDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!usernameParam) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(usernameParam)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');
      setProfile(data as PublicProfileDetails);
    } catch (err: any) {
      toast.error(err?.message || 'Error');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [usernameParam]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<PublicProfileContextValue>(
    () => ({
      usernameParam,
      profile,
      loading,
      refresh,
      setProfile,
    }),
    [usernameParam, profile, loading, refresh]
  );

  return <PublicProfileContext.Provider value={value}>{children}</PublicProfileContext.Provider>;
}

export function usePublicProfile() {
  const ctx = useContext(PublicProfileContext);
  if (!ctx) throw new Error('usePublicProfile must be used within PublicProfileProvider');
  return ctx;
}
