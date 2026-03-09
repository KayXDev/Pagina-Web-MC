import { EXPECTED_LICENSE_RUNTIME_SEAL, LICENSE_RUNTIME_SEAL } from '@/lib/license-seal';
import {
  LICENSE_API_TOKEN,
  LICENSE_CACHE_TTL_MS,
  LICENSE_FAIL_OPEN,
  LICENSE_SHARED_SECRET,
  LICENSE_VALIDATION_URL,
} from '@/lib/license-defaults.mjs';

export type LicenseValidationStatus = 'disabled' | 'valid' | 'invalid' | 'unconfigured' | 'error';

export type LicenseValidationResult = {
  ok: boolean;
  status: LicenseValidationStatus;
  message: string;
  reason?: string;
  checkedAt: number;
  expiresAt?: string | null;
  meta?: Record<string, unknown>;
};

type LicenseValidationOptions = {
  origin?: string;
  host?: string;
  pathname?: string;
  userAgent?: string;
};

type LicenseConfig = {
  validationUrl: string;
  licenseKey: string;
  productId: string;
  apiToken: string;
  sharedSecret: string;
  failOpen: boolean;
  cacheTtlMs: number;
};

let licenseCache:
  | {
      cacheKey: string;
      value: LicenseValidationResult;
      ts: number;
    }
  | null = null;

const DEFAULT_CACHE_TTL_MS = LICENSE_CACHE_TTL_MS;
const MIN_CACHE_TTL_MS = 5 * 1000;
const REQUEST_TIMEOUT_MS = 8 * 1000;

function firstNonEmpty(...values: Array<string | undefined>) {
  for (const value of values) {
    const normalized = String(value || '').trim();
    if (normalized) return normalized;
  }
  return '';
}

function readBool(value: string | undefined, fallback = false) {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function getHostWithoutPort(value: string | undefined) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.replace(/^https?:\/\//i, '').split('/')[0]?.split(':')[0]?.trim().toLowerCase() || '';
}

function isLegacyDrakoClientEndpoint(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/\/+$/, '') === '/api/client';
  } catch {
    return url.replace(/\?.*$/, '').replace(/\/+$/, '').endsWith('/api/client');
  }
}

function getLicenseConfig(): LicenseConfig {
  const cacheTtlCandidate = Number(LICENSE_CACHE_TTL_MS || DEFAULT_CACHE_TTL_MS);

  return {
    validationUrl: LICENSE_VALIDATION_URL,
    licenseKey: firstNonEmpty(process.env.KAYX_LICENSE_KEY, process.env.DRAKO_LICENSE_KEY, process.env.LICENSE_KEY),
    productId: firstNonEmpty(process.env.KAYX_PRODUCT_ID, process.env.DRAKO_PRODUCT_ID, process.env.LICENSE_PRODUCT_ID, 'minecraft-server-web'),
    apiToken: LICENSE_API_TOKEN,
    sharedSecret: LICENSE_SHARED_SECRET,
    failOpen: LICENSE_FAIL_OPEN,
    cacheTtlMs:
      Number.isFinite(cacheTtlCandidate) && cacheTtlCandidate >= MIN_CACHE_TTL_MS
        ? cacheTtlCandidate
        : DEFAULT_CACHE_TTL_MS,
  };
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function extractTruthyField(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (key in data) return data[key];
  }
  return undefined;
}

function buildCacheKey(config: LicenseConfig, options: LicenseValidationOptions) {
  return [config.licenseKey, config.validationUrl, config.productId, getHostWithoutPort(options.host || options.origin)].join('::');
}

function isTruthyResult(data: Record<string, unknown>) {
  const nestedData = toRecord(data.data);
  const nestedLicense = toRecord(data.license);
  const candidate = nestedData || nestedLicense || data;
  const fieldValue = extractTruthyField(candidate, ['valid', 'ok', 'success', 'licensed', 'active', 'isValid']);

  return (
    String(data.status_overview || '').toLowerCase() === 'success' ||
    (Boolean(data.status_code) && Boolean(data.status_id) && String(data.status_overview || '').toLowerCase() !== 'failed') ||
    fieldValue === true ||
    ['valid', 'active', 'licensed', 'ok', 'success'].includes(String(candidate.status || '').toLowerCase()) ||
    ['valid', 'active', 'licensed', 'ok', 'success'].includes(String(candidate.result || '').toLowerCase()) ||
    ['valid', 'active', 'licensed', 'ok', 'success'].includes(String(candidate.message || '').toLowerCase())
  );
}

