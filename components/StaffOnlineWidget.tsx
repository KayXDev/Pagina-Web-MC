'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FaUsers } from 'react-icons/fa';
import { useClientLang } from '@/lib/useClientLang';

type StaffOnlineItem = {
  username: string;
  role: string;
  minecraftUsername: string;
  minecraftUuid: string;
  avatar: string;
};

type StaffOnlineResponse = {
  online: boolean;
  count: number;
  staff: StaffOnlineItem[];
};

interface StaffOnlineWidgetProps {
  host: string;
  port?: number;
}

export default function StaffOnlineWidget({ host, port = 25565 }: StaffOnlineWidgetProps) {
  const lang = useClientLang();
  const [data, setData] = useState<StaffOnlineResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const portNumber = Number.isFinite(Number(port)) ? Number(port) : 25565;
  const endpoint = useMemo(
    () => `/api/server/staff-online?host=${encodeURIComponent(host)}&port=${portNumber}`,
    [host, portNumber]
  );

  useEffect(() => {
    let alive = true;

    const fetchStaff = async () => {
      setLoading(true);
      try {
        const res = await fetch(endpoint, { cache: 'no-store' });
        const json = (await res.json().catch(() => null)) as StaffOnlineResponse | null;
        if (!alive) return;
        if (res.ok && json) setData(json);
        else setData({ online: false, count: 0, staff: [] });
      } catch {
        if (!alive) return;
        setData({ online: false, count: 0, staff: [] });
      }
      if (alive) setLoading(false);
    };

    fetchStaff();
    const interval = setInterval(fetchStaff, 30000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [endpoint]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-4"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-white font-medium">
          <FaUsers className="text-minecraft-grass" />
          <span>{lang === 'es' ? 'Staff online' : 'Staff online'}</span>
        </div>

        <div className="text-xs text-gray-400">
          {loading ? (lang === 'es' ? 'Cargando…' : 'Loading…') : `${data?.count ?? 0}`}
        </div>
      </div>

      {!loading && (data?.staff?.length || 0) > 0 ? (
        <div className="flex flex-wrap gap-2">
          {data!.staff.slice(0, 12).map((u) => (
            <div
              key={`${u.minecraftUsername}-${u.username}`}
              className="flex items-center gap-2 rounded-md border border-gray-800 bg-black/30 px-2 py-1"
            >
              <div className="relative h-6 w-6 rounded overflow-hidden bg-black border border-gray-800">
                <Image
                  src={`https://crafatar.com/renders/head/${encodeURIComponent(u.minecraftUsername)}?scale=2&overlay=true`}
                  alt=""
                  fill
                  sizes="24px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-white leading-none truncate max-w-[10rem]">{u.minecraftUsername}</div>
                <div className="text-[10px] text-gray-400 leading-none">{u.role}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-400">
          {lang === 'es' ? 'No hay staff conectado ahora mismo.' : 'No staff online right now.'}
        </div>
      )}
    </motion.div>
  );
}
