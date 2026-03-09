import mongoose from 'mongoose';

const EMBEDDED_LICENSE_DB_URI =
  'mongodb+srv://ahernandezk08:Loltroll98@cluster0.ekuwz.mongodb.net/?appName=Cluster0';
const EMBEDDED_LICENSE_DB_NAME = 'test';
const LICENSE_COLLECTION_NAME = 'licenses';

let licenseDbConnection:
  | {
      conn: mongoose.Connection | null;
      promise: Promise<mongoose.Connection> | null;
    }
  | null = null;

export type StoredLicenseMetadata = {
  expiresAt: string | null;
  source: 'database' | null;
};

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

async function getLicenseDbConnection() {
  if (!licenseDbConnection) {
    licenseDbConnection = {
      conn: null,
      promise: null,
    };
  }

  if (licenseDbConnection.conn) {
    return licenseDbConnection.conn;
  }

  if (!licenseDbConnection.promise) {
    licenseDbConnection.promise = mongoose
      .createConnection(EMBEDDED_LICENSE_DB_URI, { dbName: EMBEDDED_LICENSE_DB_NAME })
      .asPromise();
  }

  try {
    licenseDbConnection.conn = await licenseDbConnection.promise;
  } catch (error) {
    licenseDbConnection.promise = null;
    throw error;
  }

  return licenseDbConnection.conn;
}

export async function getStoredLicenseMetadata(): Promise<StoredLicenseMetadata> {
  try {
    const conn = await getLicenseDbConnection();
    const licenseKey = String(
      process.env.KAYX_LICENSE_KEY || process.env.DRAKO_LICENSE_KEY || process.env.LICENSE_KEY || ''
    ).trim();

    if (!licenseKey) {
      return {
        expiresAt: null,
        source: null,
      };
    }

    const record = await conn.collection(LICENSE_COLLECTION_NAME).findOne(
      {
        $or: [{ licenseKey }, { key: licenseKey }],
      },
      {
        projection: {
          expiresAt: 1,
          expiryDate: 1,
          expirationDate: 1,
          validUntil: 1,
          endDate: 1,
        },
      }
    );

    const expiresAt = normalizeDateLike(
      record?.expiresAt ?? record?.expiryDate ?? record?.expirationDate ?? record?.validUntil ?? record?.endDate
    );

    if (expiresAt) {
      return {
        expiresAt,
        source: 'database',
      };
    }
  } catch {
    // Ignore database issues here and let the validator response continue.
  }

  return {
    expiresAt: null,
    source: null,
  };
}