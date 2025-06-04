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

enum ShapeType {
  SQUARE = 'square',
  CIRCLE = 'circle',
  TRIANGLE = 'triangle',
  STAR = 'star'
}

interface CellData {
  shapeType: ShapeType;
  count: number;
  rotation: number; // 0, 90, 180, 270
  color: string;
}

const COLORS = ['#FF4444', '#4444FF', '#44FF44']; // Red, Blue, Green - max 3 colors
const SHAPES = [ShapeType.SQUARE, ShapeType.CIRCLE, ShapeType.TRIANGLE, ShapeType.STAR];
const CELL_SIZE = 256;

// Seeded random number generator
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
      hash = hash & hash; // Convert to 32-bit integer
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

function generateShapeSVG(shapeType: ShapeType, count: number, rotation: number, color: string): string {
  if (count <= 0) return '';
  
  const gridSize = Math.ceil(Math.sqrt(count));
  const shapeSize = CELL_SIZE / (gridSize * 1.5);
  const spacing = CELL_SIZE / gridSize;
  
  let shapes = '';
  
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;
    const x = (col + 0.5) * spacing;
    const y = (row + 0.5) * spacing;
    
    let shape = '';
    const size = shapeSize * 0.8;
    
    switch (shapeType) {
      case ShapeType.CIRCLE:
        shape = `<circle cx="${x}" cy="${y}" r="${size / 2}" fill="${color}" />`;
        break;
      case ShapeType.SQUARE:
        shape = `<rect x="${x - size/2}" y="${y - size/2}" width="${size}" height="${size}" fill="${color}" />`;
        break;
      case ShapeType.TRIANGLE:
        const h = size * 0.866; // height of equilateral triangle
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

export function generateRavenMatrixItem(seedString?: string): MatrixResponse {
  const seed = seedString || crypto.randomUUID();
  const rng = new SeededRandom(seed);
  
  // Generate base parameters
  const baseShape = rng.choice(SHAPES);
  const baseColor = rng.choice(COLORS);
  const baseCount = rng.nextInt(1, 3);
  const baseRotation = 0;
  
  // Create 3x3 matrix following the rules
  const matrix: CellData[][] = [];
  
  for (let row = 0; row < 3; row++) {
    matrix[row] = [];
    for (let col = 0; col < 3; col++) {
      // Rule 1: Addition across rows (count increases)
      const count = baseCount + col;
      
      // Rule 2: 90-degree rotation across columns
      const rotation = (baseRotation + (row * 90)) % 360;
      
      matrix[row][col] = {
        shapeType: baseShape,
        count: count,
        rotation: rotation,
        color: baseColor
      };
    }
  }
  
  // The correct answer for position [2][2]
  const correctAnswer = matrix[2][2];
  
  // Generate matrix cells (first 8 cells, excluding [2][2])
  const matrixCells: string[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (row === 2 && col === 2) continue; // Skip the target cell
      const svg = cellToSVG(matrix[row][col]);
      matrixCells.push(svgToBase64(svg));
    }
  }
  
  // Generate options (correct + 7 distractors)
  const options: CellData[] = [correctAnswer];
  
  // Generate distractors by breaking exactly one rule each
  const distractors: CellData[] = [];
  
  // Distractor 1: Break addition rule (wrong count)
  distractors.push({
    ...correctAnswer,
    count: correctAnswer.count + rng.nextInt(1, 2) * (rng.nextInt(0, 1) ? 1 : -1)
  });
  
  // Distractor 2: Break rotation rule (wrong rotation)
  const wrongRotations = [0, 90, 180, 270].filter(r => r !== correctAnswer.rotation);
  distractors.push({
    ...correctAnswer,
    rotation: rng.choice(wrongRotations)
  });
  
  // Distractor 3: Break both rules (wrong count and rotation)
  distractors.push({
    ...correctAnswer,
    count: correctAnswer.count + rng.nextInt(1, 2),
    rotation: rng.choice(wrongRotations)
  });
  
  // Additional distractors with variations
  for (let i = 0; i < 4; i++) {
    const distractor: CellData = { ...correctAnswer };
    
    // Randomly break one or more rules
    if (rng.next() < 0.5) {
      distractor.count = Math.max(1, correctAnswer.count + rng.nextInt(-2, 2));
    }
    if (rng.next() < 0.5) {
      distractor.rotation = rng.choice(wrongRotations);
    }
    if (rng.next() < 0.3) {
      distractor.shapeType = rng.choice(SHAPES.filter(s => s !== baseShape));
    }
    
    distractors.push(distractor);
  }
  
  // Combine and shuffle options
  options.push(...distractors);
  const shuffledOptions = rng.shuffle(options);
  const correctIndex = shuffledOptions.findIndex(opt => 
    opt.count === correctAnswer.count && 
    opt.rotation === correctAnswer.rotation &&
    opt.shapeType === correctAnswer.shapeType &&
    opt.color === correctAnswer.color
  );
  
  // Convert options to base64
  const optionsBase64 = shuffledOptions.map(option => svgToBase64(cellToSVG(option)));
  
  return {
    matrix_cells: matrixCells,
    options: optionsBase64,
    metadata: {
      rules: ["addition", "rotation_90"],
      difficulty_estimate: 0.5,
      correct_option_index: correctIndex,
      seed: seed,
      creation_timestamp: new Date().toISOString()
    }
  };
}
