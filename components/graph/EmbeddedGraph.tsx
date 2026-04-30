'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  NODE_VISUALS,
  STRENGTH_VISUALS,
  RELATIONSHIP_VISUALS,
  type NodeVisualConfig,
  type EdgeVisualConfig,
  type RelationshipTypeVisualConfig,
} from '@/lib/graphVisuals';

interface GraphNode {
  id: string;
  label: string;
  type: 'person' | 'company' | 'project';
  isCenter?: boolean;
  supabaseId?: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  strength?: number;
}

interface EmbeddedGraphProps {
  entityId: string;
  entityType: 'contact' | 'company' | 'project';
  height?: string;
  degrees?: number;
  edgeTypes?: string[];
  minStrength?: number;
  showControls?: boolean;
  showLegend?: boolean;
}

export default function EmbeddedGraph({
  entityId,
  entityType,
  height = '400px',
  degrees = 2,
  edgeTypes,
  minStrength,
  showControls = true,
  showLegend = true,
}: EmbeddedGraphProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({
    nodes: [],
    edges: [],
  });

  // Filter state
  const [currentDegrees, setCurrentDegrees] = useState(degrees);
  const [selectedNodeTypes, setSelectedNodeTypes] = useState<string[]>([]);
  const [selectedEdgeTypes, setSelectedEdgeTypes] = useState<string[]>(edgeTypes || []);
  const [currentMinStrength, setCurrentMinStrength] = useState<number | undefined>(minStrength);

  // Get unique types present in the current graph
  const activeNodeTypes = useMemo(() => {
    const types = new Set(data.nodes.map(n => n.type));
    return Array.from(types);
  }, [data.nodes]);

  const activeEdgeTypes = useMemo(() => {
    const types = new Set(data.edges.map(e => e.type));
    return Array.from(types);
  }, [data.edges]);

  const activeStrengths = useMemo(() => {
    const strengths = new Set(data.edges.map(e => e.strength).filter((s): s is number => s !== undefined));
    return Array.from(strengths).sort();
  }, [data.edges]);

  useEffect(() => {
    setIsClient(true);

    // Check dark mode - check both system preference AND manual theme
    const checkDarkMode = () => {
      const htmlElement = document.documentElement;
      const hasClass = htmlElement.classList.contains('dark');
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(hasClass || systemDark);
    };
    checkDarkMode();

    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => checkDarkMode();
    mediaQuery.addEventListener('change', handler);

    return () => {
      mediaQuery.removeEventListener('change', handler);
      observer.disconnect();
    };
  }, []);

  // Fetch data from backend
  useEffect(() => {
    async function fetchGraphData() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set('degrees', currentDegrees.toString());
        params.set('entityType', entityType);
        // Note: We don't send selectedEdgeTypes to backend - filter client-side only
        // This keeps all edge types visible in the legend for toggling
        if (currentMinStrength) params.set('minStrength', currentMinStrength.toString());

        const response = await fetch(
          `http://localhost:3000/graph/ego/${entityId}?${params.toString()}`
        );

        if (!response.ok) throw new Error('Failed to fetch graph data');

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load graph');
      } finally {
        setLoading(false);
      }
    }

    if (entityId) {
      fetchGraphData();
    }
  }, [entityId, currentDegrees, currentMinStrength]); // Removed selectedEdgeTypes from dependencies

  // Render Cytoscape graph
  useEffect(() => {
    if (!isClient || !containerRef.current || data.nodes.length === 0) return;

    let mounted = true;

    import('cytoscape').then((cytoscapeModule) => {
      if (!mounted || !containerRef.current) return;

      const cytoscape = cytoscapeModule.default;

      // Clean up previous instance
      if (cyRef.current) {
        try {
          cyRef.current.removeAllListeners();
          if (!cyRef.current.destroyed()) {
            cyRef.current.destroy();
          }
        } catch (e) {
          // Ignore cleanup errors
        }
        cyRef.current = null;
      }

      // Build dynamic styles for node types
      const nodeStyles = Object.entries(NODE_VISUALS).map(([type, config]) => ({
        selector: `node[type="${type}"]`,
        style: {
          'background-color': 'transparent',
          'border-color': isDark ? config.color.dark : config.color.light,
          'border-style': config.borderStyle,
          'shape': config.shape,
          'width': config.size.width,
          'height': config.size.height,
          'border-width': config.borderWidth,
        },
      }));

      // Build dynamic styles for relationship types
      const relationshipStyles = Object.entries(RELATIONSHIP_VISUALS).map(([type, config]) => ({
        selector: `edge[type="${type}"]`,
        style: {
          'line-color': isDark ? config.color.dark : config.color.light,
          'target-arrow-color': isDark ? config.color.dark : config.color.light,
        },
      }));

      // Build dynamic styles for strength levels
      const strengthStyles = Object.entries(STRENGTH_VISUALS).map(([strength, config]) => ({
        selector: `edge[strength = ${strength}]`,
        style: {
          'width': config.width,
          'line-style': config.lineStyle,
        },
      }));

      // Filter edges first (by type and strength)
      const filteredEdges = data.edges.filter(e => {
        if (selectedEdgeTypes.length > 0 && !selectedEdgeTypes.includes(e.type)) return false;
        if (currentMinStrength && e.strength && e.strength < currentMinStrength) return false;
        return true;
      });

      // Get node IDs that are connected by filtered edges (plus center node)
      const connectedNodeIds = new Set<string>();
      filteredEdges.forEach(e => {
        connectedNodeIds.add(e.source);
        connectedNodeIds.add(e.target);
      });

      // Filter nodes: must be connected by visible edges AND match node type filter
      const filteredNodes = data.nodes.filter(n => {
        // Always show center node
        if (n.isCenter) return true;
        // Must be connected by at least one visible edge
        if (!connectedNodeIds.has(n.id)) return false;
        // Must match node type filter (if any)
        if (selectedNodeTypes.length > 0 && !selectedNodeTypes.includes(n.type)) return false;
        return true;
      });

      // Get final set of visible node IDs for edge validation
      const visibleNodeIds = new Set(filteredNodes.map(n => n.id));

      // Final edge filter: only include edges where both nodes are visible
      const finalEdges = filteredEdges.filter(e =>
        visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
      );

      // Initialize Cytoscape
      const cy = cytoscape({
        container: containerRef.current,
        elements: {
          nodes: filteredNodes.map((node) => ({
            data: {
              id: node.id,
              label: node.label,
              type: node.type,
              isCenter: node.isCenter || false,
            },
          })),
          edges: finalEdges.map((edge, index) => ({
            data: {
              id: edge.id || `${edge.source}-${edge.target}-${index}`,
              source: edge.source,
              target: edge.target,
              type: edge.type,
              strength: edge.strength,
            },
          })),
        },
        style: [
          // Base node style
          {
            selector: 'node',
            style: {
              'background-color': 'transparent',
              'label': 'data(label)',
              'color': isDark ? '#ffffff' : '#000000',
              'font-size': '10px',
              'text-valign': 'bottom',
              'text-halign': 'center',
              'text-margin-y': 4,
              'width': 30,
              'height': 30,
              'border-width': 2,
              'border-color': isDark ? '#ffffff' : '#000000',
              'border-style': 'solid',
            },
          },
          // Apply node type styles
          ...nodeStyles,
          // Center node modifier
          {
            selector: 'node[isCenter]',
            style: {
              'background-color': 'transparent',
              'border-color': isDark ? NODE_VISUALS.center.color.dark : NODE_VISUALS.center.color.light,
              'border-width': NODE_VISUALS.center.borderWidth,
              'width': NODE_VISUALS.center.size.width,
              'height': NODE_VISUALS.center.size.height,
              'font-size': '12px',
              'font-weight': 'bold',
            },
          },
          // Base edge style
          {
            selector: 'edge',
            style: {
              'width': 1.5,
              'line-color': isDark ? '#666666' : '#999999',
              'target-arrow-color': isDark ? '#666666' : '#999999',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
            },
          },
          // Apply relationship type styles
          ...relationshipStyles,
          // Apply strength styles
          ...strengthStyles,
        ],
        layout: {
          name: 'cose',
          animate: true,
          animationDuration: 1000,
          fit: true,
          padding: 30,
          nodeRepulsion: 8000,
          idealEdgeLength: 100,
          edgeElasticity: 100,
          nestingFactor: 1.2,
          gravity: 0.25,
          numIter: 1000,
          initialTemp: 200,
          coolingFactor: 0.95,
          minTemp: 1.0,
        },
      });

      // Add hover effect
      cy.on('mouseover', 'node', (event: any) => {
        const node = event.target;
        node.style('cursor', 'pointer');
        node.animate({
          style: {
            'border-width': node.data('isCenter') ? 6 : 4,
          }
        }, {
          duration: 200
        });
      });

      cy.on('mouseout', 'node', (event: any) => {
        const node = event.target;
        const nodeType = node.data('type');
        const isCenter = node.data('isCenter');
        const originalWidth = isCenter ? NODE_VISUALS.center.borderWidth : (NODE_VISUALS[nodeType]?.borderWidth || 2);

        node.animate({
          style: {
            'border-width': originalWidth,
          }
        }, {
          duration: 200
        });
      });

      // Add click handler for navigation
      cy.on('tap', 'node', (event: any) => {
        const node = event.target;
        const nodeData = node.data();
        const nodeType = nodeData.type;
        const nodeId = nodeData.id;

        // Extract supabase ID from the node ID (e.g., "contact_3" -> 3)
        const supabaseId = nodeId.split('_')[1];

        if (supabaseId && nodeType) {
          // Map node type to route path
          const routeMap: Record<string, string> = {
            'person': '/contacts',
            'company': '/companies',
            'project': '/projects',
          };

          const basePath = routeMap[nodeType];
          if (basePath) {
            router.push(`${basePath}/${supabaseId}`);
          }
        }
      });

      cyRef.current = cy;
    }).catch((error) => {
      console.error('Failed to load Cytoscape:', error);
    });

    return () => {
      mounted = false;
      if (cyRef.current) {
        try {
          cyRef.current.removeAllListeners();
          if (!cyRef.current.destroyed()) {
            cyRef.current.destroy();
          }
        } catch (e) {
          // Silently ignore
        }
        cyRef.current = null;
      }
    };
  }, [data, isClient, isDark, selectedNodeTypes, selectedEdgeTypes, currentMinStrength]);

  const toggleNodeType = (type: string) => {
    setSelectedNodeTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleEdgeType = (type: string) => {
    setSelectedEdgeTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  if (loading) {
    return (
      <Card className="p-4" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-sm">Loading network...</div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {showControls && (
        <Card className="p-3 border-2 border-black dark:border-white">
          <div className="space-y-3">
            {/* Degrees control */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium min-w-[100px]">Degrees: {currentDegrees}</span>
              <input
                type="range"
                min="1"
                max="4"
                value={currentDegrees}
                onChange={(e) => setCurrentDegrees(parseInt(e.target.value))}
                className="flex-1"
              />
            </div>

            {/* Strength filter */}
            {activeStrengths.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium min-w-[100px]">
                  Min Strength: {currentMinStrength || 'Any'}
                </span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={currentMinStrength || 1}
                  onChange={(e) => setCurrentMinStrength(parseInt(e.target.value))}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMinStrength(undefined)}
                  className="text-xs"
                >
                  Reset
                </Button>
              </div>
            )}

            {/* Node type filters */}
            {activeNodeTypes.length > 1 && (
              <div>
                <span className="text-sm font-medium block mb-2">Filter Nodes:</span>
                <div className="flex flex-wrap gap-2">
                  {activeNodeTypes.map((type) => {
                    const visual = NODE_VISUALS[type];
                    const isActive = selectedNodeTypes.length === 0 || selectedNodeTypes.includes(type);
                    return (
                      <button
                        key={type}
                        onClick={() => toggleNodeType(type)}
                        className={`px-2 py-1 text-xs border rounded transition-colors ${
                          isActive
                            ? 'bg-foreground text-background border-foreground'
                            : 'bg-transparent text-foreground border-border hover:bg-muted'
                        }`}
                      >
                        <span
                          className={`inline-block w-3 h-3 mr-1 border ${
                            visual.shape === 'ellipse' ? 'rounded-full' : 'rounded-sm'
                          }`}
                          style={{
                            borderColor: isDark ? visual.color.dark : visual.color.light,
                            borderStyle: visual.borderStyle
                          }}
                        />
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Edge type filters */}
            {activeEdgeTypes.length > 0 && (
              <div>
                <span className="text-sm font-medium block mb-2">Filter Edges:</span>
                <div className="flex flex-wrap gap-2">
                  {activeEdgeTypes.map((type) => {
                    const visual = RELATIONSHIP_VISUALS[type];
                    const isActive = selectedEdgeTypes.length === 0 || selectedEdgeTypes.includes(type);
                    return (
                      <button
                        key={type}
                        onClick={() => toggleEdgeType(type)}
                        className={`px-2 py-1 text-xs border rounded transition-colors ${
                          isActive
                            ? 'bg-foreground text-background border-foreground'
                            : 'bg-transparent text-foreground border-border hover:bg-muted'
                        }`}
                      >
                        <span
                          className="inline-block w-4 h-0.5 mr-1"
                          style={{ backgroundColor: isDark ? (visual?.color.dark || '#ffffff') : (visual?.color.light || '#000000') }}
                        />
                        {visual?.label || type}
                      </button>
                    );
                  })}
                  {selectedEdgeTypes.length > 0 && (
                    <button
                      onClick={() => setSelectedEdgeTypes([])}
                      className="px-3 py-1 text-xs underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-2 pt-2 border-t-2 border-black dark:border-white">
              <Badge variant="secondary" className="text-xs">
                {data.nodes.length} nodes
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {data.edges.length} edges
              </Badge>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-4 border-2 border-black dark:border-white bg-white dark:bg-black relative">
        <div
          ref={containerRef}
          style={{
            height,
            backgroundColor: isDark ? '#000000' : '#ffffff',
          }}
          className="rounded"
        />

        {showLegend && (
          <div className="absolute bottom-4 left-4 border-2 border-black dark:border-white p-2 bg-white dark:bg-black max-w-xs text-xs">
            <div className="font-semibold mb-2">Legend</div>

            {/* Active node types */}
            {activeNodeTypes.length > 0 && (
              <div className="mb-2 pb-2 border-b-2 border-black dark:border-white">
                <div className="font-medium mb-1">Nodes:</div>
                <div className="space-y-1">
                  {activeNodeTypes.map((type) => {
                    const visual = NODE_VISUALS[type];
                    if (!visual) return null;

                    // Get border style class
                    const borderStyleClass =
                      visual.borderStyle === 'dashed' ? 'border-dashed' :
                      visual.borderStyle === 'dotted' ? 'border-dotted' : 'border-solid';

                    return (
                      <div key={type} className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 border-2 ${borderStyleClass} ${
                            visual.shape === 'ellipse' ? 'rounded-full' :
                            visual.shape === 'diamond' ? 'rotate-45' : 'rounded-sm'
                          }`}
                          style={{
                            borderColor: isDark ? visual.color.dark : visual.color.light,
                            backgroundColor: 'transparent',
                          }}
                        />
                        <span className="capitalize">{type}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active strength levels */}
            {activeStrengths.length > 0 && (
              <div>
                <div className="font-medium mb-1">Strength:</div>
                <div className="space-y-2">
                  {activeStrengths.map((strength) => {
                    const visual = STRENGTH_VISUALS[strength];
                    if (!visual) return null;

                    // Render line based on style
                    let lineElement;
                    if (visual.lineStyle === 'solid') {
                      lineElement = (
                        <div
                          className="w-8"
                          style={{
                            height: `${visual.width}px`,
                            backgroundColor: isDark ? '#ffffff' : '#000000',
                          }}
                        />
                      );
                    } else if (visual.lineStyle === 'dashed') {
                      lineElement = (
                        <svg width="32" height="8" viewBox="0 0 32 8" className="overflow-visible">
                          <line
                            x1="0"
                            y1="4"
                            x2="32"
                            y2="4"
                            stroke={isDark ? '#ffffff' : '#000000'}
                            strokeWidth={visual.width}
                            strokeDasharray="4 2"
                          />
                        </svg>
                      );
                    } else {
                      lineElement = (
                        <svg width="32" height="8" viewBox="0 0 32 8" className="overflow-visible">
                          <line
                            x1="0"
                            y1="4"
                            x2="32"
                            y2="4"
                            stroke={isDark ? '#ffffff' : '#000000'}
                            strokeWidth={visual.width}
                            strokeDasharray="1 2"
                          />
                        </svg>
                      );
                    }

                    return (
                      <div key={strength} className="flex items-center gap-2">
                        {lineElement}
                        <span>{strength}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}