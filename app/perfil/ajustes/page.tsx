'use client';

import { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import { Badge, Card, Input, Button } from '@/components/ui';
import { toast } from 'react-toastify';
import { t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';
import { useProfile } from '../_components/profile-context';
import { FaImage, FaSignOutAlt, FaTrash, FaUpload, FaUserCircle } from 'react-icons/fa';

function uuidForCrafatar(uuid: string) {
  return String(uuid || '').replace(/-/g, '');
}

export default function PerfilAjustesPage() {
  const { update } = useSession();
  const { session, status, refresh, details, loadingDetails } = useProfile();
  const lang = useClientLang();

  const [username, setUsername] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [savingDisplayName, setSavingDisplayName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const [minecraftUsernameInput, setMinecraftUsernameInput] = useState('');
  const [minecraftResolved, setMinecraftResolved] = useState<null | { username: string; uuid: string }>(null);
  const [checkingMinecraft, setCheckingMinecraft] = useState(false);
  const [savingMinecraft, setSavingMinecraft] = useState(false);

  const minecraftAvatarPrimary = minecraftResolved?.uuid
    ? `https://crafatar.com/avatars/${uuidForCrafatar(minecraftResolved.uuid)}?size=96&overlay=true`
    : '';
  const minecraftAvatarFallback = minecraftResolved?.username
    ? `https://minotar.net/avatar/${encodeURIComponent(minecraftResolved.username)}/96`
    : '';
  const [minecraftAvatarSrc, setMinecraftAvatarSrc] = useState('');

  useEffect(() => {
    setMinecraftAvatarSrc(minecraftAvatarPrimary);
  }, [minecraftAvatarPrimary]);

  useEffect(() => {
    const handle = String((session?.user as any)?.username || session?.user?.name || '').trim();
    if (handle) setUsername(handle);

    const dn = typeof (session?.user as any)?.displayName === 'string' ? String((session.user as any).displayName).trim() : '';
    if (dn && !displayName) setDisplayName(dn);
  }, [session?.user, displayName]);

  useEffect(() => {
    const dn = typeof (details as any)?.displayName === 'string' ? String((details as any).displayName).trim() : '';
    if (dn && !displayName) setDisplayName(dn);
  }, [details, displayName]);

  useEffect(() => {
    const linkedUsername = String((details as any)?.minecraftUsername || '');
    const linkedUuid = String((details as any)?.minecraftUuid || '');
    if (linkedUsername) setMinecraftUsernameInput(linkedUsername);
    if (linkedUsername && linkedUuid) setMinecraftResolved({ username: linkedUsername, uuid: linkedUuid });
  }, [details]);


  if (status !== 'authenticated' || !session) return null;

  const balance = Number((details as any)?.balance ?? (session?.user as any)?.balance ?? 0);

  const checkMinecraft = async () => {
    const username = minecraftUsernameInput.trim();
    if (!username) {
      toast.error(t(lang, 'shop.minecraftNeedUsername'));
      return;
    }

    setCheckingMinecraft(true);
    try {
      const res = await fetch(`/api/minecraft/resolve?username=${encodeURIComponent(username)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');
      const resolved = {
        username: String((data as any).username || username),
        uuid: String((data as any).uuid || ''),
      };
      if (!resolved.uuid) throw new Error('UUID inválido');
      setMinecraftResolved(resolved);
      toast.success(t(lang, 'shop.minecraftVerified'));
    } catch (err: any) {
      setMinecraftResolved(null);
      toast.error(err?.message || 'Error');
    } finally {
      setCheckingMinecraft(false);
    }
  };

  const linkMinecraft = async () => {
    const username = (minecraftResolved?.username || minecraftUsernameInput).trim();
    if (!username) return;
    setSavingMinecraft(true);
    try {
      const res = await fetch('/api/profile/minecraft', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');
      setMinecraftUsernameInput(String((data as any).minecraftUsername || username));
      const uuid = String((data as any).minecraftUuid || '');
      if (uuid) setMinecraftResolved({ username: String((data as any).minecraftUsername || username), uuid });
      await refresh();
      toast.success(t(lang, 'shop.minecraftSaved'));
    } catch (err: any) {
      toast.error(err?.message || 'Error');
    } finally {
      setSavingMinecraft(false);
    }
  };

  const unlinkMinecraft = async () => {
    setSavingMinecraft(true);
    try {
      const res = await fetch('/api/profile/minecraft', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unlink: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');
      setMinecraftResolved(null);
      await refresh();
      toast.success(t(lang, 'shop.minecraftUnlinked'));
    } catch (err: any) {
      toast.error(err?.message || 'Error');
    } finally {
      setSavingMinecraft(false);
    }
  };

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

  const clearAndSave = async (field: 'avatar' | 'banner') => {
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: '' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as any).error || 'Error al guardar cambios');

    await update({
      avatar: field === 'avatar' ? '' : undefined,
      banner: field === 'banner' ? '' : undefined,
    } as any);
    await refresh();
  };

  return (
    <div className="min-h-screen pt-20 pb-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
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
                  <div className="relative w-full h-full">
                    <Image src={details.avatar} alt="Avatar" fill sizes="56px" className="object-cover" />
                  </div>
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

                  <Button
                    variant="secondary"
                    disabled={uploadingAvatar || !details?.avatar}
                    onClick={async () => {
                      setUploadingAvatar(true);
                      try {
                        await clearAndSave('avatar');
                        toast.success('Avatar eliminado');
                      } catch (err: any) {
                        toast.error(err?.message || 'Error');
                      } finally {
                        setUploadingAvatar(false);
                      }
                    }}
                    className="gap-2 mt-2"
                  >
                    <FaTrash />
                    <span>Quitar avatar</span>
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
                  <div className="relative w-full h-full">
                    <Image
                      src={details.banner}
                      alt="Banner"
                      fill
                      sizes="(max-width: 768px) 100vw, 768px"
                      className="object-cover opacity-90"
                    />
                  </div>
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

                  <Button
                    variant="secondary"
                    disabled={uploadingBanner || !details?.banner}
                    onClick={async () => {
                      setUploadingBanner(true);
                      try {
                        await clearAndSave('banner');
                        toast.success('Banner eliminado');
                      } catch (err: any) {
                        toast.error(err?.message || 'Error');
                      } finally {
                        setUploadingBanner(false);
                      }
                    }}
                    className="gap-2 mt-2"
                  >
                    <FaTrash />
                    <span>Quitar banner</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card
        hover={false}
        className="border-white/10 bg-gray-950/25 rounded-2xl p-0 overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-white/10 bg-gray-950/30">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="min-w-0">
              <div className="text-white font-semibold">{t(lang, 'shop.minecraftTitle')}</div>
              <div className="text-sm text-gray-400 mt-1">{t(lang, 'shop.minecraftDesc')}</div>
            </div>

            <div className="flex items-center gap-2">
              {minecraftResolved?.uuid ? (
                <Badge variant="success">{t(lang, 'shop.minecraftVerified')}</Badge>
              ) : (
                <Badge variant="warning">{t(lang, 'shop.minecraftNeedUsername')}</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-3">
              <div className="flex items-center gap-3 p-3 rounded-2xl border border-white/10 bg-white/5">
                <div className="w-14 h-14 rounded-xl border border-white/10 bg-black/20 overflow-hidden flex items-center justify-center shrink-0">
                  {minecraftResolved?.uuid ? (
                    <div className="relative w-full h-full">
                      <Image
                        src={minecraftAvatarSrc || minecraftAvatarPrimary}
                        alt={minecraftResolved.username}
                        fill
                        sizes="56px"
                        className="object-cover"
                        onError={() => {
                          if (!minecraftAvatarFallback) return;
                          setMinecraftAvatarSrc((cur) => (cur === minecraftAvatarFallback ? cur : minecraftAvatarFallback));
                        }}
                      />
                    </div>
                  ) : (
                    <FaUserCircle className="text-3xl text-gray-500" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-xs text-gray-400">{t(lang, 'shop.minecraftLabel')}</div>
                  <div className="text-white font-semibold truncate">
                    {minecraftResolved?.username || minecraftUsernameInput.trim() || '—'}
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-6">
              <div className="text-xs text-gray-400 mb-1">{t(lang, 'shop.minecraftLabel')}</div>
              <div className="flex items-center gap-2">
                <Input
                  value={minecraftUsernameInput}
                  onChange={(e) => setMinecraftUsernameInput(e.target.value)}
                  placeholder={t(lang, 'shop.minecraftPlaceholder')}
                  disabled={savingMinecraft || loadingDetails}
                />
                <Button
                  variant="secondary"
                  disabled={checkingMinecraft || savingMinecraft}
                  onClick={checkMinecraft}
                  className="whitespace-nowrap"
                >
                  {t(lang, 'shop.minecraftCheck')}
                </Button>
              </div>
            </div>

            <div className="md:col-span-3 flex flex-col sm:flex-row md:flex-col gap-2 md:items-stretch">
              <Button
                variant="secondary"
                disabled={savingMinecraft || !minecraftResolved?.uuid}
                onClick={linkMinecraft}
                className="w-full justify-center"
              >
                {t(lang, 'shop.minecraftSave')}
              </Button>
              <Button
                variant="danger"
                disabled={savingMinecraft}
                onClick={unlinkMinecraft}
                className="w-full justify-center"
              >
                {t(lang, 'shop.minecraftUnlink')}
              </Button>
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

                  const saved = String((data as any).username || next);
                  await update({ name: saved, username: saved } as any);
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
        <div className="text-white font-semibold mb-4">{lang === 'es' ? 'Nombre visible' : 'Display name'}</div>
        <div className="space-y-3">
          <div className="text-sm text-gray-400">
            {lang === 'es'
              ? 'Este es el nombre que se mostrará junto a tu @username.'
              : 'This name is shown next to your @username.'}
          </div>
          <Input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
            placeholder={lang === 'es' ? 'Ej: Juan Pérez' : 'e.g. John Doe'}
          />
          <div>
            <Button
              disabled={savingDisplayName}
              onClick={async () => {
                const next = displayName.trim();

                setSavingDisplayName(true);
                try {
                  const response = await fetch('/api/profile', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ displayName: next }),
                  });
                  const data = await response.json().catch(() => ({}));
                  if (!response.ok) throw new Error((data as any).error || 'Error');

                  const saved = String((data as any).displayName || next);
                  await update({ displayName: saved } as any);
                  await refresh();
                  toast.success(lang === 'es' ? 'Nombre actualizado' : 'Name updated');
                } catch (err: any) {
                  toast.error(err?.message || 'Error');
                } finally {
                  setSavingDisplayName(false);
                }
              }}
            >
              {savingDisplayName ? t(lang, 'profile.saving') : lang === 'es' ? 'Guardar nombre' : 'Save name'}
            </Button>
          </div>
        </div>
      </Card>

      <Card hover={false}>
        <div className="text-white font-semibold mb-4">{lang === 'es' ? 'Saldo' : 'Balance'}</div>
        <div className="space-y-3">
          <div className="text-sm text-gray-400">
            {lang === 'es' ? 'Tu saldo actual:' : 'Your current balance:'} <span className="text-white font-semibold">{balance}</span>
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
