import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Sun, Moon, Plus, Search } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { Button } from '../ui/Button'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const [root, setRoot] = useState('')

  useEffect(() => {
    fetch('/api/root')
      .then((r) => r.json())
      .then((d) => setRoot(d.root || ''))
      .catch(() => {})
  }, [])

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 px-4 lg:px-6">
      <button
        onClick={onMenuClick}
        className="lg:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        aria-label="打开菜单"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* 全局搜索(视觉) */}
      <div className="relative hidden sm:block flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="搜索技能..."
          onFocus={() => navigate('/')}
          className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-hermes-400"
        />
      </div>

      <div className="flex-1 sm:hidden" />

      {/* 技能根目录 */}
      {root && (
        <span
          className="hidden md:inline-flex items-center text-xs text-slate-400 dark:text-slate-500 font-mono truncate max-w-xs"
          title={root}
        >
          {root}
        </span>
      )}

      {/* 主题切换 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggle}
        icon={theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        aria-label="切换主题"
      />

      {/* 新建技能 */}
      <Button
        size="sm"
        onClick={() => navigate('/skills/new')}
        icon={<Plus className="w-4 h-4" />}
        className="hidden sm:inline-flex"
      >
        新建技能
      </Button>

      {/* 用户头像 */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-hermes-400 to-hermes-600 flex items-center justify-center text-white text-xs font-semibold">
        H
      </div>
    </header>
  )
}
