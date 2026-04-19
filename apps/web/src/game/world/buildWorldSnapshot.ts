import type { BootstrapPayload } from "../../lib/types";
import type { BiomeLayout } from "./BiomeEngine";
import { BiomeEngine } from "./BiomeEngine";
import { createSeededRng, hashSeed, worldSeedKey } from "./seed";

export const WORLD_SIZE = 2400;
export const HALF_WORLD_SIZE = WORLD_SIZE / 2;
export const NAV_CELL_SIZE = 60;

export interface WorldPoint {
  x: number;
  y: number;
}

export interface WorldObstacle {
  x: number;
  y: number;
  radius: number;
  kind: "tree" | "crystal" | "obelisk" | "lantern";
}

export interface WorldRoute {
  id: string;
  width: number;
  points: WorldPoint[];
}

export interface WorldNavigation {
  cellSize: number;
  cols: number;
  rows: number;
  blocked: boolean[];
}

export interface WorldSnapshot {
  biome: BiomeLayout;
  obstacles: WorldObstacle[];
  routes: WorldRoute[];
  navigation: WorldNavigation;
}

interface CellPoint {
  col: number;
  row: number;
}

export function buildWorldSnapshot(world: BootstrapPayload): WorldSnapshot {
  const seed = hashSeed(
    worldSeedKey({
      worldName: world.worldName,
      regionName: world.region.name,
      climate: world.region.climate,
      hotspot: world.region.hotspot
    })
  );
  const biome = new BiomeEngine(world, createSeededRng(hashSeed(`${seed}:biome`))).build();
  const routes = buildRoutes();
  const obstacles = buildObstacles(biome);
  const navigation = buildNavigation(obstacles, routes);

  return {
    biome,
    obstacles,
    routes,
    navigation
  };
}

export function clampWorldPoint(point: WorldPoint): WorldPoint {
  return {
    x: Math.max(-HALF_WORLD_SIZE + 30, Math.min(HALF_WORLD_SIZE - 30, point.x)),
    y: Math.max(-HALF_WORLD_SIZE + 30, Math.min(HALF_WORLD_SIZE - 30, point.y))
  };
}

export function worldToMinimap(point: WorldPoint, size: number) {
  return {
    x: ((point.x + HALF_WORLD_SIZE) / WORLD_SIZE) * size,
    y: ((point.y + HALF_WORLD_SIZE) / WORLD_SIZE) * size
  };
}

export function isPointWalkable(snapshot: WorldSnapshot, point: WorldPoint) {
  const clamped = clampWorldPoint(point);
  if (clamped.x !== point.x || clamped.y !== point.y) {
    return false;
  }

  return snapshot.obstacles.every((obstacle) => {
    const dx = point.x - obstacle.x;
    const dy = point.y - obstacle.y;
    return Math.hypot(dx, dy) > obstacle.radius + 18;
  });
}

export function findWorldPath(snapshot: WorldSnapshot, start: WorldPoint, goal: WorldPoint) {
  const startCell = nearestWalkableCell(snapshot.navigation, worldToCell(start));
  const goalCell = nearestWalkableCell(snapshot.navigation, worldToCell(goal));

  if (!startCell || !goalCell) {
    return [] as WorldPoint[];
  }

  const open: CellPoint[] = [startCell];
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>([[cellKey(startCell), 0]]);
  const fScore = new Map<string, number>([[cellKey(startCell), heuristic(startCell, goalCell)]]);
  const queued = new Set<string>([cellKey(startCell)]);

  while (open.length > 0) {
    open.sort((left, right) => (fScore.get(cellKey(left)) ?? Number.MAX_SAFE_INTEGER) - (fScore.get(cellKey(right)) ?? Number.MAX_SAFE_INTEGER));
    const current = open.shift();
    if (!current) {
      break;
    }

    const currentKey = cellKey(current);
    queued.delete(currentKey);

    if (current.col === goalCell.col && current.row === goalCell.row) {
      return compressPath(reconstructPath(cameFrom, current).map(cellToWorld));
    }

    for (const neighbor of neighborCells(snapshot.navigation, current)) {
      const neighborKey = cellKey(neighbor);
      const tentative = (gScore.get(currentKey) ?? Number.MAX_SAFE_INTEGER) + stepCost(current, neighbor);

      if (tentative >= (gScore.get(neighborKey) ?? Number.MAX_SAFE_INTEGER)) {
        continue;
      }

      cameFrom.set(neighborKey, currentKey);
      gScore.set(neighborKey, tentative);
      fScore.set(neighborKey, tentative + heuristic(neighbor, goalCell));

      if (!queued.has(neighborKey)) {
        open.push(neighbor);
        queued.add(neighborKey);
      }
    }
  }

  return [];
}

function buildRoutes(): WorldRoute[] {
  return [
    {
      id: "north-south",
      width: 124,
      points: [
        { x: -740, y: -640 },
        { x: -340, y: -260 },
        { x: 0, y: 0 },
        { x: 320, y: 300 },
        { x: 710, y: 660 }
      ]
    },
    {
      id: "west-east",
      width: 118,
      points: [
        { x: -860, y: 120 },
        { x: -420, y: 40 },
        { x: 0, y: 0 },
        { x: 460, y: -40 },
        { x: 860, y: -150 }
      ]
    },
    {
      id: "ring-lane",
      width: 88,
      points: [
        { x: -180, y: -520 },
        { x: 340, y: -400 },
        { x: 560, y: 40 },
        { x: 300, y: 520 },
        { x: -280, y: 520 },
        { x: -560, y: 60 },
        { x: -360, y: -360 },
        { x: -180, y: -520 }
      ]
    }
  ];
}

