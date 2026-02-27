'use client';

import { motion } from 'framer-motion';
import { FaDiscord, FaExternalLinkAlt } from 'react-icons/fa';
import { Button } from '@/components/ui';
import { useClientLang } from '@/lib/useClientLang';

export default function DiscordSupportWidget() {
  const lang = useClientLang();
  const discordUrl = process.env.NEXT_PUBLIC_DISCORD_URL || '';

  const openDiscord = () => {
    if (!discordUrl) return;
    try {
      window.open(discordUrl, '_blank', 'noopener,noreferrer');
    } catch {
      // ignore
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-white font-medium">
            <FaDiscord className="text-minecraft-diamond" />
            <span>{lang === 'es' ? 'Soporte en Discord' : 'Discord support'}</span>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            {lang === 'es'
              ? '¿Necesitas ayuda? Abre ticket o pregunta en Discord.'
              : 'Need help? Open a ticket or ask on Discord.'}
          </p>
        </div>

        <Button variant="secondary" className="shrink-0" disabled={!discordUrl} onClick={openDiscord}>
          <FaExternalLinkAlt />
          <span>{lang === 'es' ? 'Unirse' : 'Join'}</span>
        </Button>
      </div>
    </motion.div>
  );
}
