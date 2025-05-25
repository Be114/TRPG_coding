import { useState } from 'react'
import { useProjectStore } from '@/stores/projectStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const { createProject } = useProjectStore()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await createProject(title, description)
      setTitle('')
      setDescription('')
      onOpenChange(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setTitle('')
    setDescription('')
    setError('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新しいプロジェクト</DialogTitle>
          <DialogDescription>
            新しいTRPGプロジェクトを作成しましょう。シナリオとマップを管理できます。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">プロジェクト名</Label>
              <Input
                id="title"
                placeholder="魔法学園の謎"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">説明（オプション）</Label>
              <Input
                id="description"
                placeholder="魔法学園を舞台にしたミステリーシナリオ"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              キャンセル
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? '作成中...' : '作成'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}