function buildObstacles(biome: BiomeLayout) {
  return [
    ...biome.trees.map((prop) => ({
      x: prop.x,
      y: prop.y + 14,
      radius: 34 * prop.scale,
      kind: "tree" as const
    })),
    ...biome.crystals.map((prop) => ({
      x: prop.x,
      y: prop.y + 10,
      radius: 24 * prop.scale,
      kind: "crystal" as const
    })),
    ...biome.obelisks.map((prop) => ({
      x: prop.x,
      y: prop.y + 10,
      radius: 28 * prop.scale,
      kind: "obelisk" as const
    })),
    ...biome.lanterns.map((prop) => ({
      x: prop.x,
      y: prop.y + 8,
      radius: 20 * prop.scale,
      kind: "lantern" as const
    }))
  ];
}

function buildNavigation(obstacles: WorldObstacle[], routes: WorldRoute[]): WorldNavigation {
  const cols = WORLD_SIZE / NAV_CELL_SIZE;
  const rows = WORLD_SIZE / NAV_CELL_SIZE;
  const blocked = new Array<boolean>(cols * rows).fill(false);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const point = cellToWorld({ col, row });
      const blockedByObstacle = obstacles.some((obstacle) => {
        const distance = Math.hypot(point.x - obstacle.x, point.y - obstacle.y);
        return distance < obstacle.radius + 18;
      });
      const closeToRoute = routes.some((route) => pointNearRoute(point, route, route.width * 0.5));
      const closeToCenter = Math.hypot(point.x, point.y) < 170;

      blocked[row * cols + col] = blockedByObstacle && !closeToRoute && !closeToCenter;
    }
  }

  return {
    cellSize: NAV_CELL_SIZE,
    cols,
    rows,
    blocked
  };
}

function pointNearRoute(point: WorldPoint, route: WorldRoute, maxDistance: number) {
  for (let index = 0; index < route.points.length - 1; index += 1) {
    if (distanceToSegment(point, route.points[index], route.points[index + 1]) <= maxDistance) {
      return true;
    }
  }

  return false;
}

function distanceToSegment(point: WorldPoint, start: WorldPoint, end: WorldPoint) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const projection = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  const closestX = start.x + dx * projection;
  const closestY = start.y + dy * projection;
  return Math.hypot(point.x - closestX, point.y - closestY);
}

function worldToCell(point: WorldPoint): CellPoint {
  return {
    col: clampInt(Math.floor((point.x + HALF_WORLD_SIZE) / NAV_CELL_SIZE), 0, WORLD_SIZE / NAV_CELL_SIZE - 1),
    row: clampInt(Math.floor((point.y + HALF_WORLD_SIZE) / NAV_CELL_SIZE), 0, WORLD_SIZE / NAV_CELL_SIZE - 1)
  };
}

function cellToWorld(cell: CellPoint): WorldPoint {
  return {
    x: -HALF_WORLD_SIZE + cell.col * NAV_CELL_SIZE + NAV_CELL_SIZE / 2,
    y: -HALF_WORLD_SIZE + cell.row * NAV_CELL_SIZE + NAV_CELL_SIZE / 2
  };
}

function nearestWalkableCell(navigation: WorldNavigation, cell: CellPoint) {
  if (!isCellBlocked(navigation, cell)) {
    return cell;
  }

  const queue: CellPoint[] = [cell];
  const visited = new Set<string>([cellKey(cell)]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    for (const neighbor of neighborCells(navigation, current)) {
      const key = cellKey(neighbor);
      if (visited.has(key)) {
        continue;
      }
      if (!isCellBlocked(navigation, neighbor)) {
        return neighbor;
      }
      visited.add(key);
      queue.push(neighbor);
    }
  }

  return null;
}

function neighborCells(navigation: WorldNavigation, cell: CellPoint) {
  const neighbors: CellPoint[] = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      if (rowOffset === 0 && colOffset === 0) {
        continue;
      }

      const neighbor = {
        col: cell.col + colOffset,
        row: cell.row + rowOffset
      };

      if (neighbor.col < 0 || neighbor.row < 0 || neighbor.col >= navigation.cols || neighbor.row >= navigation.rows) {
        continue;
      }

      if (!isCellBlocked(navigation, neighbor)) {
        neighbors.push(neighbor);
      }
    }
  }

  return neighbors;
}

function reconstructPath(cameFrom: Map<string, string>, current: CellPoint) {
  const path = [current];
  let cursor = cellKey(current);

  for (;;) {
    const previous = cameFrom.get(cursor);
    if (!previous) {
      break;
    }

    const [col, row] = previous.split(":").map(Number);
    path.unshift({ col, row });
    cursor = previous;
  }

  return path;
}

function compressPath(points: WorldPoint[]) {
  if (points.length <= 2) {
    return points;
  }

  const compressed = [points[0]];

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = compressed[compressed.length - 1];
    const current = points[index];
    const next = points[index + 1];
    const deltaA = { x: Math.sign(current.x - previous.x), y: Math.sign(current.y - previous.y) };
    const deltaB = { x: Math.sign(next.x - current.x), y: Math.sign(next.y - current.y) };

    if (deltaA.x !== deltaB.x || deltaA.y !== deltaB.y) {
      compressed.push(current);
    }
  }

  compressed.push(points[points.length - 1]);
  return compressed;
}

function heuristic(left: CellPoint, right: CellPoint) {
  return Math.abs(left.col - right.col) + Math.abs(left.row - right.row);
}

function stepCost(left: CellPoint, right: CellPoint) {
  return left.col !== right.col && left.row !== right.row ? 1.4 : 1;
}

function isCellBlocked(navigation: WorldNavigation, cell: CellPoint) {
  return navigation.blocked[cell.row * navigation.cols + cell.col];
}

function cellKey(cell: CellPoint) {
  return `${cell.col}:${cell.row}`;
}

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
