'use client';

import { useParams } from 'next/navigation';
import ProfileShell from './_components/ProfileShell';

export default function PerfilLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();

  // Si estamos en /perfil/[username] (perfil público), no usamos el shell privado.
  // Evita que se renderice tu perfil arriba al ver el de otra persona.
  if (params && typeof (params as any).username !== 'undefined') {
    return <>{children}</>;
  }

  return <ProfileShell>{children}</ProfileShell>;
}
