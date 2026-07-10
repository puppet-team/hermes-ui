import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Eye, Code2, Sparkles } from 'lucide-react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { githubDark, githubLight } from '@uiw/codemirror-theme-github'
import { skillsApi } from '../api/skills'
import { newSkillTemplate, parseFrontmatter } from '../lib/frontmatter'
import { renderMarkdown } from '../lib/markdown'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../components/ui/Toast'

export function SkillEdit() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()
  const { theme } = useTheme()
  const toast = useToast()

  const [content, setContent] = useState('')
  const [original, setOriginal] = useState('')
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(true)

  useEffect(() => {
    if (isNew) {
      const tpl = newSkillTemplate()
      setContent(tpl)
      setOriginal(tpl)
    } else {
      skillsApi
        .get(id!)
        .then((skill) => {
          setContent(skill.content)
          setOriginal(skill.content)
        })
        .catch((e) => {
          toast.error(e instanceof Error ? e.message : '加载失败')
        })
        .finally(() => setLoading(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const dirty = content !== original

  const { meta, body } = useMemo(() => parseFrontmatter(content), [content])
  const html = useMemo(() => renderMarkdown(body), [body])

  const handleSave = async () => {
    if (!meta.name && isNew) {
      toast.error('请在 frontmatter 中填写 name 字段')
      return
    }
    setSaving(true)
    try {
      if (isNew) {
        const result = await skillsApi.create(content)
        toast.success('技能已创建')
        navigate(`/skills/${result.id}`, { replace: true })
      } else {
        await skillsApi.save(id!, content)
        setOriginal(content)
        toast.success('已保存')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 离开未保存提示
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-slate-100 dark:bg-slate-900 rounded-lg animate-pulse w-48" />
        <div className="h-[60vh] bg-slate-100 dark:bg-slate-900 rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 页头 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(id ? `/skills/${id}` : '/')}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            返回
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">
              {isNew ? '新建技能' : `编辑:${meta.name || id}`}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge tone={dirty ? 'amber' : 'green'}>
                {dirty ? '未保存' : '已保存'}
              </Badge>
              {meta.version && <Badge tone="slate">v{meta.version}</Badge>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview((v) => !v)}
            icon={showPreview ? <Code2 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            className="hidden sm:inline-flex"
          >
            {showPreview ? '仅编辑' : '分屏预览'}
          </Button>
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={!dirty}
            icon={<Save className="w-4 h-4" />}
          >
            保存
          </Button>
        </div>
      </div>

      {/* 元数据预览条 */}
      <div className="flex items-center gap-3 flex-wrap text-xs bg-hermes-50 dark:bg-hermes-900/20 border border-hermes-200 dark:border-hermes-800 rounded-lg p-3">
        <span className="flex items-center gap-1 text-hermes-700 dark:text-hermes-300 font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          元数据
        </span>
        <span className="text-slate-600 dark:text-slate-300">
          名称:<b>{meta.name || '-'}</b>
        </span>
        <span className="text-slate-600 dark:text-slate-300">
          版本:<b className="font-mono">{meta.version}</b>
        </span>
        <span className="text-slate-600 dark:text-slate-300">
          分类:<b>{meta.category}</b>
        </span>
        <span className="text-slate-600 dark:text-slate-300">
          状态:<b>{meta.status}</b>
        </span>
        <span className="text-slate-500 dark:text-slate-400 truncate">
          {meta.description}
        </span>
      </div>

      {/* 编辑器 + 预览 */}
      <div
        className={`grid gap-4 ${showPreview ? 'lg:grid-cols-2' : 'grid-cols-1'}`}
      >
        {/* 编辑器 */}
        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 h-[calc(100vh-19rem)] min-h-[400px]">
          <CodeMirror
            value={content}
            height="100%"
            theme={theme === 'dark' ? githubDark : githubLight}
            extensions={[markdown()]}
            onChange={(val) => setContent(val)}
            className="h-full text-sm"
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              highlightActiveLine: true,
            }}
          />
        </div>

        {/* 预览 */}
        {showPreview && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 overflow-y-auto scroll-thin h-[calc(100vh-19rem)] min-h-[400px]">
            <div
              className="prose-skill max-w-none"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
