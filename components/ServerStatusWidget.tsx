'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaServer, FaUsers, FaCopy, FaCheck } from 'react-icons/fa';
import { getServerStatus, type ServerStatus } from '@/lib/minecraft';
import { getClientLangFromCookie, type Lang, t } from '@/lib/i18n';

interface ServerStatusWidgetProps {
  host: string;
  port?: number;
}

const ServerStatusWidget = ({ host, port = 25565 }: ServerStatusWidgetProps) => {
  const [lang, setLang] = useState<Lang>('es');
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLang(getClientLangFromCookie());
  }, []);

  useEffect(() => {
    const fetchStatus = async () => {
      setLoading(true);
      const data = await getServerStatus(host, port);
      setStatus(data);
      setLoading(false);
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [host, port]);

  const copyIP = () => {
    navigator.clipboard.writeText(host);
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
        {status?.online && (
          <div className="flex items-center space-x-2 text-minecraft-grass">
            <FaUsers />
            <span className="font-bold">
              {status.players.online}/{status.players.max}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between bg-black/30 rounded-md p-3 mb-3">
        <div className="flex items-center space-x-2">
          <FaServer className="text-minecraft-grass" />
          <span className="text-white font-mono">{host}</span>
        </div>
        <button
          onClick={copyIP}
          className="p-2 rounded-md bg-minecraft-grass/20 text-minecraft-grass hover:bg-minecraft-grass/30 transition-colors"
        >
          {copied ? <FaCheck /> : <FaCopy />}
        </button>
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
