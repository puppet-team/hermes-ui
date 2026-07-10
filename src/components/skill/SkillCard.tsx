import { useNavigate } from 'react-router-dom'
import { Pencil, Download, Trash2, Eye } from 'lucide-react'
import type { SkillSummary } from '../../types'
import { Card } from '../ui/Card'
import { Badge, StatusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'

interface SkillCardProps {
  skill: SkillSummary
  onDelete: (skill: SkillSummary) => void
  onExport: (skill: SkillSummary) => void
}

export function SkillCard({ skill, onDelete, onExport }: SkillCardProps) {
  const navigate = useNavigate()

  return (
    <Card className="group hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-2">
        <button
          onClick={() => navigate(`/skills/${skill.id}`)}
          className="text-left min-w-0 flex-1"
        >
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-hermes-600 dark:group-hover:text-hermes-400 transition-colors">
            {skill.name}
          </h3>
        </button>
        <StatusBadge status={skill.status} />
      </div>

      <button
        onClick={() => navigate(`/skills/${skill.id}`)}
        className="text-left flex-1"
      >
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2.5rem]">
          {skill.description || '暂无描述'}
        </p>
      </button>

      <div className="flex items-center gap-2 mt-3 mb-3 flex-wrap">
        <Badge tone="amber">{skill.category}</Badge>
        <Badge tone="slate">v{skill.version}</Badge>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          {skill.updatedAt}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => navigate(`/skills/${skill.id}`)}
            icon={<Eye className="w-3.5 h-3.5" />}
            aria-label="查看"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => navigate(`/skills/${skill.id}/edit`)}
            icon={<Pencil className="w-3.5 h-3.5" />}
            aria-label="编辑"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onExport(skill)}
            icon={<Download className="w-3.5 h-3.5" />}
            aria-label="导出"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:text-red-500"
            onClick={() => onDelete(skill)}
            icon={<Trash2 className="w-3.5 h-3.5" />}
            aria-label="删除"
          />
        </div>
      </div>
    </Card>
  )
}
