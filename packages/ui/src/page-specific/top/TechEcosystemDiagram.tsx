'use client'

import type { ColorMode, Edge, Node } from '@xyflow/react'
import { useEffect, useMemo, useState } from 'react'
import { Controls, Handle, Position, ReactFlow, useEdgesState, useNodesState } from '@xyflow/react'
import { useTheme } from 'next-themes'

import '@xyflow/react/dist/style.css'

// 8方向ハンドル付きカスタムノード
const RadialNode = ({ data }: { data: { label: string } }) => {
  return (
    <div className="relative">
      {/* 8方向のハンドル */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        style={{ left: '50%' }}
        className="!border-0 !bg-transparent"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ left: '50%' }}
        className="!border-0 !bg-transparent"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={{ top: '50%' }}
        className="!border-0 !bg-transparent"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ top: '50%' }}
        className="!border-0 !bg-transparent"
      />

      {/* 斜め方向のハンドル */}
      <Handle
        type="source"
        position={Position.Top}
        id="top-left"
        style={{ left: '25%', top: '0px' }}
        className="!border-0 !bg-transparent"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-right"
        style={{ left: '75%', top: '0px' }}
        className="!border-0 !bg-transparent"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-left"
        style={{ left: '25%', bottom: '0px' }}
        className="!border-0 !bg-transparent"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-right"
        style={{ left: '75%', bottom: '0px' }}
        className="!border-0 !bg-transparent"
      />

      {/* ターゲットハンドル（同じ位置） */}
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        style={{ left: '50%' }}
        className="!border-0 !bg-transparent"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="target-bottom"
        style={{ left: '50%' }}
        className="!border-0 !bg-transparent"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        style={{ top: '50%' }}
        className="!border-0 !bg-transparent"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="target-right"
        style={{ top: '50%' }}
        className="!border-0 !bg-transparent"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="target-top-left"
        style={{ left: '25%', top: '0px' }}
        className="!border-0 !bg-transparent"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="target-top-right"
        style={{ left: '75%', top: '0px' }}
        className="!border-0 !bg-transparent"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="target-bottom-left"
        style={{ left: '25%', bottom: '0px' }}
        className="!border-0 !bg-transparent"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="target-bottom-right"
        style={{ left: '75%', bottom: '0px' }}
        className="!border-0 !bg-transparent"
      />

      <div className="min-w-0 px-3 py-2 text-center">
        {data.label.split('\n').map((line, lineIndex) => (
          <div key={`${data.label}-line-${lineIndex}`} className="break-words text-center">
            {line}
          </div>
        ))}
      </div>
    </div>
  )
}

const nodeTypes = {
  radial: RadialNode,
}

