import type { Icon } from '@phosphor-icons/react'

interface Metric {
  label: string
  value: string | number
  icon?: Icon
}

interface Props {
  metrics: Metric[]
}

function MetricCards({ metrics }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
      {metrics.map((m) => (
        <div key={m.label} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 md:p-6 flex items-center gap-3 md:gap-4">
          {m.icon && (
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
              <m.icon size={20} weight="duotone" className="text-indigo-500 dark:text-indigo-400" />
            </div>
          )}
          <div>
            <h3 className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">{m.label}</h3>
            <p className="text-2xl md:text-3xl font-bold mt-1 dark:text-white">{m.value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default MetricCards
