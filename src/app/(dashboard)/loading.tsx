// src/app/(dashboard)/loading.tsx

import { LoadingScreen } from '@/components/ui/LoadingScreen';

export default function Loading() {
  // This is a special Next.js file.
  // It will automatically be shown by the framework while the server
  // is fetching the data for any page inside the (dashboard) folder.
  return <LoadingScreen />;
}