import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  if (!dateString) return 'N/A'; // Handle cases where the date might be null or undefined

  try {
    // Format the date to something like "25 Jul 2024"
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (error) {
    console.error("Failed to format date:", dateString, error);
    return "Invalid Date"; // Return an error message if the date string is invalid
  }
}