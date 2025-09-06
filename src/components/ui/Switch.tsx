// src/components/ui/Switch.tsx

import React from 'react';

// Define the component's props
interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void; // <-- RENAMED from onChange
  label?: string;
  id?: string; // Add id to be passed to the input
}

// Update the function signature to accept the new prop name
export function Switch({ checked, onCheckedChange, label, id }: SwitchProps) {
  return (
    <label className="flex items-center cursor-pointer">
      <div className="relative">
        <input
          id={id} // Pass the id to the actual input for accessibility
          type="checkbox"
          className="sr-only"
          checked={checked}
          // Call the correct prop when the input changes
          onChange={(e) => onCheckedChange(e.target.checked)} // <-- USE the new prop name here
        />
        <div className={`block w-14 h-8 rounded-full ${checked ? 'bg-indigo-600' : 'bg-gray-300'}`} />
        <div
          className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-200 ease-in-out ${
            checked ? 'transform translate-x-6' : ''
          }`}
        />
      </div>
      {label && <span className="ml-3 text-sm">{label}</span>}
    </label>
  );
}