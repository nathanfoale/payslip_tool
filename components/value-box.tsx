// components/value-box.tsx

import React from 'react';

// Export the interface to allow type checking in other components if needed
export interface ValueBoxProps {
  value: string;
  subtitle: string;
  icon: React.ElementType;
  color: 'green' | 'blue' | 'purple' | 'yellow'; // Restrict to predefined colors
}

// Define a mapping from color names to Tailwind CSS classes for icon colors
const colorClasses: Record<string, string> = {
  green: 'text-green-500',
  blue: 'text-blue-500',
  purple: 'text-purple-500',
  yellow: 'text-yellow-500',
  // Add more colors as needed
};

export function ValueBox({ value, subtitle, icon: Icon, color }: ValueBoxProps) {
  // Get the corresponding text color class or default to gray
  const textColorClass = colorClasses[color] || 'text-gray-500';

  return (
    <div className="p-4 rounded-lg shadow-md bg-gray-700"> {/* Fixed background */}
      <div className="flex items-center">
        <Icon className={`${textColorClass} w-6 h-6 mr-3`} /> {/* Dynamic icon color */}
        <div>
          <p className="text-sm font-semibold">{subtitle}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}
