import Product from '@/models/Product';
import Coupon from '@/models/Coupon';
import ReferralProfile from '@/models/ReferralProfile';
import Settings from '@/models/Settings';
import ShopOrder from '@/models/ShopOrder';
import User from '@/models/User';

type CartInputItem = { productId: string; quantity: number };

export type CalculatedOrderItem = {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type PricingBreakdown = {
  orderItems: CalculatedOrderItem[];
  subtotal: number;
  totalPrice: number;
  coupon: null | {
    code: string;
    type: 'PERCENT' | 'FIXED';
    value: number;
    discountAmount: number;
  };
  referral: null | {
    code: string;
    referrerUserId: string;
    discountPercent: number;
    discountAmount: number;
    rewardAmount: number;
  };
};

const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

function normalizeCouponCode(value: string | undefined) {
  return String(value || '').trim().toUpperCase();
}

function normalizeReferralCode(value: string | undefined) {
  return String(value || '').trim().toUpperCase();
}

export function normalizeCartItems(rawItems: CartInputItem[]) {
  const normalizedMap = new Map<string, number>();
  for (const item of rawItems || []) {
    const id = String(item?.productId || '').trim();
    const qty = Math.floor(Number(item?.quantity || 0));
    if (!id || !Number.isFinite(qty) || qty <= 0) continue;
    const prev = normalizedMap.get(id) || 0;
    normalizedMap.set(id, Math.min(99, prev + qty));
  }
  return Array.from(normalizedMap.entries()).map(([productId, quantity]) => ({ productId, quantity }));
}

export async function buildPricingFromItems(params: {
  rawItems: CartInputItem[];
  couponCode?: string;
  buyerUserId?: string;
}) : Promise<PricingBreakdown> {
  const normalizedItems = normalizeCartItems(params.rawItems || []);
  if (!normalizedItems.length) {
    throw new Error('Datos inválidos');
  }

  const ids = normalizedItems.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: ids } }).lean();
  const productById = new Map<string, any>(products.map((p: any) => [String(p._id), p]));

  const lineItems = normalizedItems.map((it) => {
    const p = productById.get(String(it.productId));
    return { it, p };
  });

  for (const { p } of lineItems) {
    if (!p) throw new Error('Producto no encontrado');
    if (!p.isActive) throw new Error('Producto no disponible');
  }

  for (const { it, p } of lineItems) {
    if (!p || p.isUnlimited) continue;
    const currentStock = Number((p as any).stock);
    const safeStock = Number.isFinite(currentStock) ? currentStock : 0;
    const need = Math.max(1, Math.floor(Number(it.quantity || 1)));
    if (safeStock < need) {
      const err: any = new Error('Sin stock suficiente');
      err.meta = {
        productId: String((p as any)._id || it.productId),
        stock: safeStock,
        requested: need,
      };
      throw err;
    }
  }

  const orderItems = lineItems.map(({ it, p }) => {
    const unitPrice = Number(p.price || 0);
    const quantity = Number(it.quantity || 1);
    const lineTotal = round2(unitPrice * quantity);
    return {
      productId: String(p._id),
      productName: String(p.name || ''),
      unitPrice,
      quantity,
      lineTotal,
    };
  });

  const subtotal = round2(orderItems.reduce((sum, i) => sum + Number(i.lineTotal || 0), 0));

  const couponCode = normalizeCouponCode(params.couponCode);

  let coupon: PricingBreakdown['coupon'] = null;
  let referral: PricingBreakdown['referral'] = null;

  let runningTotal = subtotal;

  if (couponCode) {
    const found = await Coupon.findOne({ code: couponCode }).lean();
    if (!found || !found.active) throw new Error('Cupón inválido o inactivo');

    const now = Date.now();
    if (found.startsAt && new Date(found.startsAt).getTime() > now) throw new Error('Cupón aún no disponible');
    if (found.expiresAt && new Date(found.expiresAt).getTime() < now) throw new Error('Cupón expirado');

    const maxUses = Number(found.maxUses || 0);
    if (maxUses > 0 && Number(found.usedCount || 0) >= maxUses) throw new Error('Cupón sin usos disponibles');

    const minOrder = Number(found.minOrderTotal || 0);
    if (minOrder > 0 && subtotal < minOrder) throw new Error('No se alcanza el mínimo para este cupón');

    const categories = Array.isArray(found.appliesToCategories)
      ? found.appliesToCategories.map((c: any) => String(c).toUpperCase())
      : [];
    const productIds = Array.isArray(found.appliesToProductIds)
      ? found.appliesToProductIds.map((c: any) => String(c))
      : [];

    const eligibleSubtotal = round2(
      lineItems
        .filter(({ p }) => {
          if (!p) return false;
          const byCategory = categories.length ? categories.includes(String((p as any).category || '').toUpperCase()) : true;
          const byProduct = productIds.length ? productIds.includes(String((p as any)._id || '')) : true;
          return byCategory && byProduct;
        })
        .reduce((sum, { it, p }) => sum + Number((p as any).price || 0) * Number(it.quantity || 0), 0)
    );

    if (eligibleSubtotal <= 0) throw new Error('Cupón no aplicable a los productos seleccionados');

    const type = String(found.type || 'PERCENT').toUpperCase() as 'PERCENT' | 'FIXED';
    const value = Number(found.value || 0);

    let discountAmount = 0;
    if (type === 'PERCENT') {
      discountAmount = round2((eligibleSubtotal * value) / 100);
    } else {
      discountAmount = round2(Math.min(value, eligibleSubtotal));
    }

    if (discountAmount <= 0) throw new Error('Cupón sin descuento aplicable');

    discountAmount = Math.min(discountAmount, runningTotal);
    runningTotal = round2(runningTotal - discountAmount);

    coupon = {
      code: String(found.code),
      type,
      value,
      discountAmount,
    };
  }

  const buyerUserId = String(params.buyerUserId || '').trim();
  if (buyerUserId) {
    const alreadyUsedReferral = await ShopOrder.findOne(
      {
        userId: buyerUserId,
        referralDiscountAmount: { $gt: 0 },
        status: { $in: ['PAID', 'DELIVERED'] },
      },
      { _id: 1 }
    ).lean();

    if (alreadyUsedReferral) {
      return {
        orderItems,
        subtotal,
        totalPrice: round2(Math.max(0, runningTotal)),
        coupon,
        referral: null,
      };
    }

    const buyer = await User.findById(buyerUserId, { _id: 1, referredByCode: 1, referredByUserId: 1 }).lean();
    const referralCode = normalizeReferralCode(String((buyer as any)?.referredByCode || ''));
    const referrerUserId = String((buyer as any)?.referredByUserId || '').trim();

    if (referralCode && referrerUserId && buyerUserId !== referrerUserId) {
      const profile = await ReferralProfile.findOne({ code: referralCode, userId: referrerUserId, active: true }).lean();
      if (profile) {
        const setting = await Settings.findOne({ key: 'referral_discount_percent' }).lean();
        const discountPercentRaw = Number(setting?.value || process.env.REFERRAL_DISCOUNT_PERCENT || 5);
        const discountPercent = Math.max(0, Math.min(100, round2(discountPercentRaw)));
        const rewardAmount = Math.max(0, round2(Number(process.env.REFERRAL_REWARD_BALANCE || 2)));

        let discountAmount = round2((runningTotal * discountPercent) / 100);
        discountAmount = Math.min(discountAmount, runningTotal);

        if (discountAmount > 0) {
          runningTotal = round2(runningTotal - discountAmount);
        }

        referral = {
          code: String((profile as any).code || referralCode),
          referrerUserId,
          discountPercent,
          discountAmount,
          rewardAmount,
        };
      }
    }
  }

  return {
    orderItems,
    subtotal,
    totalPrice: round2(Math.max(0, runningTotal)),
    coupon,
    referral,
  };
}
