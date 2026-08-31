import { NextResponse } from 'next/server';

/**
 * Android App Links. Replace sha256_cert_fingerprints after the first production keystore.
 */
export function GET() {
  const body = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'in.caratom.customer',
        sha256_cert_fingerprints: ['REPLACE_WITH_PLAY_APP_SIGNING_CERT'],
      },
    },
  ];
  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}
