interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function Toggle({ checked, onChange, disabled, size = 'md' }: ToggleProps) {
  const w = size === 'sm' ? 'w-8 h-[18px]' : 'w-10 h-6'
  const knob = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5'
  const translate = size === 'sm' ? (checked ? 'translate-x-[14px]' : 'translate-x-0.5') : checked ? 'translate-x-[18px]' : 'translate-x-0.5'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-hermes-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed ${w} ${
        checked ? 'bg-hermes-500' : 'bg-slate-300 dark:bg-slate-700'
      }`}
    >
      <span
        className={`inline-block transform rounded-full bg-white shadow transition-transform ${knob} ${translate}`}
      />
    </button>
  )
}
