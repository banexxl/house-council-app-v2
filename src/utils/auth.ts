'use client'
export const generateCodeVerifier = () => {
  const array = new Uint32Array(28);
  window.crypto.getRandomValues(array);
  return Array.from(array, dec => ('0' + dec.toString(16)).slice(-2)).join('');
};

export const generateCodeChallenge = (verifier: string) => {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
    .then(hash => {
      return Array.from(new Uint8Array(hash), byte => String.fromCharCode(byte)).join('');
    })
    .then(base64UrlEncode);
};

const base64UrlEncode = (str: string) => {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};