'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FaBan } from 'react-icons/fa';
import PageHeader from '@/components/PageHeader';
import { Button, Card } from '@/components/ui';

export default function StripeCancelPage() {
  const sp = useSearchParams();
  const orderId = sp?.get('orderId') || '';
  const [done, setDone] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!orderId) {
        setDone(true);
        return;
      }
      await fetch('/api/shop/stripe/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      }).catch(() => null);
      setDone(true);
    };
    run();
  }, [orderId]);

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <PageHeader title="Pago cancelado" description="No se realizó ningún cobro." icon={<FaBan className="text-6xl text-red-400" />} />

      <div className="mx-auto max-w-3xl">
        <Card hover={false} className="rounded-[30px] border-white/10 bg-gray-950/25 p-5 sm:p-6">
          <div className="text-gray-300">{done ? 'Puedes intentarlo de nuevo cuando quieras.' : 'Actualizando pedido…'}</div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link href="/carrito" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">Volver al carrito</Button>
            </Link>
            <Link href="/tienda" className="w-full sm:w-auto">
              <Button variant="secondary" className="w-full sm:w-auto">Volver a la tienda</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
