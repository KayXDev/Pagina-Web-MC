import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function PerfilLicenciaPage() {
  const session = await getSession();
  if (session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER') {
    redirect('/admin/licencia');
  }

  redirect('/perfil');
}