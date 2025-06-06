import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  runtime: 'edge',
};

export default async function handler(
  request: Request,
  response: Response
) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { md5 } = await request.json();
    
    const bakongResponse = await fetch(
      'https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BAKONG_API_TOKEN}`,
        },
        body: JSON.stringify({ md5 }),
      }
    );

    const data = await bakongResponse.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Bakong API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to verify payment' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
