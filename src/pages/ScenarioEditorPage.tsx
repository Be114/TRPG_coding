import { useParams } from 'react-router-dom'

export function ScenarioEditorPage() {
  const { projectId, scenarioId } = useParams()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">シナリオエディタ</h1>
        <p className="text-muted-foreground mb-8">
          プロジェクト: {projectId}, シナリオ: {scenarioId}
        </p>
        
        <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">📝</div>
          <h2 className="text-xl font-semibold mb-2">シナリオエディタ（開発中）</h2>
          <p className="text-muted-foreground">
            TipTapベースのリッチテキストエディタを実装予定です。
          </p>
        </div>
      </div>
    </div>
  )
}