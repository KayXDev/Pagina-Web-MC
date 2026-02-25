'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { FaServer, FaUsers, FaCopy, FaCheck } from 'react-icons/fa';
import { type ServerStatus } from '@/lib/minecraft';
import { t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';

interface ServerStatusWidgetProps {
  host: string;
  port?: number;
}

const ServerStatusWidget = ({ host, port = 25565 }: ServerStatusWidgetProps) => {
  const lang = useClientLang();
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const portNumber = Number.isFinite(Number(port)) ? Number(port) : 25565;
  const serverAddress = `${host}:${portNumber}`;

  useEffect(() => {
    const fetchStatus = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/server/status?host=${encodeURIComponent(host)}&port=${portNumber}`, {
          cache: 'no-store',
        });
        const data = (await res.json().catch(() => null)) as ServerStatus | null;
        if (res.ok && data) {
          setStatus(data);
        } else {
          setStatus({ online: false, players: { online: 0, max: 0 } });
        }
      } catch {
        setStatus({ online: false, players: { online: 0, max: 0 } });
      }
      setLoading(false);
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [host, portNumber]);

  const copyIP = () => {
    try {
      navigator.clipboard.writeText(serverAddress);
    } catch {
      // ignore
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-6"
      >
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="h-8 bg-gray-700 rounded w-1/2"></div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${status?.online ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className="text-white font-medium">
            {status?.online ? t(lang, 'serverStatus.online') : t(lang, 'serverStatus.offline')}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 bg-black/30 rounded-md p-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="relative h-10 w-10 rounded-md overflow-hidden border border-gray-800 bg-black shrink-0">
            {status?.favicon ? (
              <Image src={status.favicon} alt="" fill sizes="40px" className="object-cover" />
            ) : (
              <div className="h-full w-full grid place-items-center text-minecraft-grass">
                <FaServer />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="text-white font-mono break-all">{serverAddress}</div>
            <div className="text-sm text-gray-400 mt-1 leading-snug break-words">
              {String(status?.motd || '').trim() || (lang === 'es' ? 'Sin mensaje del servidor.' : 'No server message.')}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {status?.online ? (
            <div className="flex items-center gap-2 text-minecraft-grass px-3 py-2 rounded-md bg-minecraft-grass/10 border border-minecraft-grass/20">
              <FaUsers />
              <span className="font-bold">
                {status.players.online}/{status.players.max}
              </span>
            </div>
          ) : null}

          <button
            type="button"
            onClick={copyIP}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-minecraft-grass/20 text-minecraft-grass hover:bg-minecraft-grass/30 transition-colors"
          >
            {copied ? <FaCheck /> : <FaCopy />}
            <span className="text-sm font-medium">
              {copied ? (lang === 'es' ? 'Copiada' : 'Copied') : (lang === 'es' ? 'Copiar IP' : 'Copy IP')}
            </span>
          </button>
        </div>
      </div>

      {status?.version && (
        <div className="text-sm text-gray-400">
          {t(lang, 'serverStatus.version')}: {status.version}
        </div>
      )}
    </motion.div>
  );
};

export default ServerStatusWidget;
