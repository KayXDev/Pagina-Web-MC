'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FaPlay, FaShoppingCart, FaUsers, FaShieldAlt, FaFire, FaGem } from 'react-icons/fa';
import ServerStatusWidget from '@/components/ServerStatusWidget';
import StaffOnlineWidget from '@/components/StaffOnlineWidget';
import DiscordSupportWidget from '@/components/DiscordSupportWidget';
import AnimatedSection from '@/components/AnimatedSection';
import { Card, Button, Input, Textarea } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';
import { toast } from 'react-toastify';

export default function HomePage() {
  const lang = useClientLang();
  const [staffForm, setStaffForm] = useState({ username: '', discord: '', about: '' });
  const [sendingStaff, setSendingStaff] = useState(false);

  const serverHost = process.env.NEXT_PUBLIC_MINECRAFT_SERVER_IP || 'play.999wrldnetwork.es';
  const serverPort = Number(process.env.NEXT_PUBLIC_MINECRAFT_SERVER_PORT || 25565);
  const serverAddress = `${serverHost}:${Number.isFinite(serverPort) ? serverPort : 25565}`;
  const serverDisplayAddress = serverHost;

  const handlePlayNow = async () => {
    try {
      await navigator.clipboard.writeText(serverDisplayAddress);
    } catch {
      // ignore (clipboard permissions)
    }

    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isSafari = /^((?!chrome|chromium|android).)*safari/i.test(ua);

    // Safari tends to show “invalid address” for unknown URI schemes.
    if (isSafari) {
      toast.info(
        lang === 'es'
          ? `IP copiada: ${serverDisplayAddress}. Pégala en Multijugador > Añadir servidor.`
          : `IP copied: ${serverDisplayAddress}. Paste it in Multiplayer > Add server.`
      );
      return;
    }

    // Best-effort deep link (not supported on all devices/browsers)
    const javaUrl = `minecraft://connect?server=${encodeURIComponent(serverHost)}&port=${
      Number.isFinite(serverPort) ? serverPort : 25565
    }`;

    toast.info(
      lang === 'es'
        ? `IP copiada: ${serverDisplayAddress}. Intentando abrir Minecraft…`
        : `IP copied: ${serverDisplayAddress}. Trying to open Minecraft…`
    );

    window.location.href = javaUrl;
  };

  const [staffOpen, setStaffOpen] = useState(process.env.NEXT_PUBLIC_STAFF_APPLICATIONS_OPEN === 'true');

  useEffect(() => {
    const loadStaffOpen = async () => {
      try {
        const res = await fetch('/api/staff-applications/status', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        setStaffOpen(Boolean((data as any).open));
      } catch {
        // ignore
      }
    };

    loadStaffOpen();
  }, []);

  const submitStaffApplication = async () => {
    if (!staffOpen) return;

    const username = staffForm.username.trim();
    const discord = staffForm.discord.trim();
    const about = staffForm.about.trim();

    if (!username || username.length < 2) {
      toast.error(t(lang, 'home.staffForm.usernameInvalid'));
      return;
    }
    if (!discord || discord.length < 2) {
      toast.error(t(lang, 'home.staffForm.discordInvalid'));
      return;
    }
    if (!about || about.length < 20) {
      toast.error(t(lang, 'home.staffForm.aboutInvalid'));
      return;
    }

    setSendingStaff(true);
    try {
      const res = await fetch('/api/staff-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, discord, about }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');

      toast.success(t(lang, 'home.staffForm.sent'));
      setStaffForm({ username: '', discord: '', about: '' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t(lang, 'home.staffForm.sendError'));
    } finally {
      setSendingStaff(false);
    }
  };

  const features = [
    {
      icon: <FaShieldAlt className="text-4xl text-minecraft-grass" />,
      title: t(lang, 'home.features.anticheat.title'),
      description: t(lang, 'home.features.anticheat.desc'),
    },
    {
      icon: <FaFire className="text-4xl text-minecraft-redstone" />,
      title: t(lang, 'home.features.events.title'),
      description: t(lang, 'home.features.events.desc'),
    },
    {
      icon: <FaUsers className="text-4xl text-minecraft-diamond" />,
      title: t(lang, 'home.features.community.title'),
      description: t(lang, 'home.features.community.desc'),
    },
    {
      icon: <FaGem className="text-4xl text-minecraft-gold" />,
      title: t(lang, 'home.features.economy.title'),
      description: t(lang, 'home.features.economy.desc'),
    },
  ];

  const gameModes = [
    {
      name: 'Survival',
      description: t(lang, 'home.modes.survivalDesc'),
      image: '🏕️',
    },
    {
      name: 'PvP',
      description: t(lang, 'home.modes.pvpDesc'),
      image: '⚔️',
    },
    {
      name: 'SkyBlock',
      description: t(lang, 'home.modes.skyblockDesc'),
      image: '🏝️',
    },
  ];

  return (
    <div className="min-h-screen overflow-x-clip">
      {/* Hero Section */}
      <section className="relative flex min-h-[72vh] items-center justify-center overflow-hidden sm:min-h-[76vh]">
        <div aria-hidden className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/60 to-white dark:via-black/40 dark:to-black"></div>
          <div className="absolute -top-40 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-minecraft-diamond/18 blur-3xl"></div>
          <div className="absolute -bottom-48 left-1/3 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-minecraft-grass/14 blur-3xl"></div>
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-14 pt-24 text-center sm:px-6 sm:pb-16 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="mb-5 bg-gradient-to-r from-minecraft-grass via-minecraft-diamond to-minecraft-diamond bg-[length:200%_200%] bg-[position:0%_50%] bg-clip-text text-4xl font-bold text-transparent transition-[background-position] duration-700 hover:bg-[position:100%_50%] sm:text-5xl md:text-7xl">
              999Wrld Network
            </h1>
            <p className="mx-auto mb-8 max-w-3xl text-base leading-7 text-gray-700 dark:text-gray-300 sm:text-xl md:text-2xl">
              {t(lang, 'home.hero.subtitle')}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mb-12 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
          >
            <Button size="lg" className="w-full sm:min-w-[200px] sm:w-auto" type="button" onClick={handlePlayNow}>
              <FaPlay />
              <span>{t(lang, 'home.hero.playNow')}</span>
            </Button>
            <Link href="/tienda" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:min-w-[200px] sm:w-auto">
                <FaShoppingCart />
                <span>{t(lang, 'home.hero.viewShop')}</span>
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mx-auto max-w-2xl"
          >
            <div className="space-y-3">
              <ServerStatusWidget 
                host={serverHost}
                port={Number.isFinite(serverPort) ? serverPort : 25565}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <StaffOnlineWidget host={serverHost} port={Number.isFinite(serverPort) ? serverPort : 25565} />
                <DiscordSupportWidget />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <AnimatedSection>
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mb-12 text-center sm:mb-16">
            <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl md:text-5xl">{t(lang, 'home.why.title')}</h2>
            <p className="text-base text-gray-600 dark:text-gray-400 sm:text-lg">{t(lang, 'home.why.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full rounded-[28px] text-center">
                  <div className="mb-4 flex justify-center">{feature.icon}</div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                  <p className="text-sm leading-6 text-gray-600 dark:text-gray-400 sm:text-base">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      </AnimatedSection>

      {/* Game Modes Section */}
      <AnimatedSection>
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="mb-10 text-center sm:mb-12">
            <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl md:text-5xl">{t(lang, 'home.modes.title')}</h2>
            <p className="text-base text-gray-600 dark:text-gray-400 sm:text-lg">{t(lang, 'home.modes.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
            {gameModes.map((mode, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
              >
                <Card hover className="h-full rounded-[28px] text-center">
                  <div className="text-6xl mb-4">{mode.image}</div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{mode.name}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{mode.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      </AnimatedSection>

      {/* Staff Form (closed) */}
      <AnimatedSection>
        <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="mb-8 text-center sm:mb-10">
            <h2 className="mb-3 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl md:text-5xl">{t(lang, 'home.staffForm.title')}</h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {staffOpen ? t(lang, 'home.staffForm.openDesc') : t(lang, 'home.staffForm.subtitle')}
            </p>
          </div>

          <Card hover={false} className="rounded-[30px] border-gray-200 dark:border-gray-800">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {staffOpen ? t(lang, 'home.staffForm.openTitle') : t(lang, 'home.staffForm.closedTitle')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {staffOpen ? t(lang, 'home.staffForm.openDesc') : t(lang, 'home.staffForm.closedDesc')}
              </p>
            </div>

            <div className="space-y-4">
              <Input
                disabled={!staffOpen}
                placeholder={t(lang, 'home.staffForm.username')}
                value={staffForm.username}
                onChange={(e) => setStaffForm((p) => ({ ...p, username: e.target.value }))}
              />
              <Input
                disabled={!staffOpen}
                placeholder={t(lang, 'home.staffForm.discord')}
                value={staffForm.discord}
                onChange={(e) => setStaffForm((p) => ({ ...p, discord: e.target.value }))}
              />
              <Textarea
                disabled={!staffOpen}
                rows={5}
                placeholder={t(lang, 'home.staffForm.aboutPlaceholder')}
                value={staffForm.about}
                onChange={(e) => setStaffForm((p) => ({ ...p, about: e.target.value }))}
              />
              <Button disabled={!staffOpen || sendingStaff} variant="secondary" onClick={submitStaffApplication} className="w-full sm:w-auto">
                <span>{t(lang, 'home.staffForm.send')}</span>
              </Button>
            </div>
          </Card>
        </section>
      </AnimatedSection>

      {/* CTA Section */}
      <AnimatedSection>
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <Card className="rounded-[34px] text-center bg-gradient-to-r from-minecraft-grass/20 to-minecraft-diamond/20 border-minecraft-grass">
            <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
              {t(lang, 'home.cta.title')}
            </h2>
            <p className="mb-8 text-base text-gray-700 dark:text-gray-300 sm:text-lg">
              {t(lang, 'home.cta.subtitle')}
            </p>
            <div className="flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center">
              <Button size="lg" className="w-full sm:w-auto">
                <FaPlay />
                <span>{t(lang, 'home.cta.startPlaying')}</span>
              </Button>
            </div>
          </Card>
        </section>
      </AnimatedSection>
    </div>
  );
}
