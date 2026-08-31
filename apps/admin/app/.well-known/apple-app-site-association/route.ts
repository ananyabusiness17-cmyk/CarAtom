import { NextResponse } from 'next/server';

/**
 * Apple associated domains. Replace TEAMID after Apple Developer team is known.
 * Host this at https://app.caratom.in/.well-known/apple-app-site-association
 */
export function GET() {
  const body = {
    applinks: {
      apps: [],
      details: [
        {
          appID: 'TEAMID.in.caratom.customer',
          paths: ['/l/*'],
        },
      ],
    },
  };
  return NextResponse.json(body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
