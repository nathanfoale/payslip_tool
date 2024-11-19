import React from 'react'

interface ValueBoxProps {
  value: string
  subtitle: string
  icon: React.ElementType
  color: string
}

export function ValueBox({ value, subtitle, icon: Icon, color }: ValueBoxProps) {
  return (
    <div className={`p-4 rounded-lg shadow-md bg-${color}-100`}>
      <div className="flex items-center">
        <Icon className={`text-${color}-500 w-6 h-6 mr-3`} />
        <div>
          <p className="text-sm font-semibold">{subtitle}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </div>
    </div>
  )
}
