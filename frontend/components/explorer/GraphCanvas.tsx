"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, { type ForceGraphMethods, type NodeObject } from "react-force-graph-2d";

import { dimmedNodeIds, isEdgeDimmed, neighborsOf } from "@/lib/explorer/model";
import {
  EXPLORER_TONES,
  type ExplorerCategory,
  type ExplorerEdge,
  type ExplorerNode,
} from "@/lib/explorer/types";

/**
 * View 2 (CAN-86): the force-directed graph. Canvas-based
 * (react-force-graph-2d — the issue's library decision), whole node set with
 * the center entity emphasised (sector scope default), node size by weight,
 * edges coloured by category, filter dims rather than removes, zoom/pan with
 * reset, hover preview card, freeze-after-settle, and prefers-reduced-motion
 * computes the layout without animating. The canvas is aria-hidden:
 * the clusters view is the accessible equivalent (relationship-explorer.md).
 */

interface GraphNodeObject extends NodeObject {
  id: string;
  label: string;
  categoryId: string;
  weight?: number;
  summary?: string;
  statusLabel?: string;
}

const NODE_ALPHA_BACKGROUND = 0.75;
const DIM_ALPHA = 0.15;

export function GraphCanvas({
  nodes,
  edges,
  categories,
  centerId,
  dimmedCategoryIds,
  selectedId,
  onSelect,
}: {
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  categories: ExplorerCategory[];
  centerId: string;
  dimmedCategoryIds: ReadonlySet<string>;
  selectedId: string | null;
  onSelect: (node: ExplorerNode) => void;
}) {
  const graphRef = useRef<ForceGraphMethods<NodeObject, object> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(800);
  const [hovered, setHovered] = useState<GraphNodeObject | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [settled, setSettled] = useState(false);
  const reducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const height = 520;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const toneHexByCategory = useMemo(
    () => new Map(categories.map((c) => [c.id, EXPLORER_TONES[c.tone].hex])),
    [categories],
  );
  const firstDegreeIds = useMemo(() => neighborsOf(edges, centerId), [edges, centerId]);
  const dimmedNodes = useMemo(() => dimmedNodeIds(nodes, dimmedCategoryIds), [nodes, dimmedCategoryIds]);

  // force-graph mutates node objects (x/y/vx/vy); hand it copies. Typed as
  // plain NodeObject so the component's generics match the ref type; the
  // extra fields ride along and callbacks narrow via GraphNodeObject.
  const graphData = useMemo<{ nodes: NodeObject[]; links: object[] }>(
    () => ({
      nodes: nodes.map((n) => ({
        id: n.id,
        label: n.label,
        categoryId: n.categoryId,
        weight: n.weight,
        summary: n.summary,
        statusLabel: n.statusChip?.label,
      })),
      links: edges.map((e) => ({ source: e.source, target: e.target, categoryId: e.categoryId, weight: e.weight })),
    }),
    [nodes, edges],
  );

  const radiusOf = (node: GraphNodeObject) => 3 + 9 * Math.sqrt(node.weight ?? 0.3);

  return (
    <div ref={containerRef} className="relative">
      <div aria-hidden className="overflow-hidden rounded-xl border border-ink-800/60 bg-ink-950/60">
        <ForceGraph2D
          ref={graphRef}
          width={width}
          height={height}
          graphData={graphData}
          backgroundColor="rgba(0,0,0,0)"
          warmupTicks={reducedMotion ? 200 : 0}
          cooldownTicks={reducedMotion || settled ? 0 : undefined}
          onEngineStop={() => setSettled(true)}
          enableNodeDrag={false}
          nodeLabel={() => ""}
          onNodeHover={(node) => setHovered((node as GraphNodeObject) ?? null)}
          onNodeClick={(node) => {
            const full = nodeById.get(String((node as GraphNodeObject).id));
            if (full) onSelect(full);
          }}
          onBackgroundClick={() => setHovered(null)}
          linkColor={(link) => {
            const l = link as { categoryId?: string; source: unknown; target: unknown };
            const hex = toneHexByCategory.get(l.categoryId ?? "") ?? "#7C8499";
            const edge = {
              source: String((l.source as GraphNodeObject)?.id ?? l.source),
              target: String((l.target as GraphNodeObject)?.id ?? l.target),
              categoryId: l.categoryId ?? "",
            };
            const dim = isEdgeDimmed(edge, dimmedCategoryIds, dimmedNodes);
            return `${hex}${dim ? "10" : "33"}`;
          }}
          linkWidth={(link) => 0.5 + 1.5 * ((link as { weight?: number }).weight ?? 0.3)}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const n = node as GraphNodeObject;
            const x = n.x ?? 0;
            const y = n.y ?? 0;
            const r = radiusOf(n);
            const hex = toneHexByCategory.get(n.categoryId) ?? "#7C8499";
            const isCenter = n.id === centerId;
            const isSelected = n.id === selectedId;
            const isHovered = hovered?.id === n.id;
            const dimmed = dimmedNodes.has(n.id) || dimmedCategoryIds.has(n.categoryId);

            ctx.globalAlpha = dimmed
              ? DIM_ALPHA
              : isCenter || isSelected || isHovered || firstDegreeIds.has(n.id)
                ? 1
                : NODE_ALPHA_BACKGROUND;

            if (isCenter || isSelected) {
              ctx.beginPath();
              ctx.arc(x, y, r + 3, 0, 2 * Math.PI);
              ctx.strokeStyle = isCenter ? "#5C92FF" : "#EEF0F7";
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }

            ctx.beginPath();
            ctx.arc(x, y, r, 0, 2 * Math.PI);
            ctx.fillStyle = hex;
            ctx.fill();

            const showLabel = isCenter || isSelected || isHovered || globalScale > 1.6;
            if (showLabel && !dimmed) {
              const fontSize = Math.max(10 / globalScale, 2.4);
              ctx.font = `${isCenter ? "600 " : ""}${fontSize}px sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              ctx.fillStyle = "#D4D8E4";
              ctx.fillText(n.label, x, y + r + 1.5);
            }
            ctx.globalAlpha = 1;
          }}
          nodePointerAreaPaint={(node, color, ctx) => {
            const n = node as GraphNodeObject;
            ctx.beginPath();
            ctx.arc(n.x ?? 0, n.y ?? 0, radiusOf(n) + 3, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
          }}
          onNodeDrag={undefined}
        />
      </div>

      <button
        type="button"
        onClick={() => graphRef.current?.zoomToFit(reducedMotion ? 0 : 400, 40)}
        className="absolute right-3 top-3 rounded-full border border-ink-700/60 bg-ink-900/90 px-3 py-1 text-xs text-ink-100 hover:border-ink-500"
      >
        Reset view
      </button>

      {/* Hover preview (CB Insights pattern): plain positioned card, NOT the
          Tooltip primitive (which renders a button per trigger). */}
      <div
        className="pointer-events-none absolute inset-0"
        onMouseMove={undefined}
        aria-hidden
      >
        {hovered && (
          <HoverPreviewCard
            node={hovered}
            categories={categories}
            containerWidth={width}
            pointer={pointer}
          />
        )}
      </div>

      {/* Pointer tracking overlay-free: use native mousemove on the container */}
      <PointerTracker containerRef={containerRef} onMove={setPointer} />
    </div>
  );
}

function PointerTracker({
  containerRef,
  onMove,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onMove: (p: { x: number; y: number }) => void;
}) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      onMove({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    el.addEventListener("mousemove", handler);
    return () => el.removeEventListener("mousemove", handler);
  }, [containerRef, onMove]);
  return null;
}

function HoverPreviewCard({
  node,
  categories,
  containerWidth,
  pointer,
}: {
  node: GraphNodeObject;
  categories: ExplorerCategory[];
  containerWidth: number;
  pointer: { x: number; y: number };
}) {
  const category = categories.find((c) => c.id === node.categoryId);
  const flipLeft = pointer.x > containerWidth - 240;
  return (
    <div
      className="absolute z-20 w-56 rounded-lg border border-ink-700/60 bg-ink-900/95 p-3 shadow-xl"
      style={{
        left: flipLeft ? pointer.x - 236 : pointer.x + 14,
        top: Math.max(4, pointer.y - 10),
      }}
    >
      <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-50">
        {category && (
          <span className={`h-2 w-2 rounded-full ${EXPLORER_TONES[category.tone].dot}`} />
        )}
        {node.label}
      </p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-300">
        {category?.label ?? node.categoryId}
        {node.statusLabel ? ` · ${node.statusLabel}` : ""}
      </p>
      {node.summary && <p className="mt-1.5 text-[11px] leading-relaxed text-ink-100">{node.summary}</p>}
      <p className="mt-1.5 text-[10px] text-ink-300">Click to open details</p>
    </div>
  );
}
