import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';

export async function GET() {
  try {
    await dbConnect();
    const products = await Product.find({ isActive: true })
      .select('_id name description price salePrice compareAtPrice saleStartsAt saleEndsAt offerLabel bonusBalanceAmount category features image isUnlimited stock order createdAt updatedAt')
      .sort({ order: 1, createdAt: -1 })
      .lean();

    return NextResponse.json(products, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Error al obtener productos' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
