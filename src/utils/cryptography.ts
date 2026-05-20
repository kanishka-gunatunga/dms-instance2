/**
 * Cryptography utilities for Digital Signatures using Web Crypto API.
 */

const ALGORITHM = {
  name: "ECDSA",
  namedCurve: "P-256",
};

/**
 * Generates a new ECDSA key pair for digital signatures.
 */
export const generateKeyPair = async (): Promise<CryptoKeyPair> => {
  return await window.crypto.subtle.generateKey(
    {
      ...ALGORITHM,
      hash: { name: "SHA-256" },
    },
    true, // extractable
    ["sign", "verify"]
  );
};

/**
 * Signs the given data using the private key.
 */
export const signData = async (
  data: ArrayBuffer,
  privateKey: CryptoKey
): Promise<ArrayBuffer> => {
  return await window.crypto.subtle.sign(
    {
      ...ALGORITHM,
      hash: { name: "SHA-256" },
    },
    privateKey,
    data
  );
};

/**
 * Verifies a signature against the data and public key.
 */
export const verifySignature = async (
  data: ArrayBuffer,
  signature: ArrayBuffer,
  publicKey: CryptoKey
): Promise<boolean> => {
  return await window.crypto.subtle.verify(
    {
      ...ALGORITHM,
      hash: { name: "SHA-256" },
    },
    publicKey,
    signature,
    data
  );
};

/**
 * Exports a key to JWK format for storage.
 */
export const exportKey = async (key: CryptoKey): Promise<JsonWebKey> => {
  return await window.crypto.subtle.exportKey("jwk", key);
};

/**
 * Imports a key from JWK format.
 */
export const importKey = async (
  jwk: JsonWebKey,
  type: "public" | "private"
): Promise<CryptoKey> => {
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      ...ALGORITHM,
      hash: { name: "SHA-256" },
    },
    true,
    type === "private" ? ["sign"] : ["verify"]
  );
};

/**
 * Converts an ArrayBuffer to a Base64 string.
 */
export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

/**
 * Converts a Base64 string to an ArrayBuffer.
 */
export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};
