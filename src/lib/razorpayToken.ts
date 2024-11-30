// utils/razorpayToken.ts
import { prisma } from '@/lib/prisma';
import { RAZORPAY_CONFIG } from '@/config/razorpay';

export async function refreshRazorpayToken(organisationId: number) {
  const organisation = await prisma.organisation.findUnique({
    where: { id: organisationId },
  });

  if (!organisation?.razorpayRefreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(RAZORPAY_CONFIG.token_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: organisation.razorpayRefreshToken,
      client_id: RAZORPAY_CONFIG.client_id,
      client_secret: RAZORPAY_CONFIG.client_secret,
    }),
  });

  const tokenData = await response.json();

  await prisma.organisation.update({
    where: { id: organisationId },
    data: {
      razorpayAccessToken: tokenData.access_token,
      razorpayRefreshToken: tokenData.refresh_token,
      razorpayTokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
    },
  });

  return tokenData.access_token;
}