export function TechEcosystemDiagram() {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  // SSR時は'light'で統一、クライアント側でhydration後に実際のテーマを適用
  const colorMode: ColorMode = mounted && resolvedTheme === 'dark' ? 'dark' : 'light'

  const initialNodes: Node[] = useMemo(() => {
    // 中心座標とレイアウト設定
    const centerX = 600
    const centerY = 600
    const categoryRadius = 300 // カテゴリヘッダーまでの距離
    const itemRadius = 520 // 技術要素までの距離（間隔拡大）

    // 放射状配置用の角度計算関数
    const getRadialPosition = (angle: number, radius: number) => ({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    })

    // 4つのカテゴリの基準角度（上から時計回り）
    const qualityAngle = -Math.PI / 2 // 上（-90度）
    const efficiencyAngle = Math.PI // 左（180度）
    const securityAngle = 0 // 右（0度）
    const operationsAngle = Math.PI / 2 // 下（90度）

    return [
      // 中心：成果物
      {
        id: 'center',
        type: 'radial',
        position: { x: centerX - 100, y: centerY - 40 },
        data: {
          label: 'ポートフォリオサイト',
        },
        className: 'center-node',
        style: {
          borderRadius: '12px',
          padding: '16px',
          fontSize: '14px',
          fontWeight: 'bold',
          textAlign: 'center',
          width: 200,
          height: 80,
        },
      },

      // 品質確保カテゴリ（上方向）
      {
        id: 'quality-header',
        type: 'radial',
        position: (() => {
          const pos = getRadialPosition(qualityAngle, categoryRadius)
          return { x: pos.x - 100, y: pos.y - 20 }
        })(),
        data: { label: '品質確保のために' },
        className: 'quality-header',
        style: {
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '14px',
          fontWeight: 'bold',
          width: 200,
          textAlign: 'center',
        },
      },
      // 品質確保の技術要素（上方向に放射状・90度セクター内配置）
      {
        id: 'quality-1',
        type: 'radial',
        position: (() => {
          const pos = getRadialPosition(qualityAngle - 0.6, itemRadius)
          return { x: pos.x - 90, y: pos.y - 30 }
        })(),
        data: { label: '5層テスト設計\n(Unit・Database・External\n・UI・E2E)' },
        className: 'quality-item',
        style: {
          borderRadius: '8px',
          padding: '12px',
          fontSize: '11px',
          textAlign: 'center',
          width: 'auto',
          minWidth: '180px',
        },
      },
      {
        id: 'quality-2',
        type: 'radial',
        position: (() => {
          const pos = getRadialPosition(qualityAngle - 0.2, itemRadius)
          return { x: pos.x - 75, y: pos.y - 30 }
        })(),
        data: { label: 'TypeScript型安全性\nZod入力検証' },
        className: 'quality-item',
        style: {
          borderRadius: '8px',
          padding: '12px',
          fontSize: '11px',
          width: 'auto',
          minWidth: '160px',
          textAlign: 'center',
        },
      },
      {
        id: 'quality-3',
        type: 'radial',
        position: (() => {
          const pos = getRadialPosition(qualityAngle + 0.2, itemRadius)
          return { x: pos.x - 75, y: pos.y - 30 }
        })(),
        data: { label: 'ESLint・Prettier\ntextlint品質チェック' },
        className: 'quality-item',
        style: {
          borderRadius: '8px',
          padding: '12px',
          fontSize: '11px',
          width: 'auto',
          minWidth: '160px',
          textAlign: 'center',
        },
      },
      {
        id: 'quality-4',
        type: 'radial',
        position: (() => {
          const pos = getRadialPosition(qualityAngle + 0.6, itemRadius)
          return { x: pos.x - 75, y: pos.y - 30 }
        })(),
        data: { label: 'カバレッジ監視\n継続的品質追跡' },
        className: 'quality-item',
        style: {
          borderRadius: '8px',
          padding: '12px',
          fontSize: '11px',
          width: 'auto',
          minWidth: '160px',
          textAlign: 'center',
        },
      },

      // 開発効率カテゴリ（左方向）
      {
        id: 'efficiency-header',
        type: 'radial',
        position: (() => {
          const pos = getRadialPosition(efficiencyAngle, categoryRadius)
          return { x: pos.x - 100, y: pos.y - 20 }
        })(),
        data: { label: '開発効率のために' },
        className: 'efficiency-header',
        style: {
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '14px',
          fontWeight: 'bold',
          width: 200,
          textAlign: 'center',
        },
      },
      // 開発効率の技術要素（左方向に放射状）
      {
        id: 'efficiency-1',
        type: 'radial',
        position: (() => {
          const pos = getRadialPosition(efficiencyAngle - 0.4, itemRadius)
          return { x: pos.x - 75, y: pos.y - 30 }
        })(),
        data: { label: 'Turborepo + pnpm\nモノレポ管理' },
        className: 'efficiency-item',
        style: {
          borderRadius: '8px',
          padding: '12px',
          fontSize: '12px',
          width: 'auto',
          minWidth: '160px',
          textAlign: 'center',
        },
      },
      {
        id: 'efficiency-2',
        type: 'radial',
        position: (() => {
          const pos = getRadialPosition(efficiencyAngle, itemRadius)
          return { x: pos.x - 75, y: pos.y - 30 }
        })(),
        data: { label: '環境分離\n(開発・テスト・本番)' },
        className: 'efficiency-item',
        style: {
          borderRadius: '8px',
          padding: '12px',
          fontSize: '12px',
          width: 'auto',
          minWidth: '160px',
          textAlign: 'center',
        },
      },
      {
        id: 'efficiency-3',
        type: 'radial',
        position: (() => {
          const pos = getRadialPosition(efficiencyAngle + 0.4, itemRadius)
          return { x: pos.x - 75, y: pos.y - 30 }
        })(),
        data: { label: 'Hot reload・高速ビルド\n・キャッシュ最適化' },
        className: 'efficiency-item',
        style: {
          borderRadius: '8px',
          padding: '12px',
          fontSize: '12px',
          width: 'auto',
          minWidth: '160px',
          textAlign: 'center',
        },
      },

      // セキュリティカテゴリ（右方向）
      {
        id: 'security-header',
        type: 'radial',
        position: (() => {
          const pos = getRadialPosition(securityAngle, categoryRadius)
          return { x: pos.x - 100, y: pos.y - 20 }
        })(),
        data: { label: 'セキュリティのために' },
        className: 'security-header',
        style: {
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '14px',
          fontWeight: 'bold',
          width: 200,
          textAlign: 'center',
        },
      },
      // セキュリティの技術要素（右方向に放射状）
      {
        id: 'security-1',
        type: 'radial',
        position: (() => {
          const pos = getRadialPosition(securityAngle - 0.4, itemRadius)
          return { x: pos.x - 90, y: pos.y - 30 }
        })(),
        data: { label: '4層防御システム\n(Rate Limiting・Bot検知)' },
        className: 'security-item',
        style: {
          borderRadius: '8px',
          padding: '12px',
          fontSize: '12px',
          textAlign: 'center',
          width: 'auto',
          minWidth: '180px',
        },
      },
      {
        id: 'security-2',
        type: 'radial',
        position: (() => {
          const pos = getRadialPosition(securityAngle, itemRadius)
          return { x: pos.x - 90, y: pos.y - 30 }
        })(),
        data: { label: 'XSS対策・SQL Injection防止\n包括的入力検証' },
        className: 'security-item',
        style: {
          borderRadius: '8px',
          padding: '12px',
          fontSize: '12px',
          textAlign: 'center',
          width: 'auto',
          minWidth: '180px',
        },
      },
      {
        id: 'security-3',
        type: 'radial',
        position: (() => {
          const pos = getRadialPosition(securityAngle + 0.4, itemRadius)
          return { x: pos.x - 75, y: pos.y - 30 }
        })(),
        data: { label: 'Redis基盤監視\nSlack通知' },
        className: 'security-item',
        style: {
          borderRadius: '8px',
          padding: '12px',
          fontSize: '12px',
          width: 'auto',
          minWidth: '160px',
          textAlign: 'center',
        },
      },

      // 運用・保守カテゴリ（下方向）
      {
        id: 'operations-header',
        type: 'radial',
        position: (() => {
          const pos = getRadialPosition(operationsAngle, categoryRadius)
          return { x: pos.x - 100, y: pos.y - 20 }
        })(),
        data: { label: '運用・保守のために' },
        className: 'operations-header',
        style: {
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '14px',
          fontWeight: 'bold',
          width: 200,
          textAlign: 'center',
        },
      },
      // 運用・保守の技術要素（下方向に放射状）
      {
        id: 'operations-1',
        type: 'radial',
        position: (() => {
          const pos = getRadialPosition(operationsAngle - 0.6, itemRadius)
          return { x: pos.x - 75, y: pos.y - 30 }
        })(),
        data: { label: 'CI/CD自動化\n・GitHub Actions最適化' },
        className: 'operations-item',
        style: {
          borderRadius: '8px',
          padding: '12px',
          fontSize: '12px',
          width: 'auto',
          minWidth: '160px',
          textAlign: 'center',
        },
      },
      {
        id: 'operations-2',
        type: 'radial',
        position: (() => {
          const pos = getRadialPosition(operationsAngle - 0.2, itemRadius)
          return { x: pos.x - 75, y: pos.y - 30 }
        })(),
        data: { label: 'バックアップ自動化\n障害復旧' },
        className: 'operations-item',
        style: {
          borderRadius: '8px',
          padding: '12px',
          fontSize: '12px',
          width: 'auto',
          minWidth: '160px',
          textAlign: 'center',
        },
      },
      {
        id: 'operations-3',
        type: 'radial',
        position: (() => {
          const pos = getRadialPosition(operationsAngle + 0.2, itemRadius)
          return { x: pos.x - 75, y: pos.y - 30 }
        })(),
        data: { label: 'パフォーマンス監視\n・メトリクス分析' },
        className: 'operations-item',
        style: {
          borderRadius: '8px',
          padding: '12px',
          fontSize: '12px',
          width: 'auto',
          minWidth: '160px',
          textAlign: 'center',
        },
      },
      {
        id: 'operations-4',
        type: 'radial',
        position: (() => {
          const pos = getRadialPosition(operationsAngle + 0.6, itemRadius)
          return { x: pos.x - 80, y: pos.y - 30 }
        })(),
        data: { label: 'Forward-only Recovery\n・Graceful Degradation' },
        className: 'operations-item',
        style: {
          borderRadius: '8px',
          padding: '12px',
          fontSize: '12px',
          textAlign: 'center',
          width: 'auto',
          minWidth: '160px',
        },
      },
    ]
  }, [])

  const initialEdges: Edge[] = useMemo(
    () => [
      // 中心から各価値軸ヘッダーへの接続（最適ハンドル指定）
      {
        id: 'center-quality',
        source: 'center',
        target: 'quality-header',
        sourceHandle: 'top',
        targetHandle: 'target-bottom',
        type: 'straight',
        animated: true,
        className: 'edge-quality',
      },
      {
        id: 'center-efficiency',
        source: 'center',
        target: 'efficiency-header',
        sourceHandle: 'left',
        targetHandle: 'target-right',
        type: 'straight',
        animated: true,
        className: 'edge-efficiency',
      },
      {
        id: 'center-security',
        source: 'center',
        target: 'security-header',
        sourceHandle: 'right',
        targetHandle: 'target-left',
        type: 'straight',
        animated: true,
        className: 'edge-security',
      },
      {
        id: 'center-operations',
        source: 'center',
        target: 'operations-header',
        sourceHandle: 'bottom',
        targetHandle: 'target-top',
        type: 'straight',
        animated: true,
        className: 'edge-operations',
      },

      // ヘッダーから各技術要素への接続（最適ハンドル指定）
      {
        id: 'quality-header-1',
        source: 'quality-header',
        target: 'quality-1',
        sourceHandle: 'top-left',
        targetHandle: 'target-bottom',
        type: 'straight',
        className: 'edge-quality',
      },
      {
        id: 'quality-header-2',
        source: 'quality-header',
        target: 'quality-2',
        sourceHandle: 'top-left',
        targetHandle: 'target-bottom',
        type: 'straight',
        className: 'edge-quality',
      },
      {
        id: 'quality-header-3',
        source: 'quality-header',
        target: 'quality-3',
        sourceHandle: 'top-right',
        targetHandle: 'target-bottom',
        type: 'straight',
        className: 'edge-quality',
      },
      {
        id: 'quality-header-4',
        source: 'quality-header',
        target: 'quality-4',
        sourceHandle: 'top-right',
        targetHandle: 'target-bottom',
        type: 'straight',
        className: 'edge-quality',
      },

      {
        id: 'efficiency-header-1',
        source: 'efficiency-header',
        target: 'efficiency-1',
        sourceHandle: 'top-left',
        targetHandle: 'target-bottom-right',
        type: 'straight',
        className: 'edge-efficiency',
      },
      {
        id: 'efficiency-header-2',
        source: 'efficiency-header',
        target: 'efficiency-2',
        sourceHandle: 'left',
        targetHandle: 'target-right',
        type: 'straight',
        className: 'edge-efficiency',
      },
      {
        id: 'efficiency-header-3',
        source: 'efficiency-header',
        target: 'efficiency-3',
        sourceHandle: 'bottom-left',
        targetHandle: 'target-top-right',
        type: 'straight',
        className: 'edge-efficiency',
      },

      {
        id: 'security-header-1',
        source: 'security-header',
        target: 'security-1',
        sourceHandle: 'top-right',
        targetHandle: 'target-bottom-left',
        type: 'straight',
        className: 'edge-security',
      },
      {
        id: 'security-header-2',
        source: 'security-header',
        target: 'security-2',
        sourceHandle: 'right',
        targetHandle: 'target-left',
        type: 'straight',
        className: 'edge-security',
      },
      {
        id: 'security-header-3',
        source: 'security-header',
        target: 'security-3',
        sourceHandle: 'bottom-right',
        targetHandle: 'target-top-left',
        type: 'straight',
        className: 'edge-security',
      },

      {
        id: 'operations-header-1',
        source: 'operations-header',
        target: 'operations-1',
        sourceHandle: 'left',
        targetHandle: 'target-right',
        type: 'straight',
        className: 'edge-operations',
      },
      {
        id: 'operations-header-2',
        source: 'operations-header',
        target: 'operations-2',
        sourceHandle: 'bottom',
        targetHandle: 'target-top',
        type: 'straight',
        className: 'edge-operations',
      },
      {
        id: 'operations-header-3',
        source: 'operations-header',
        target: 'operations-3',
        sourceHandle: 'bottom',
        targetHandle: 'target-top',
        type: 'straight',
        className: 'edge-operations',
      },
      {
        id: 'operations-header-4',
        source: 'operations-header',
        target: 'operations-4',
        sourceHandle: 'right',
        targetHandle: 'target-left',
        type: 'straight',
        className: 'edge-operations',
      },
    ],
    []
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // SSR時はスケルトンを表示
  if (!mounted) {
    return (
      <div className="h-[800px] w-full">
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="animate-pulse text-gray-500 dark:text-gray-400">
              技術エコシステム図を読み込み中...
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[1400px] w-full">
      <style>{`
        .react-flow__node.center-node {
          border: 2px solid #3b82f6 !important;
          background: #ffffff !important;
          color: #1f2937 !important;
        }
        .dark .react-flow__node.center-node {
          border-color: #60a5fa !important;
          background: #1f2937 !important;
          color: #f9fafb !important;
        }
        
        .react-flow__node.quality-header {
          background: #10b981 !important;
          color: #ffffff !important;
          border: none !important;
        }
        .dark .react-flow__node.quality-header {
          background: #065f46 !important;
        }
        
        .react-flow__node.quality-item {
          background: #f0fdf4 !important;
          color: #14532d !important;
          border: 1px solid #14532d !important;
        }
        .dark .react-flow__node.quality-item {
          background: #052e16 !important;
          color: #bbf7d0 !important;
          border-color: #bbf7d0 !important;
        }
        
        .react-flow__node.efficiency-header {
          background: #3b82f6 !important;
          color: #ffffff !important;
          border: none !important;
        }
        .dark .react-flow__node.efficiency-header {
          background: #1e40af !important;
        }
        
        .react-flow__node.efficiency-item {
          background: #eff6ff !important;
          color: #1e3a8a !important;
          border: 1px solid #1e3a8a !important;
        }
        .dark .react-flow__node.efficiency-item {
          background: #172554 !important;
          color: #bfdbfe !important;
          border-color: #bfdbfe !important;
        }
        
        .react-flow__node.security-header {
          background: #ef4444 !important;
          color: #ffffff !important;
          border: none !important;
        }
        .dark .react-flow__node.security-header {
          background: #991b1b !important;
        }
        
        .react-flow__node.security-item {
          background: #fef2f2 !important;
          color: #7f1d1d !important;
          border: 1px solid #7f1d1d !important;
        }
        .dark .react-flow__node.security-item {
          background: #450a0a !important;
          color: #fecaca !important;
          border-color: #fecaca !important;
        }
        
        .react-flow__node.operations-header {
          background: #f97316 !important;
          color: #ffffff !important;
          border: none !important;
        }
        .dark .react-flow__node.operations-header {
          background: #c2410c !important;
        }
        
        .react-flow__node.operations-item {
          background: #fff7ed !important;
          color: #9a3412 !important;
          border: 1px solid #9a3412 !important;
        }
        .dark .react-flow__node.operations-item {
          background: #431407 !important;
          color: #fed7aa !important;
          border-color: #fed7aa !important;
        }
        
        .react-flow__edge.edge-quality .react-flow__edge-path {
          stroke: #10b981;
        }
        .dark .react-flow__edge.edge-quality .react-flow__edge-path {
          stroke: #34d399;
        }
        
        .react-flow__edge.edge-efficiency .react-flow__edge-path {
          stroke: #3b82f6;
        }
        .dark .react-flow__edge.edge-efficiency .react-flow__edge-path {
          stroke: #60a5fa;
        }
        
        .react-flow__edge.edge-security .react-flow__edge-path {
          stroke: #ef4444;
        }
        .dark .react-flow__edge.edge-security .react-flow__edge-path {
          stroke: #f87171;
        }
        
        .react-flow__edge.edge-operations .react-flow__edge-path {
          stroke: #f97316;
        }
        .dark .react-flow__edge.edge-operations .react-flow__edge-path {
          stroke: #fb923c;
        }
      `}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        colorMode={colorMode}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnDoubleClick={false}
        panOnDrag={true}
        attributionPosition="bottom-left"
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        style={{ background: 'transparent' }}
      >
        <Controls />
      </ReactFlow>
    </div>
  )
}
