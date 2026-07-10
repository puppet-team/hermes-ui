import { useEffect, useState } from 'react'
import { Folder, Sun, Moon, Info, Code, Sparkles } from 'lucide-react'
import { Card, SectionTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useTheme } from '../context/ThemeContext'

export function Settings() {
  const { theme, setTheme } = useTheme()
  const [root, setRoot] = useState('')

  useEffect(() => {
    fetch('/api/root')
      .then((r) => r.json())
      .then((d) => setRoot(d.root || ''))
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          设置
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          应用偏好与技能存储信息
        </p>
      </div>

      {/* 外观 */}
      <Card>
        <SectionTitle title="外观" subtitle="主题模式" icon={<Sun className="w-4 h-4" />} />
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setTheme('light')}
            className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
              theme === 'light'
                ? 'border-hermes-400 bg-hermes-50 dark:bg-hermes-900/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <Sun className="w-5 h-5 text-hermes-500" />
            <div className="text-left">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                亮色
              </p>
              <p className="text-[11px] text-slate-400">白天模式</p>
            </div>
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
              theme === 'dark'
                ? 'border-hermes-400 bg-hermes-50 dark:bg-hermes-900/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <Moon className="w-5 h-5 text-hermes-500" />
            <div className="text-left">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                暗色
              </p>
              <p className="text-[11px] text-slate-400">夜间模式</p>
            </div>
          </button>
        </div>
      </Card>

      {/* 技能存储 */}
      <Card>
        <SectionTitle
          title="技能存储"
          subtitle="本地技能文件根目录"
          icon={<Folder className="w-4 h-4" />}
        />
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
          <p className="text-xs text-slate-400 mb-1">当前根目录</p>
          <p className="text-sm font-mono text-slate-700 dark:text-slate-200 break-all">
            {root || '加载中...'}
          </p>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          可通过环境变量 <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">HERMES_SKILLS_DIR</code> 自定义根目录,需重启服务生效。
        </p>
      </Card>

      {/* 关于 */}
      <Card>
        <SectionTitle
          title="关于"
          subtitle="Hermes 技能管理"
          icon={<Info className="w-4 h-4" />}
        />
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-hermes-400 to-hermes-600 flex items-center justify-center shadow-sm">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Hermes
            </p>
            <p className="text-xs text-slate-400">AI Agent 技能管理后台</p>
          </div>
        </div>
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-400">版本</dt>
            <dd className="text-slate-600 dark:text-slate-300 font-mono">
              v0.1.0
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">技术栈</dt>
            <dd className="text-slate-600 dark:text-slate-300">
              React + Vite + Tailwind
            </dd>
          </div>
        </dl>
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://github.com', '_blank')}
            icon={<Code className="w-4 h-4" />}
          >
            源代码
          </Button>
        </div>
      </Card>
    </div>
  )
}