function getMessageFromPayload(data: Record<string, unknown> | null, fallback: string) {
  if (!data) return fallback;

  const nestedData = toRecord(data.data);
  const nestedLicense = toRecord(data.license);
  const candidate = nestedData || nestedLicense || data;

  return String(
    candidate.message ||
      candidate.error ||
      data.message ||
      data.error ||
      (String(data.status_overview || '').toLowerCase() === 'success' ? 'License validated successfully.' : '') ||
      fallback
  );
}

function getReasonFromPayload(data: Record<string, unknown> | null, fallback: string) {
  if (!data) return fallback;

  const nestedData = toRecord(data.data);
  const nestedLicense = toRecord(data.license);
  const candidate = nestedData || nestedLicense || data;

  return String(candidate.reason || candidate.status || candidate.result || data.status_overview || fallback);
}

function normalizeDateLike(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const normalized = value > 1_000_000_000_000 ? value : value * 1000;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (/^\d+$/.test(trimmed)) {
      return normalizeDateLike(Number(trimmed));
    }

    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  return null;
}

function collectCandidateRecords(root: Record<string, unknown> | null, depth = 0, seen = new Set<Record<string, unknown>>()) {
  if (!root || depth > 4 || seen.has(root)) return [] as Record<string, unknown>[];
  seen.add(root);

  const records = [root];
  for (const value of Object.values(root)) {
    const nested = toRecord(value);
    if (nested) records.push(...collectCandidateRecords(nested, depth + 1, seen));
  }

  return records;
}

function extractFirstString(data: Record<string, unknown> | null, keys: string[]) {
  const candidates = collectCandidateRecords(data);

  for (const record of candidates) {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    }
  }

  return null;
}

function extractFirstDate(data: Record<string, unknown> | null, keys: string[]) {
  const candidates = collectCandidateRecords(data);

  for (const record of candidates) {
    for (const key of keys) {
      const normalized = normalizeDateLike(record[key]);
      if (normalized) return normalized;
    }
  }

  for (const record of candidates) {
    for (const [key, value] of Object.entries(record)) {
      const normalizedKey = key.toLowerCase();
      if (!keys.some((candidate) => normalizedKey.includes(candidate.toLowerCase()))) continue;
      const normalized = normalizeDateLike(value);
      if (normalized) return normalized;
    }
  }

  return null;
}

function maskLicenseValue(value: string) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  if (normalized.length <= 8) return normalized;
  return `${normalized.slice(0, 4)}...${normalized.slice(-4)}`;
}

function getExtractedLicenseInfo(
  data: Record<string, unknown> | null,
  config: LicenseConfig,
  options: LicenseValidationOptions,
  checkedAt?: number
) {
  const host = getHostWithoutPort(options.host || options.origin) || null;
  const expiresAt = extractFirstDate(data, [
    'expiresAt',
    'expires_at',
    'expiryAt',
    'expiry_at',
    'expirationAt',
    'expiration_at',
    'expiryDate',
    'expiry_date',
    'expirationDate',
    'expiration_date',
    'expires',
    'expiry',
    'expiration',
    'endDate',
    'end_date',
    'renewalDate',
    'renewal_date',
    'validUntil',
    'valid_until',
  ]);

  return {
    licenseId:
      extractFirstString(data, ['licenseId', 'license_id', 'id', 'keyId', 'key_id']) ||
      maskLicenseValue(config.licenseKey),
    productId:
      extractFirstString(data, ['productId', 'product_id', 'product', 'productName', 'product_name']) ||
      config.productId ||
      null,
    domain:
      extractFirstString(data, ['domain', 'host', 'site', 'url']) ||
      host,
    issuedAt:
      extractFirstDate(data, ['issuedAt', 'issued_at', 'createdAt', 'created_at', 'startDate', 'start_date']) ||
      null,
    expiresAt,
    expirySource: expiresAt ? 'validator' : null,
    validationUrl: config.validationUrl || null,
    checkedHost: host,
    checkedOrigin: options.origin || null,
    checkedAt: checkedAt ? new Date(checkedAt).toISOString() : null,
  };
}

async function parseResponsePayload(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.toLowerCase().includes('application/json')) {
    return (await response.json().catch(() => null)) as Record<string, unknown> | null;
  }

  const text = await response.text().catch(() => '');
  if (!text) return null;

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { message: text };
  }
}

async function performValidationRequest(
  url: string,
  init: RequestInit
): Promise<{ response: Response; data: Record<string, unknown> | null }> {
  const response = await fetch(url, init);
  const data = await parseResponsePayload(response);
  return { response, data };
}

