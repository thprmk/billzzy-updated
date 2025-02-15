'use client';

import React from 'react';
import useSWR from 'swr';
import { AnimatePresence, motion } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface MandateNotification {
  id: number;
  type: string;
  message: string;
  createdAt: string;
}

export function Notifications() {
  const fetcher = (url: string) =>
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .catch((error) => {
        throw error;
      });

  const { data, mutate } = useSWR<{ notifications: MandateNotification[] }>(
    '/api/notifications?status=unread',
    fetcher,
    {
      refreshInterval: 30000,
    }
  );

  if (!data || data.notifications.length === 0) return null;

  const markAsRead = async (notificationId: number) => {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId }),
    });
    mutate(); // Refresh the notifications
  };

  return (
    <div className="fixed top-4 right-4 z-50 w-80 max-w-full">
      <AnimatePresence>
        {data.notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.4 }}
            className="mb-3 rounded-md bg-white p-4 shadow-lg border border-blue-100"
          >
            <div className="flex items-start justify-between">
              <div className="pr-2">
                <p className="font-semibold text-gray-800 text-sm sm:text-base">
                  {notification.message}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
              </div>

              <button
                onClick={() => markAsRead(notification.id)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                aria-label="Mark as read"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
