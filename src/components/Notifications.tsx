'use client';

import React, { useEffect } from 'react';
import useSWR from 'swr';
import Swal from 'sweetalert2';

interface MandateNotification {
  id: number;
  type: string;
  message: string;
  createdAt: string;
}

// A simple fetcher function for SWR
const fetcher = (url: string) =>
  fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    })
    .catch((error) => {
      throw error;
    });

export function Notifications() {
  // Fetch unread notifications
  const { data, mutate } = useSWR<{ notifications: MandateNotification[] }>(
    '/api/notifications?status=unread',
    fetcher,
    {
      refreshInterval: 30000, // poll every 30s
    }
  );

  useEffect(() => {
    if (!data || !data.notifications || data.notifications.length === 0) {
      return;
    }

    // For this example, let's just show the first unread notification
    const firstNotification = data.notifications[0];

    Swal.fire({
      icon: 'info',
      title: 'New Notification',
      html: `
        <div class="text-left">
          <p>${firstNotification.message}</p>
          <p class="mt-2 text-sm text-gray-500">Received: 
            ${new Date(firstNotification.createdAt).toLocaleString()}
          </p>
        </div>
      `,
      confirmButtonText: 'OK', 
      // Single button
      allowOutsideClick: false,
      allowEscapeKey: false
    }).then(async () => {
      // When user clicks OK, delete this notification from the server
      try {
        await fetch('/api/notifications', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationId: firstNotification.id }),
        });
        // Revalidate our unread notifications list
        mutate();
      } catch (err) {
        console.error('Failed to delete notification:', err);
      }
    });
  }, [data, mutate]);

  return null; // No visible UI element; everything handled in the effect
}