async function performDrakoValidation(config: LicenseConfig, options: LicenseValidationOptions, controller: AbortController) {
  const currentHost = getHostWithoutPort(options.host || options.origin);
  const payload = isLegacyDrakoClientEndpoint(config.validationUrl)
    ? {
        licensekey: config.licenseKey,
        product: config.productId,
        hwid: currentHost || 'unknown-host',
      }
    : {
        key: config.licenseKey,
        licenseKey: config.licenseKey,
        license: config.licenseKey,
        licensekey: config.licenseKey,
        product: config.productId,
        productId: config.productId,
        productName: config.productId,
        domain: currentHost,
        host: currentHost,
        url: options.origin || '',
        origin: options.origin || '',
        path: options.pathname || '',
        hwid: currentHost || 'unknown-host',
        userAgent: options.userAgent || '',
      };

  const baseHeaders = {
    'content-type': 'application/json',
    ...(config.apiToken ? { authorization: config.apiToken, 'x-api-key': config.apiToken } : {}),
    ...(config.sharedSecret ? { 'x-license-secret': config.sharedSecret } : {}),
  };

  return performValidationRequest(config.validationUrl, {
    method: 'POST',
    headers: baseHeaders,
    body: JSON.stringify(payload),
    cache: 'no-store',
    signal: controller.signal,
  });
}

function buildFailureResult(
  status: LicenseValidationStatus,
  message: string,
  reason?: string,
  meta?: Record<string, unknown>
): LicenseValidationResult {
  return {
    ok: false,
    status,
    message,
    reason,
    checkedAt: Date.now(),
    meta,
  };
}

export function isLicenseBypassPath(pathname: string) {
  const path = String(pathname || '').trim();

  if (!path) return false;
  if (path === '/licencia' || path.startsWith('/licencia/')) return true;
  if (path === '/api/license/status') return true;
  return false;
}

export async function validateLicense(options: LicenseValidationOptions = {}): Promise<LicenseValidationResult> {
  const config = getLicenseConfig();
  const currentHost = getHostWithoutPort(options.host || options.origin);

  if (LICENSE_RUNTIME_SEAL !== EXPECTED_LICENSE_RUNTIME_SEAL) {
    return buildFailureResult(
      'invalid',
      'License integrity check failed.',
      'license-integrity-check-failed'
    );
  }

  if (!config.validationUrl) {
    return buildFailureResult(
      'unconfigured',
      'Missing embedded license validation URL.',
      'missing-validation-url'
    );
  }

  if (!config.licenseKey) {
    return buildFailureResult('unconfigured', 'Missing LICENSE_KEY. Add a valid license key in the environment.', 'missing-license-key');
  }

  if (!config.apiToken) {
    return buildFailureResult(
      'unconfigured',
      'Missing embedded license API token.',
      'missing-api-token'
    );
  }

  const cacheKey = buildCacheKey(config, options);
  const now = Date.now();

  if (licenseCache && licenseCache.cacheKey === cacheKey && now - licenseCache.ts < config.cacheTtlMs) {
    return licenseCache.value;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const { response, data } =
      await performDrakoValidation(config, options, controller);

    clearTimeout(timeoutId);

    if (response.ok && data && isTruthyResult(data)) {
      const checkedAt = Date.now();
      const extractedLicenseInfo = getExtractedLicenseInfo(data, config, options, checkedAt);
      const result: LicenseValidationResult = {
        ok: true,
        status: 'valid',
        message: getMessageFromPayload(data, 'License validated successfully.'),
        reason: getReasonFromPayload(data, 'valid'),
        checkedAt,
        expiresAt: extractedLicenseInfo.expiresAt,
        meta: {
          ...data,
          extractedLicenseInfo,
        },
      };
      licenseCache = { cacheKey, value: result, ts: Date.now() };
      return result;
    }

    const extractedLicenseInfo = getExtractedLicenseInfo(data, config, options, Date.now());
    const failure = buildFailureResult(
      'invalid',
      getMessageFromPayload(data, 'License validation failed.'),
      getReasonFromPayload(data, `http-${response.status}`),
      {
        ...(data || {}),
        httpStatus: response.status,
        extractedLicenseInfo,
      }
    );

    licenseCache = { cacheKey, value: failure, ts: Date.now() };
    return failure;
  } catch (error) {
    clearTimeout(timeoutId);

    if (config.failOpen) {
      const checkedAt = Date.now();
      const result: LicenseValidationResult = {
        ok: true,
        status: 'valid',
        message: 'License server unavailable; continuing because LICENSE_FAIL_OPEN=true.',
        reason: 'fail-open',
        checkedAt,
        meta: {
          error: error instanceof Error ? error.message : 'unknown-error',
          extractedLicenseInfo: getExtractedLicenseInfo(null, config, options, checkedAt),
        },
      };
      licenseCache = { cacheKey, value: result, ts: Date.now() };
      return result;
    }

    const failure = buildFailureResult(
      'error',
      'Could not reach the license server.',
      error instanceof Error ? error.message : 'license-request-error'
    );

    licenseCache = { cacheKey, value: failure, ts: Date.now() };
    return failure;
  }
}
