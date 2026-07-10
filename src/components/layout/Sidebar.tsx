import { NavLink } from 'react-router-dom'
import {
  Sparkles,
  Layers,
  Archive,
  Settings,
  X,
  Clock,
  Cpu,
  Bell,
  Network,
} from 'lucide-react'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

interface NavItem {
  to: string
  label: string
  icon: typeof Layers
  end?: boolean
}
interface NavGroup {
  title: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    title: '技能',
    items: [
      { to: '/', label: '技能列表', icon: Layers, end: true },
      { to: '/backups', label: '备份中心', icon: Archive },
    ],
  },
  {
    title: '运维',
    items: [
      { to: '/jobs', label: '定时任务', icon: Clock },
      { to: '/models', label: '模型管理', icon: Cpu },
      { to: '/channels', label: '通知渠道', icon: Bell },
      { to: '/gateways', label: '网关管理', icon: Network },
    ],
  },
  {
    title: '系统',
    items: [{ to: '/settings', label: '设置', icon: Settings }],
  },
]

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* 移动端遮罩 */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed lg:sticky top-0 z-40 h-screen w-60 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-hermes-400 to-hermes-600 flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-none">
                Hermes
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-none mt-0.5">
                技能管理
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="关闭侧边栏"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 导航分组 */}
        <nav className="flex-1 p-3 overflow-y-auto scroll-thin">
          {navGroups.map((group) => (
            <div key={group.title} className="mb-4">
              <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-hermes-50 text-hermes-700 dark:bg-hermes-900/30 dark:text-hermes-300'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* 底部 */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="rounded-lg bg-gradient-to-br from-hermes-50 to-hermes-100 dark:from-hermes-900/30 dark:to-hermes-800/20 p-3">
            <p className="text-xs font-semibold text-hermes-700 dark:text-hermes-300">
              信使之神
            </p>
            <p className="text-[11px] text-hermes-600/80 dark:text-hermes-400/80 mt-1">
              管理你的 AI Agent 技能库
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
