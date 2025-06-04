// src/app/tests/raven-adaptive/matrix-generator.ts

export interface MatrixResponse {
  matrix_cells: string[];
  options: string[];
  metadata: {
    rules: string[];
    difficulty_estimate: number;
    correct_option_index: number;
    seed: string;
    creation_timestamp: string;
  };
}

// Shape types used to build SVG cells
enum ShapeType {
  SQUARE = 'square',
  CIRCLE = 'circle',
  TRIANGLE = 'triangle',
  STAR = 'star'
}

interface CellData {
  shapeType: ShapeType;
  count: number;
  rotation: number; // degrees
  color: string;
}

const COLORS = ['#FF4444', '#4444FF', '#44FF44'];
const SHAPES = [ShapeType.SQUARE, ShapeType.CIRCLE, ShapeType.TRIANGLE, ShapeType.STAR];
const CELL_SIZE = 256;

// Simple seeded random generator
class SeededRandom {
  private seed: number;

  constructor(seed: string) {
    this.seed = this.hashString(seed);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash &= hash; // force 32bit
    }
    return Math.abs(hash);
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  choice<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

function generateShapeSVG(type: ShapeType, count: number, rotation: number, color: string): string {
  if (count <= 0) return '';

  const grid = Math.ceil(Math.sqrt(count));
  const shapeSize = CELL_SIZE / (grid * 1.5);
  const spacing = CELL_SIZE / grid;

  let shapes = '';

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / grid);
    const col = i % grid;
    const x = (col + 0.5) * spacing;
    const y = (row + 0.5) * spacing;
    const size = shapeSize * 0.8;

    let shape = '';
    switch (type) {
      case ShapeType.CIRCLE:
        shape = `<circle cx="${x}" cy="${y}" r="${size / 2}" fill="${color}" />`;
        break;
      case ShapeType.SQUARE:
        shape = `<rect x="${x - size/2}" y="${y - size/2}" width="${size}" height="${size}" fill="${color}" />`;
        break;
      case ShapeType.TRIANGLE:
        const h = size * 0.866;
        shape = `<polygon points="${x},${y - h/2} ${x - size/2},${y + h/2} ${x + size/2},${y + h/2}" fill="${color}" />`;
        break;
      case ShapeType.STAR:
        const outerR = size / 2;
        const innerR = outerR * 0.4;
        let points = '';
        for (let j = 0; j < 5; j++) {
          const outerAngle = (j * 72 - 90) * Math.PI / 180;
          const innerAngle = ((j + 0.5) * 72 - 90) * Math.PI / 180;
          points += `${x + Math.cos(outerAngle) * outerR},${y + Math.sin(outerAngle) * outerR} `;
          points += `${x + Math.cos(innerAngle) * innerR},${y + Math.sin(innerAngle) * innerR} `;
        }
        shape = `<polygon points="${points.trim()}" fill="${color}" />`;
        break;
    }

    shapes += shape;
  }

  return `<g transform="rotate(${rotation} ${CELL_SIZE/2} ${CELL_SIZE/2})">${shapes}</g>`;
}

function cellToSVG(cell: CellData): string {
  const shapeSVG = generateShapeSVG(cell.shapeType, cell.count, cell.rotation, cell.color);
  return `<svg width="${CELL_SIZE}" height="${CELL_SIZE}" viewBox="0 0 ${CELL_SIZE} ${CELL_SIZE}" xmlns="http://www.w3.org/2000/svg" style="background: transparent;">${shapeSVG}</svg>`;
}

function svgToBase64(svg: string): string {
  if (typeof btoa !== 'undefined') {
    return btoa(unescape(encodeURIComponent(svg)));
  } else if (typeof Buffer !== 'undefined') {
    return Buffer.from(svg, 'utf8').toString('base64');
  }
  throw new Error('Base64 encoding not available');
}

/**
 * Generate a Raven-style matrix item.
 * `difficulty` should be in the range 0..1.
 */
export function generateRavenMatrixItem(difficulty = 0.5, seedString?: string): MatrixResponse {
  const seed = seedString || crypto.randomUUID();
  const rng = new SeededRandom(seed);

  // Base parameters influenced by difficulty
  const baseShape = rng.choice(SHAPES);
  const baseColor = rng.choice(COLORS);
  const baseCount = 1 + Math.floor(difficulty * 4); // 1..5 shapes
  const baseRotation = 0;

  // Build 3x3 matrix following simple rules
  const matrix: CellData[][] = [];

  for (let row = 0; row < 3; row++) {
    matrix[row] = [];
    for (let col = 0; col < 3; col++) {
      // Rule 1: Addition across columns
      const count = baseCount + col;
      // Rule 2: rotation across rows
      const rotation = (baseRotation + (row * 90)) % 360;

      matrix[row][col] = {
        shapeType: baseShape,
        count,
        rotation,
        color: baseColor
      };
    }
  }

  const correctAnswer = matrix[2][2];

  const matrixCells: string[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (r === 2 && c === 2) continue;
      matrixCells.push(svgToBase64(cellToSVG(matrix[r][c])));
    }
  }

  // Options: correct + 7 distractors
  const options: CellData[] = [correctAnswer];
  const distractors: CellData[] = [];

  // break rules to create distractors
  distractors.push({ ...correctAnswer, count: correctAnswer.count + rng.nextInt(1, 2) });
  const wrongRotations = [0, 90, 180, 270].filter(r => r !== correctAnswer.rotation);
  distractors.push({ ...correctAnswer, rotation: rng.choice(wrongRotations) });
  distractors.push({ ...correctAnswer, count: correctAnswer.count + 1, rotation: rng.choice(wrongRotations) });

  for (let i = 0; i < 4; i++) {
    const d: CellData = { ...correctAnswer };
    if (rng.next() < 0.5) d.count = Math.max(1, d.count + rng.nextInt(-2, 2));
    if (rng.next() < 0.5) d.rotation = rng.choice(wrongRotations);
    if (rng.next() < 0.3) d.shapeType = rng.choice(SHAPES.filter(s => s !== baseShape));
    distractors.push(d);
  }

  options.push(...distractors);
  const shuffled = rng.shuffle(options);
  const correctIndex = shuffled.findIndex(opt =>
    opt.count === correctAnswer.count &&
    opt.rotation === correctAnswer.rotation &&
    opt.shapeType === correctAnswer.shapeType &&
    opt.color === correctAnswer.color
  );

  const optionsBase64 = shuffled.map(o => svgToBase64(cellToSVG(o)));

  return {
    matrix_cells: matrixCells,
    options: optionsBase64,
    metadata: {
      rules: ['addition', 'rotation_90'],
      difficulty_estimate: difficulty,
      correct_option_index: correctIndex,
      seed,
      creation_timestamp: new Date().toISOString()
    }
  };
}

