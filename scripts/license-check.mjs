import axios from 'axios';
import fs from 'fs';
import os from 'os';
import path from 'path';
import process from 'process';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { EXPECTED_LICENSE_RUNTIME_SEAL, LICENSE_RUNTIME_SEAL, REQUIRED_LICENSE_FILES } from '../lib/license-seal.js';

dotenv.config();

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function getMissingRequiredLicenseFiles() {
  return REQUIRED_LICENSE_FILES.filter((relativePath) => !fs.existsSync(path.join(ROOT_DIR, relativePath)));
}

function prettifyLicenseStatus(status) {
  const value = String(status || '').trim().toUpperCase();

  switch (value) {
    case 'INVALID_LICENSEKEY':
      return 'Invalid license key, open a ticket in https://discord.gg/wrld999 to resolve';
    case 'INVALID_PRODUCT':
      return 'Product mismatch, open a ticket in https://discord.gg/wrld999 to resolve';
    case 'INVALID_API_KEY':
      return 'Invalid API key, open a ticket in https://discord.gg/wrld999 to resolve';
    case 'IP_CAP_REACHED':
      return 'IP limit reached, open a ticket in https://discord.gg/wrld999 to resolve';
    case 'HWID_CAP_REACHED':
      return 'HWID limit reached, open a ticket in https://discord.gg/wrld999 to resolve';
    case 'EXPIRED_LICENSE':
      return 'License expired, open a ticket in https://discord.gg/wrld999 to resolve';
    case 'BLACKLISTED_LICENSE':
      return 'License blacklisted, open a ticket in https://discord.gg/wrld999 to resolve';
    case 'UNAUTHORIZED':
      return 'Unauthorized request, check your API key permissions and product configuration';
    default:
      return value
        ? value
            .toLowerCase()
            .split('_')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ')
        : 'License validation failed';
  }
}

export async function runLicenseStartupCheck() {
  const url = String(process.env.KAYX_LICENSE_API_URL || process.env.DRAKO_LICENSE_API_URL || '').trim();
  const licensekey = String(process.env.KAYX_LICENSE_KEY || process.env.DRAKO_LICENSE_KEY || '').trim();
  const product = String(process.env.KAYX_PRODUCT_ID || process.env.DRAKO_PRODUCT_ID || '').trim();
  const apiKey = String(process.env.KAYX_API_TOKEN || process.env.DRAKO_API_TOKEN || '').trim();
  const hwid = String(process.env.KAYX_HWID || process.env.DRAKO_HWID || os.hostname() || 'unknown-host').trim();

  if (LICENSE_RUNTIME_SEAL !== EXPECTED_LICENSE_RUNTIME_SEAL) {
    return {
      ok: false,
      state: 'error',
      title: 'License integrity check failed',
      message: 'The license integrity seal is invalid.',
      product,
      hwid,
      url,
    };
  }

  const missingFiles = getMissingRequiredLicenseFiles();
  if (missingFiles.length > 0) {
    return {
      ok: false,
      state: 'error',
      title: 'License integrity check failed',
      message: `Required license files are missing: ${missingFiles.join(', ')}`,
      detail: missingFiles.join(', '),
      product,
      hwid,
      url,
    };
  }

  if (!url || !licensekey || !product || !apiKey) {
    return {
      ok: false,
      state: 'error',
      title: 'License Authentication failed',
      message: 'Missing KayX license configuration in .env',
      product,
      hwid,
      url,
    };
  }

  try {
    const res = await axios.post(
      url,
      {
        licensekey,
        product,
        hwid,
      },
      {
        headers: {
          Authorization: apiKey,
        },
        timeout: 8000,
      }
    );

    if (!res.data?.status_code || !res.data?.status_id) {
      return {
        ok: false,
        state: 'invalid',
        title: 'Your license key is invalid!',
        message: 'Create a ticket in our discord server to get one.',
        detail: prettifyLicenseStatus(res.data?.status_msg),
        product,
        hwid,
        url,
        response: res.data,
      };
    }

    if (String(res.data?.status_overview || '').toLowerCase() !== 'success') {
      return {
        ok: false,
        state: 'invalid',
        title: 'Your license key is invalid!',
        message: 'Create a ticket in our discord server to get one.',
        detail: prettifyLicenseStatus(res.data?.status_msg),
        product,
        hwid,
        url,
        response: res.data,
      };
    }

    return {
      ok: true,
      state: 'valid',
      title: 'Your license key is valid!',
      message: 'License authenticated successfully.',
      product,
      hwid,
      url,
      discordId: String(res.data?.discord_id || 'unknown'),
      response: res.data,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data;
      const responseMessage =
        typeof data?.status_msg === 'string'
          ? prettifyLicenseStatus(data.status_msg)
          : typeof data?.message === 'string'
            ? data.message
            : error.response?.status === 401
              ? 'Invalid API key or unauthorized request.'
              : error.message;

      return {
        ok: false,
        state: error.response?.status === 401 || error.response?.status === 403 ? 'invalid' : 'error',
        title: error.response?.status === 401 || error.response?.status === 403 ? 'Your license key is invalid!' : 'License Authentication failed',
        message:
          error.response?.status === 401 || error.response?.status === 403
            ? 'Create a ticket in our discord server to get one.'
            : responseMessage,
        detail: responseMessage,
        product,
        hwid,
        url,
        statusCode: error.response?.status,
        response: typeof data === 'object' && data ? data : undefined,
      };
    }

    return {
      ok: false,
      state: 'error',
      title: 'License Authentication failed',
      message: error instanceof Error ? error.message : 'Unknown license error',
      product,
      hwid,
      url,
    };
  }
}
