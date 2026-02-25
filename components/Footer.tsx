'use client';

import Link from 'next/link';
import { FaDiscord, FaTiktok, FaYoutube, FaHeart } from 'react-icons/fa';
import { t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';

const Footer = () => {
  const lang = useClientLang();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white/80 dark:bg-gray-950/70 backdrop-blur-md border-t border-minecraft-diamond/20 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-4">999Wrld Network</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {t(lang, 'footer.about')}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-4">{t(lang, 'footer.quickLinks')}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-600 dark:text-gray-400 hover:text-minecraft-grass transition-colors text-sm">
                  {t(lang, 'nav.home')}
                </Link>
              </li>
              <li>
                <Link href="/tienda" className="text-gray-600 dark:text-gray-400 hover:text-minecraft-grass transition-colors text-sm">
                  {t(lang, 'nav.shop')}
                </Link>
              </li>
              <li>
                <Link href="/normas" className="text-gray-600 dark:text-gray-400 hover:text-minecraft-grass transition-colors text-sm">
                  {t(lang, 'nav.rules')}
                </Link>
              </li>
              <li>
                <Link href="/soporte" className="text-gray-600 dark:text-gray-400 hover:text-minecraft-grass transition-colors text-sm">
                  {t(lang, 'nav.support')}
                </Link>
              </li>
              <li>
                <Link href="/partner" className="text-gray-600 dark:text-gray-400 hover:text-minecraft-grass transition-colors text-sm">
                  {t(lang, 'nav.partner')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-4">{t(lang, 'footer.legal')}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/terminos" className="text-gray-600 dark:text-gray-400 hover:text-minecraft-grass transition-colors text-sm">
                  {t(lang, 'footer.terms')}
                </Link>
              </li>
              <li>
                <Link href="/privacidad" className="text-gray-600 dark:text-gray-400 hover:text-minecraft-grass transition-colors text-sm">
                  {t(lang, 'footer.privacy')}
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-gray-600 dark:text-gray-400 hover:text-minecraft-grass transition-colors text-sm">
                  {t(lang, 'footer.cookies')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-4">{t(lang, 'footer.follow')}</h3>
            <div className="flex items-center space-x-4">
              <a
                href={process.env.NEXT_PUBLIC_DISCORD_URL || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 dark:text-gray-400 hover:text-[#5865F2] transition-colors"
              >
                <FaDiscord size={24} />
              </a>
              <a
                href={process.env.NEXT_PUBLIC_TIKTOK_URL || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <FaTiktok size={24} />
              </a>
              <a
                href={process.env.NEXT_PUBLIC_YOUTUBE_URL || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 dark:text-gray-400 hover:text-[#FF0000] transition-colors"
              >
                <FaYoutube size={24} />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800">
          <p className="text-center text-gray-600 dark:text-gray-400 text-sm flex items-center justify-center">
            © {currentYear} 999Wrld Network. {t(lang, 'footer.madeWith')}{' '}
            <FaHeart className="mx-1 text-red-500" /> {t(lang, 'footer.forCommunity')}
          </p>
          <p className="text-center text-gray-500 dark:text-gray-500 text-xs mt-2">
            {t(lang, 'footer.notAffiliated')}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
