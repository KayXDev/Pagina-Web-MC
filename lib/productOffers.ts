type ProductLike = {
  price?: number;
  salePrice?: number;
  compareAtPrice?: number;
  saleStartsAt?: Date | string | null;
  saleEndsAt?: Date | string | null;
  offerLabel?: string;
  bonusBalanceAmount?: number;
};

function toTimestamp(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getTime();
}

export function isProductOfferActive(product: ProductLike, now = Date.now()) {
  const salePrice = Number(product?.salePrice || 0);
  const basePrice = Number(product?.price || 0);
  if (!(salePrice > 0) || !(salePrice < basePrice)) return false;

  const startsAt = toTimestamp(product?.saleStartsAt);
  const endsAt = toTimestamp(product?.saleEndsAt);

  if (startsAt && startsAt > now) return false;
  if (endsAt && endsAt <= now) return false;
  return true;
}

export function getProductEffectivePrice(product: ProductLike, now = Date.now()) {
  return isProductOfferActive(product, now)
    ? Number(product?.salePrice || 0)
    : Number(product?.price || 0);
}

export function getProductReferencePrice(product: ProductLike, now = Date.now()) {
  if (isProductOfferActive(product, now)) {
    return Number(product?.compareAtPrice || product?.price || 0);
  }
  return Number(product?.compareAtPrice || 0);
}

export function getProductOfferCountdown(product: ProductLike, now = Date.now()) {
  const endsAt = toTimestamp(product?.saleEndsAt);
  if (!isProductOfferActive(product, now) || !endsAt) return null;
  return Math.max(0, endsAt - now);
}