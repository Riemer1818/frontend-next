/**
 * Centralized visual mapping for graph nodes and edges
 * This ensures consistent visual encoding across the entire application
 */

export interface NodeVisualConfig {
  shape: 'ellipse' | 'round-rectangle' | 'diamond' | 'triangle' | 'star';
  color: {
    light: string;
    dark: string;
  };
  borderWidth: number;
  size: {
    width: number;
    height: number;
  };
}

export interface EdgeVisualConfig {
  lineStyle: 'solid' | 'dashed' | 'dotted';
  width: number;
}

export interface RelationshipTypeVisualConfig {
  color: {
    light: string;
    dark: string;
  };
  label?: string;
}

/**
 * Node type visual mappings
 */
export const NODE_VISUALS: Record<string, NodeVisualConfig> = {
  person: {
    shape: 'ellipse',
    color: {
      light: '#00ffff', // Neon cyan
      dark: '#00ffff',
    },
    borderWidth: 2,
    size: {
      width: 40,
      height: 40,
    },
  },
  company: {
    shape: 'round-rectangle',
    color: {
      light: '#ff00ff', // Neon magenta
      dark: '#ff00ff',
    },
    borderWidth: 2,
    size: {
      width: 50,
      height: 50,
    },
  },
  // Center/focus node gets special treatment (applied as modifier)
  center: {
    shape: 'ellipse', // Will inherit from actual type
    color: {
      light: '#ffff00', // Neon yellow
      dark: '#ffff00',
    },
    borderWidth: 4,
    size: {
      width: 60,
      height: 60,
    },
  },
};

/**
 * Relationship type visual mappings
 * Colors for different relationship types
 */
export const RELATIONSHIP_VISUALS: Record<string, RelationshipTypeVisualConfig> = {
  friend: {
    color: { light: '#00ff00', dark: '#00ff00' }, // Neon green
    label: 'Friend',
  },
  colleague: {
    color: { light: '#00ffff', dark: '#00ffff' }, // Neon cyan
    label: 'Colleague',
  },
  mentor: {
    color: { light: '#ffff00', dark: '#ffff00' }, // Neon yellow
    label: 'Mentor',
  },
  former_colleague: {
    color: { light: '#ff8800', dark: '#ff8800' }, // Neon orange
    label: 'Former Colleague',
  },
  investor: {
    color: { light: '#ff00ff', dark: '#ff00ff' }, // Neon magenta
    label: 'Investor',
  },
  client: {
    color: { light: '#0088ff', dark: '#0088ff' }, // Neon blue
    label: 'Client',
  },
  works_at: {
    color: { light: '#8800ff', dark: '#8800ff' }, // Neon purple
    label: 'Works At',
  },
};

/**
 * Strength-based edge visual mappings
 * Higher strength = thicker, more solid lines
 */
export const STRENGTH_VISUALS: Record<number, EdgeVisualConfig> = {
  5: {
    lineStyle: 'solid',
    width: 4,
  },
  4: {
    lineStyle: 'solid',
    width: 3,
  },
  3: {
    lineStyle: 'dashed',
    width: 2,
  },
  2: {
    lineStyle: 'dotted',
    width: 2,
  },
  1: {
    lineStyle: 'dotted',
    width: 1,
  },
};

/**
 * Get visual config for a node type
 */
export function getNodeVisual(type: string, isDark: boolean): NodeVisualConfig {
  const visual = NODE_VISUALS[type] || NODE_VISUALS.person; // Fallback to person
  return visual;
}

/**
 * Get visual config for a relationship type
 */
export function getRelationshipVisual(type: string, isDark: boolean): RelationshipTypeVisualConfig {
  return RELATIONSHIP_VISUALS[type] || {
    color: { light: '#ffffff', dark: '#ffffff' }, // White fallback
    label: type,
  };
}

/**
 * Get visual config for a relationship strength
 */
export function getStrengthVisual(strength: number): EdgeVisualConfig {
  return STRENGTH_VISUALS[strength] || STRENGTH_VISUALS[1]; // Fallback to weakest
}

/**
 * Helper to get edge color based on type and theme
 */
export function getEdgeColor(type: string, isDark: boolean): string {
  const visual = getRelationshipVisual(type, isDark);
  return isDark ? visual.color.dark : visual.color.light;
}

/**
 * Helper to get node color based on type and theme
 */
export function getNodeColor(type: string, isDark: boolean): string {
  const visual = getNodeVisual(type, isDark);
  return isDark ? visual.color.dark : visual.color.light;
}
