'use client';

import { useParams } from 'next/navigation';
import { usePathname } from 'next/navigation';
import ProfileShell from './_components/ProfileShell';
import { ProfileProvider } from './_components/profile-context';

export default function PerfilLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();

  // Si estamos en /perfil/[username] (perfil público), no usamos el shell privado.
  // Evita que se renderice tu perfil arriba al ver el de otra persona.
  if (params && typeof (params as any).username !== 'undefined') {
    return <>{children}</>;
  }

  // Ajustes debe ser una página aparte (sin el shell del perfil).
  if (typeof pathname === 'string' && pathname.startsWith('/perfil/ajustes')) {
    return <ProfileProvider>{children}</ProfileProvider>;
  }

  return <ProfileShell>{children}</ProfileShell>;
}
