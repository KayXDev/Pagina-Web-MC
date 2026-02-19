'use client';

import { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { Card, Input, Button } from '@/components/ui';
import { toast } from 'react-toastify';
import { getClientLangFromCookie, type Lang, t } from '@/lib/i18n';
import { useProfile } from '../_components/profile-context';
import { FaImage, FaSignOutAlt, FaUpload, FaUserCircle } from 'react-icons/fa';

export default function PerfilAjustesPage() {
  const { update } = useSession();
  const { session, status, refresh, details, loadingDetails } = useProfile();
  const [lang, setLang] = useState<Lang>('es');

  const [username, setUsername] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  useEffect(() => {
    setLang(getClientLangFromCookie());
  }, []);

  useEffect(() => {
    if (session?.user?.name) setUsername(session.user.name);
  }, [session?.user?.name]);

  if (status !== 'authenticated' || !session) return null;

  const uploadAndSave = async (opts: {
    file: File;
    uploadEndpoint: string;
    field: 'avatar' | 'banner';
  }) => {
    const fd = new FormData();
    fd.append('file', opts.file);
    const up = await fetch(opts.uploadEndpoint, { method: 'POST', body: fd });
    const upData = await up.json().catch(() => ({}));
    if (!up.ok) throw new Error((upData as any).error || 'Error al subir imagen');
    const url = String((upData as any).url || '');
    if (!url) throw new Error('URL inválida');

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [opts.field]: url }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as any).error || 'Error al guardar cambios');

    // Actualizar session para que se refleje sin recargar
    await update({
      avatar: typeof (data as any).avatar === 'string' ? (data as any).avatar : undefined,
      banner: typeof (data as any).banner === 'string' ? (data as any).banner : undefined,
    } as any);

    await refresh();
    return url;
  };

  return (
    <div className="space-y-6">
      <Card hover={false}>
        <div className="text-white font-semibold">{t(lang, 'profile.nav.settings')}</div>
        <div className="text-sm text-gray-400 mt-1">Actualiza tu cuenta y seguridad</div>
      </Card>

      <Card hover={false}>
        <div className="text-white font-semibold mb-4">Personalización</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 text-white font-medium">
              <FaUserCircle className="text-minecraft-grass" />
              <span>Foto de perfil</span>
            </div>
            <div className="text-sm text-gray-400 mt-1">Sube una imagen (PNG/JPG/WEBP/GIF, máx. 5MB)</div>

            <div className="mt-3 flex items-center gap-3">
              <div className="w-14 h-14 rounded-full border border-white/10 bg-gray-900 overflow-hidden flex items-center justify-center">
                {details?.avatar ? (
                  <img src={details.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <FaUserCircle className="text-3xl text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  disabled={uploadingAvatar || loadingDetails}
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                />
                <div className="mt-2">
                  <Button
                    variant="secondary"
                    disabled={!avatarFile || uploadingAvatar}
                    onClick={async () => {
                      if (!avatarFile) return;
                      setUploadingAvatar(true);
                      try {
                        await uploadAndSave({
                          file: avatarFile,
                          uploadEndpoint: '/api/uploads/profile-avatar',
                          field: 'avatar',
                        });
                        setAvatarFile(null);
                        toast.success('Avatar actualizado');
                      } catch (err: any) {
                        toast.error(err?.message || 'Error');
                      } finally {
                        setUploadingAvatar(false);
                      }
                    }}
                    className="gap-2"
                  >
                    <FaUpload />
                    <span>{uploadingAvatar ? 'Subiendo…' : 'Subir avatar'}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-white font-medium">
              <FaImage className="text-minecraft-grass" />
              <span>Banner</span>
            </div>
            <div className="text-sm text-gray-400 mt-1">Se verá arriba de tu perfil</div>

            <div className="mt-3">
              <div className="h-20 rounded-lg border border-white/10 bg-gray-900 overflow-hidden">
                {details?.banner ? (
                  <img src={details.banner} alt="Banner" className="w-full h-full object-cover opacity-90" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-minecraft-grass/20 via-gray-950/40 to-minecraft-diamond/20" />
                )}
              </div>

              <div className="mt-3">
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  disabled={uploadingBanner || loadingDetails}
                  onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                />
                <div className="mt-2">
                  <Button
                    variant="secondary"
                    disabled={!bannerFile || uploadingBanner}
                    onClick={async () => {
                      if (!bannerFile) return;
                      setUploadingBanner(true);
                      try {
                        await uploadAndSave({
                          file: bannerFile,
                          uploadEndpoint: '/api/uploads/profile-banner',
                          field: 'banner',
                        });
                        setBannerFile(null);
                        toast.success('Banner actualizado');
                      } catch (err: any) {
                        toast.error(err?.message || 'Error');
                      } finally {
                        setUploadingBanner(false);
                      }
                    }}
                    className="gap-2"
                  >
                    <FaUpload />
                    <span>{uploadingBanner ? 'Subiendo…' : 'Subir banner'}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card hover={false}>
        <div className="text-white font-semibold mb-4">{t(lang, 'profile.usernameTitle')}</div>
        <div className="space-y-3">
          <div className="text-sm text-gray-400">{t(lang, 'profile.usernameHelp')}</div>
          <Input type="text" value={username} onChange={(e) => setUsername(e.target.value)} minLength={3} maxLength={20} />
          <div>
            <Button
              disabled={savingUsername}
              onClick={async () => {
                const next = username.trim();
                if (!next) return;

                setSavingUsername(true);
                try {
                  const response = await fetch('/api/profile', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: next }),
                  });
                  const data = await response.json().catch(() => ({}));
                  if (!response.ok) throw new Error((data as any).error || t(lang, 'profile.usernameUpdateError'));

                  await update({ name: (data as any).username || next });
                  await refresh();
                  toast.success(t(lang, 'profile.usernameUpdated'));
                } catch (err: any) {
                  toast.error(err?.message || t(lang, 'profile.usernameUpdateError'));
                } finally {
                  setSavingUsername(false);
                }
              }}
            >
              {savingUsername ? t(lang, 'profile.saving') : t(lang, 'profile.saveUsername')}
            </Button>
          </div>
        </div>
      </Card>

      <Card hover={false}>
        <div className="text-white font-semibold mb-4">{t(lang, 'profile.securityTitle')}</div>
        <div className="space-y-4">
          <div>
            <div className="text-white font-medium">{t(lang, 'profile.changePassword')}</div>
            <div className="text-sm text-gray-400 mt-1">{t(lang, 'profile.changePasswordHelp')}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-gray-400 text-sm mb-2">{t(lang, 'profile.currentPassword')}</div>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-2">{t(lang, 'profile.newPassword')}</div>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
              />
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-2">{t(lang, 'profile.confirmPassword')}</div>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
              />
            </div>
          </div>

          <div>
            <Button
              disabled={savingPassword}
              onClick={async () => {
                if (savingPassword) return;
                if (!currentPassword || !newPassword || !confirmPassword) {
                  toast.error(t(lang, 'profile.passwordMissing'));
                  return;
                }
                if (newPassword !== confirmPassword) {
                  toast.error(t(lang, 'profile.passwordMismatch'));
                  return;
                }

                setSavingPassword(true);
                try {
                  const res = await fetch('/api/profile/password', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentPassword, newPassword }),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error((data as any).error || t(lang, 'profile.passwordUpdateError'));

                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  toast.success(t(lang, 'profile.passwordUpdated'));
                } catch (err: any) {
                  toast.error(err?.message || t(lang, 'profile.passwordUpdateError'));
                } finally {
                  setSavingPassword(false);
                }
              }}
            >
              {savingPassword ? t(lang, 'profile.updating') : t(lang, 'profile.updatePassword')}
            </Button>
          </div>
        </div>
      </Card>

      <Card hover={false}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-white font-semibold">{t(lang, 'profile.sessionTitle')}</div>
            <div className="text-sm text-gray-400 mt-1">{t(lang, 'profile.sessionExpires')}</div>
          </div>
          <Button
            variant="secondary"
            className="gap-2 text-red-400"
            onClick={() => {
              signOut();
            }}
          >
            <FaSignOutAlt />
            <span>{t(lang, 'profile.signOut')}</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
