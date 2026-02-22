'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FaBan } from 'react-icons/fa';
import PageHeader from '@/components/PageHeader';
import { Button, Card } from '@/components/ui';

export default function PayPalCancelPage() {
  const sp = useSearchParams();
  const orderId = sp?.get('orderId') || '';
  const [done, setDone] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!orderId) {
        setDone(true);
        return;
      }
      await fetch('/api/shop/paypal/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      }).catch(() => null);
      setDone(true);
    };
    run();
  }, [orderId]);

  return (
    <div className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <PageHeader
        title="Pago cancelado"
        description="No se realizó ningún cobro."
        icon={<FaBan className="text-6xl text-red-400" />}
      />

      <div className="max-w-3xl mx-auto">
        <Card hover={false} className="border-white/10 bg-gray-950/25 rounded-2xl p-6 rounded-2xl">
          <div className="text-gray-300">{done ? 'Puedes intentarlo de nuevo cuando quieras.' : 'Actualizando pedido…'}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/carrito">
              <Button>Volver al carrito</Button>
            </Link>
            <Link href="/tienda">
              <Button variant="secondary">Volver a la tienda</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
