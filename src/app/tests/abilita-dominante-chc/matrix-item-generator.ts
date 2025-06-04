// src/app/tests/abilita-dominante-chc/matrix-item-generator.ts

// --- Type Definitions ---
export enum ShapeType {
  CIRCLE = 'circle',
  SQUARE = 'square',
  TRIANGLE = 'triangle',
  STAR = 'star',
}

export interface ShapeInstance {
  type: ShapeType;
  color: string;
}

export interface CellContent {
  shapes: ShapeInstance[];
  count: number;
  baseRotationDegrees: 0 | 90 | 180 | 270;
}

export interface ItemRuleInfo {
  patternType: number; // Will now refer to ItemSpecificRuleSet ID
  description: string[];
}

export interface GeneratedMatrixItem {
  matrixCellContents: CellContent[];
  optionCellContents: CellContent[];
  correctOptionIndex: number;
  seed: string;
  difficultyLevelUsed: number;
  rulesInEffect: ItemRuleInfo;
}

export interface GeneratedItemWithBase64 {
  matrixCellsBase64: string[];
  optionsBase64: string[];
  correctOptionIndex: number;
  seed: string;
  rules: string[];
  difficultyEstimate: number;
  difficultyLevelUsed: number;
  patternTypeUsed: number; // Will be ItemSpecificRuleSet ID
  creationTimestamp: string;
  renderEngine: string;
}

// --- Configuration ---
const CELL_SIZE = 256;
const ALL_SHAPE_COLORS = ['#FF0000', '#0000FF', '#00FF00', '#FFA500', '#800080', '#FFC0CB']; // Red, Blue, Green, Orange, Purple, Pink (6 colors)
const ALL_SHAPE_TYPES = [ShapeType.CIRCLE, ShapeType.SQUARE, ShapeType.TRIANGLE, ShapeType.STAR]; // 4 types
const MAX_DIFFICULTY_LEVEL = 3;

export enum ItemSpecificRuleSet {
  ROTATION_90_ONLY = 1,
  SUM_ONLY = 2,
  COLOR_PROG_ONLY = 3,
  SUM_AND_ROTATION_90 = 4,
  SUM_AND_ROTATION_180 = 5,
  ROTATION_90_AND_COLOR = 6,
  SUM_COLOR_SHAPE = 7,
  PLACEHOLDER_FOR_ITEM_8 = 8,
  PLACEHOLDER_FOR_ITEM_9 = 9,
  PLACEHOLDER_FOR_ITEM_10 = 10,
  ORIGINAL_PT1_SUM_ROT = 11, // Re-alias for clarity in fallback pool
  ORIGINAL_PT2_SHAPE_COLOR = 12,
  ORIGINAL_PT3_COLOR_PRESENCE = 13,
}

const FALLBACK_PATTERN_POOL: ItemSpecificRuleSet[] = [
    ItemSpecificRuleSet.ORIGINAL_PT1_SUM_ROT,       // Sum + Rot 90
    ItemSpecificRuleSet.ORIGINAL_PT2_SHAPE_COLOR,   // Shape Prog + Color Prog
    ItemSpecificRuleSet.ORIGINAL_PT3_COLOR_PRESENCE,// Color Alt + Presence Toggle
    ItemSpecificRuleSet.SUM_AND_ROTATION_180,     // Sum + Rot 180 (Item 5 logic)
    ItemSpecificRuleSet.ROTATION_90_AND_COLOR,    // Rot 90 + Color Prog (Item 6 logic)
    ItemSpecificRuleSet.SUM_COLOR_SHAPE,          // Sum + Color Prog + Shape Prog (Item 7 logic)
];
const NUM_FALLBACK_PATTERNS = FALLBACK_PATTERN_POOL.length;

// --- SVG Generation Utilities ---
function getShapeSvg(shapeInstance: ShapeInstance, cellSize: number, count: number, rotation: number): string {
  let shapeElements = '';
  const displayCount = Math.max(0, count);
  if (displayCount === 0) return '';
  const shapesPerRowOrCol = Math.max(1, Math.ceil(Math.sqrt(displayCount)));
  const shapeSize = cellSize / (shapesPerRowOrCol * 1.2 + (shapesPerRowOrCol -1) * 0.2) ;
  const padding = shapeSize * 0.15;

  for (let i = 0; i < displayCount; i++) {
    const rowGrid = Math.floor(i / shapesPerRowOrCol);
    const colGrid = i % shapesPerRowOrCol;
    const x = (displayCount > 1) ? (colGrid * (shapeSize + padding)) + shapeSize / 2 + padding : cellSize / 2;
    const y = (displayCount > 1) ? (rowGrid * (shapeSize + padding)) + shapeSize / 2 + padding : cellSize / 2;
    switch (shapeInstance.type) {
      case ShapeType.CIRCLE: shapeElements += `<circle cx="${x}" cy="${y}" r="${shapeSize / 2}" fill="${shapeInstance.color}" />`; break;
      case ShapeType.SQUARE: shapeElements += `<rect x="${x - shapeSize / 2}" y="${y - shapeSize / 2}" width="${shapeSize}" height="${shapeSize}" fill="${shapeInstance.color}" />`; break;
      case ShapeType.TRIANGLE: const h = (Math.sqrt(3)/2)*shapeSize; shapeElements += `<polygon points="${x},${y-h/2} ${x-shapeSize/2},${y+h/2} ${x+shapeSize/2},${y+h/2}" fill="${shapeInstance.color}" />`; break;
      case ShapeType.STAR: const r1 = shapeSize/2, r2 = shapeSize/4; let p = ""; for (let k=0;k<5;k++) { p += `${x+r1*Math.cos(Math.PI/2+(2*Math.PI*k)/5)},${y-r1*Math.sin(Math.PI/2+(2*Math.PI*k)/5)} `; p += `${x+r2*Math.cos(Math.PI/2+(2*Math.PI*(k+0.5))/5)},${y-r2*Math.sin(Math.PI/2+(2*Math.PI*(k+0.5))/5)} `;} shapeElements += `<polygon points="${p.trim()}" fill="${shapeInstance.color}" />`; break;
    }
  }
  return `<g transform="rotate(${rotation} ${cellSize / 2} ${cellSize / 2})">${shapeElements}</g>`;
}

export function cellContentToSvg(content: CellContent, cellSize: number = CELL_SIZE): string {
  if (!content || !content.shapes || content.shapes.length === 0 || content.count <= 0 ) {
    return `<svg width="${cellSize}" height="${cellSize}" viewBox="0 0 ${cellSize} ${cellSize}" xmlns="http://www.w3.org/2000/svg"></svg>`;
  }
  const primaryShape = content.shapes[0];
  const svgContent = getShapeSvg(primaryShape, cellSize, content.count, content.baseRotationDegrees);
  return `<svg width="${cellSize}" height="${cellSize}" viewBox="0 0 ${cellSize} ${cellSize}" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`;
}

export function encodeSvgToBase64(svgString: string): string { if (typeof btoa === 'function') { return btoa(unescape(encodeURIComponent(svgString))); } else if (typeof Buffer === 'function') { return Buffer.from(svgString).toString('base64');} console.error('btoa function not available'); return '';}
let pseudoRandomState: number; let lastProcessedSeedForPrng: string | null = null; function seededRandom(s: string): () => number { if (s !== lastProcessedSeedForPrng) { let h=1779033703^s.length; for(let i=0;i<s.length;i++) {h=Math.imul(h^s.charCodeAt(i),3432918353);h=h<<13|h>>>19;} pseudoRandomState=h;lastProcessedSeedForPrng=s;} return function() {pseudoRandomState=Math.imul(pseudoRandomState^pseudoRandomState>>>16,2246822507);pseudoRandomState=Math.imul(pseudoRandomState^pseudoRandomState>>>13,3266489909);return(pseudoRandomState^=pseudoRandomState>>>16)>>>0;}}
function getRandomInt(r:()=>number,m:number,M:number):number{if(m>M)[m,M]=[M,m];if(m===M)return m; return(r()%(M-m+1))+m;}
function shuffleArray<T>(a:T[],r:()=>number):T[]{const A=[...a];for(let i=A.length-1;i>0;i--){const j=r()%(i+1);[A[i],A[j]]=[A[j],A[i]];}return A;}

function applyRotation(baseContent: CellContent, angleIncrement: 90 | 180): CellContent {
  return { ...baseContent, baseRotationDegrees: ((baseContent.baseRotationDegrees + angleIncrement) % 360) as (0 | 90 | 180 | 270), shapes: [{ ...baseContent.shapes[0] }], };
}
function applySum(baseContent: CellContent, increment: number): CellContent {
  return { ...baseContent, count: Math.max(0, baseContent.count + increment), shapes: [{ ...baseContent.shapes[0] }], };
}
function applyColorProgression(baseContent: CellContent, colorPalette: string[], step: number): CellContent {
  const newColorIndex = step % colorPalette.length;
  return { ...baseContent, shapes: [{ ...baseContent.shapes[0], color: colorPalette[newColorIndex] }], };
}
function applyShapeProgression(baseContent: CellContent, shapeCycle: ShapeType[], step: number): CellContent {
  const newShapeIndex = step % shapeCycle.length;
  return { ...baseContent, shapes: [{ ...baseContent.shapes[0], type: shapeCycle[newShapeIndex] }], };
}
function applyPresenceToggle(baseContent: CellContent, step: number): CellContent {
  return { ...baseContent, count: (step % 2 === 0) ? (baseContent.count > 0 ? baseContent.count : 1) : 0 };
}
function applyColorAlternation(baseContent:CellContent, cAlt: string[], step: number):CellContent {
  return {...baseContent, shapes: [{...baseContent.shapes[0], color: cAlt[step % cAlt.length]}]};
}

export function generateMatrixItemContent(difficultyLevel: number, itemGlobalIndex: number, seed?: string): GeneratedMatrixItem {
  const currentSeed = seed || self.crypto.randomUUID();
  const rng = seededRandom(currentSeed);
  const normalizedDifficulty = Math.max(1, Math.min(difficultyLevel, MAX_DIFFICULTY_LEVEL));

  let activeRuleSet: ItemSpecificRuleSet;
  let itemRuleDescription: string[];

  if (itemGlobalIndex < 10) {
    activeRuleSet = itemGlobalIndex + 1;
  } else {
    const typeIndex = (itemGlobalIndex - 10) % NUM_FALLBACK_PATTERNS;
    activeRuleSet = FALLBACK_PATTERN_POOL[typeIndex];
  }
  
  itemRuleDescription = ["Regola non specificata"];
  const matrix: CellContent[][] = Array(3).fill(null).map(() => Array(3).fill(null).map(() => ({ shapes: [{ type: ShapeType.CIRCLE, color: '#000000'}], count: 0, baseRotationDegrees: 0 })));
  let correctTargetContent: CellContent = { shapes: [{ type: ShapeType.CIRCLE, color: '#000000'}], count: 1, baseRotationDegrees: 0 };
  let options: CellContent[];
  const signature = (cc: CellContent) => `${cc.shapes[0]?.type}-${cc.shapes[0]?.color}-${cc.count}-${cc.baseRotationDegrees}-${activeRuleSet}`;

  switch (activeRuleSet) {
    case ItemSpecificRuleSet.ROTATION_90_ONLY:
      itemRuleDescription = ["Colonna: Rotazione 90°"];
      {
        const baseShapeType = ALL_SHAPE_TYPES[getRandomInt(rng,0,ALL_SHAPE_TYPES.length-1)];
        const baseColor = ALL_SHAPE_COLORS[getRandomInt(rng,0,ALL_SHAPE_COLORS.length-1)];
        const baseCount = 1;

        matrix[0][0] = { shapes: [{ type: baseShapeType, color: baseColor }], count: baseCount, baseRotationDegrees: 0 };
        matrix[0][1] = { ...matrix[0][0], shapes: [{type: ALL_SHAPE_TYPES[getRandomInt(rng,0,ALL_SHAPE_TYPES.length-1)], color: ALL_SHAPE_COLORS[getRandomInt(rng,0,ALL_SHAPE_COLORS.length-1)]}]};
        matrix[0][2] = { ...matrix[0][0], shapes: [{type: ALL_SHAPE_TYPES[getRandomInt(rng,0,ALL_SHAPE_TYPES.length-1)], color: ALL_SHAPE_COLORS[getRandomInt(rng,0,ALL_SHAPE_COLORS.length-1)]}]};

        matrix[1][0] = applyRotation(matrix[0][0], 90);
        matrix[1][1] = applyRotation(matrix[0][1], 90);
        matrix[1][2] = applyRotation(matrix[0][2], 90);

        matrix[2][0] = applyRotation(matrix[1][0], 90);
        matrix[2][1] = applyRotation(matrix[1][1], 90);
        correctTargetContent = applyRotation(matrix[1][2], 90);
        
        const dists:CellContent[]=[]; const usedSigs:Set<string>=new Set([signature(correctTargetContent)]); let att=0;
        while(dists.length<7&&att<100){att++; const dCell = JSON.parse(JSON.stringify(correctTargetContent));
          dCell.baseRotationDegrees = (dCell.baseRotationDegrees + getRandomInt(rng,1,2)*90)%360 as (0|90|180|270);
          if(dCell.baseRotationDegrees === correctTargetContent.baseRotationDegrees && [0,90,180,270].length > 1) continue;
          if(!usedSigs.has(signature(dCell))){dists.push(dCell);usedSigs.add(signature(dCell));}
        } options=[correctTargetContent,...dists.slice(0,7)];
      }
      break;

    case ItemSpecificRuleSet.SUM_ONLY:
      itemRuleDescription = ["Riga: Somma Unità"];
      {
        const baseShapeType = ALL_SHAPE_TYPES[getRandomInt(rng,0,ALL_SHAPE_TYPES.length-1)];
        const baseColor = ALL_SHAPE_COLORS[getRandomInt(rng,0,ALL_SHAPE_COLORS.length-1)];
        let baseCount, addDelta;
        switch(normalizedDifficulty){
            case 1: baseCount=getRandomInt(rng,1,3); addDelta=getRandomInt(rng,1,2); break;
            case 2: baseCount=getRandomInt(rng,2,4); addDelta=getRandomInt(rng,1,3); break;
            default: baseCount=getRandomInt(rng,3,5); addDelta=getRandomInt(rng,2,3); break;
        }
        addDelta = Math.max(1, addDelta); 

        matrix[0][0] = { shapes: [{ type: baseShapeType, color: baseColor }], count: baseCount, baseRotationDegrees: 0 };
        matrix[0][1] = applySum(matrix[0][0], addDelta);
        matrix[0][2] = applySum(matrix[0][1], addDelta);
        for(let r=1; r<3; ++r) { matrix[r][0] = {...matrix[0][0]}; matrix[r][1] = {...matrix[0][1]}; matrix[r][2] = {...matrix[0][2]}; }
        correctTargetContent = applySum(matrix[2][1], addDelta);
        if(correctTargetContent.count<=0)correctTargetContent.count=1;

        const dists:CellContent[]=[]; const usedSigs:Set<string>=new Set(correctTargetContent.count > 0 ? [signature(correctTargetContent)] : []); let att=0;
        while(dists.length<7&&att<100){att++; const dCell = JSON.parse(JSON.stringify(correctTargetContent));
          let wrongDelta = addDelta + (getRandomInt(rng,0,1)===0?1:-1); if(wrongDelta === addDelta || wrongDelta === 0) wrongDelta = addDelta + (addDelta > 1 ? -1 : 1) ; if (wrongDelta === 0) wrongDelta = 1;
          dCell.count = matrix[2][1].count + wrongDelta;
          if(dCell.count <= 0) dCell.count = 1;
          if(dCell.count === correctTargetContent.count && Math.abs(wrongDelta) !== Math.abs(addDelta)) continue;
          if(!usedSigs.has(signature(dCell))){dists.push(dCell);usedSigs.add(signature(dCell));}
        } options=[correctTargetContent,...dists.slice(0,7)];
      }
      break;

    case ItemSpecificRuleSet.COLOR_PROG_ONLY:
      itemRuleDescription = ["Riga: Progressione Colore"];
      {
        const baseShapeType = ALL_SHAPE_TYPES[getRandomInt(rng,0,ALL_SHAPE_TYPES.length-1)];
        let colorCycle: string[];
        const lenMins = [3,4,4], lenMaxs = [4,5,ALL_SHAPE_COLORS.length];
        const len = getRandomInt(rng, lenMins[normalizedDifficulty-1], lenMaxs[normalizedDifficulty-1]);
        colorCycle=shuffleArray(ALL_SHAPE_COLORS,rng).slice(0, Math.max(2,len));

        matrix[0][0] = { shapes: [{ type: baseShapeType, color: colorCycle[0] }], count: 1, baseRotationDegrees: 0 };
        matrix[0][1] = applyColorProgression(matrix[0][0], colorCycle, 1);
        matrix[0][2] = applyColorProgression(matrix[0][0], colorCycle, 2);
        for(let r=1; r<3; ++r) { matrix[r][0] = {...matrix[0][0]}; matrix[r][1] = {...matrix[0][1]}; matrix[r][2] = {...matrix[0][2]}; }
        correctTargetContent = applyColorProgression(matrix[2][0], colorCycle, 2);

        const dists:CellContent[]=[]; const usedSigs:Set<string>=new Set([signature(correctTargetContent)]); let att=0;
        while(dists.length<7&&att<100){att++; const dCell = JSON.parse(JSON.stringify(correctTargetContent));
            const wrongColorIndex = (colorCycle.indexOf(dCell.shapes[0].color) + getRandomInt(rng,1,colorCycle.length-1)) % colorCycle.length;
            if (colorCycle[wrongColorIndex] === dCell.shapes[0].color && colorCycle.length > 1) continue;
            dCell.shapes[0].color = colorCycle[wrongColorIndex];
          if(!usedSigs.has(signature(dCell))){dists.push(dCell);usedSigs.add(signature(dCell));}
        } options=[correctTargetContent,...dists.slice(0,7)];
      }
      break;
    
    case ItemSpecificRuleSet.SUM_AND_ROTATION_90: 
    case ItemSpecificRuleSet.ORIGINAL_PT1_SUM_ROT: 
      if (activeRuleSet === ItemSpecificRuleSet.SUM_AND_ROTATION_90) itemRuleDescription = ["Riga: Somma Unità", "Colonna: Rotazione 90°"];
      else itemRuleDescription = ["PT1: Riga Addizione, Colonna Rotazione 90°"];
      {
        let baseCount, addDelta, numAvShapes;
        switch(normalizedDifficulty){
            case 1: baseCount=getRandomInt(rng,1,3); addDelta=getRandomInt(rng,1,2); numAvShapes=getRandomInt(rng,2,3); break;
            case 2: baseCount=getRandomInt(rng,2,4); addDelta=getRandomInt(rng,1,3); numAvShapes=getRandomInt(rng,3,ALL_SHAPE_TYPES.length); break;
            default: baseCount=getRandomInt(rng,3,5); addDelta=getRandomInt(rng,2,3); numAvShapes=ALL_SHAPE_TYPES.length; break;
        }
        addDelta = Math.max(1, addDelta);
        const avShapes = shuffleArray(ALL_SHAPE_TYPES,rng).slice(0,numAvShapes);
        const baseShape=avShapes[getRandomInt(rng,0,avShapes.length-1)];
        const baseCol=ALL_SHAPE_COLORS[getRandomInt(rng,0,ALL_SHAPE_COLORS.length-1)];
        
        matrix[0][0]={shapes:[{type:baseShape,color:baseCol}],count:baseCount,baseRotationDegrees:0};
        matrix[0][1]=applySum(matrix[0][0],addDelta); matrix[0][2]=applySum(matrix[0][1],addDelta);
        matrix[1][0]=applyRotation(matrix[0][0],90);
        matrix[1][1]=applySum(matrix[1][0],addDelta); matrix[1][1].shapes[0].color = matrix[0][1].shapes[0].color;
        matrix[1][2]=applySum(matrix[1][1],addDelta); matrix[1][2].shapes[0].color = matrix[0][2].shapes[0].color;
        matrix[2][0]=applyRotation(matrix[1][0],90);
        matrix[2][1]=applySum(matrix[2][0],addDelta); matrix[2][1].shapes[0].color = matrix[0][1].shapes[0].color;

        correctTargetContent=applyRotation(matrix[1][2], 90);
        correctTargetContent.count = applySum(matrix[2][1], addDelta).count;
        if(correctTargetContent.count<=0)correctTargetContent.count=1;

        const dists:CellContent[]=[];const usedSigs:Set<string>=new Set(correctTargetContent.count>0?[signature(correctTargetContent)] : []); let att=0;
        while(dists.length<7&&att<100){att++;let d:CellContent; if(getRandomInt(rng,0,1)===0){let wd=addDelta+(getRandomInt(rng,0,1)===0?1:-1);if(wd===addDelta||wd==0)wd=addDelta+(addDelta>1?-1:1);if(wd==0)wd=1;d=applySum(matrix[2][1],wd);d.baseRotationDegrees=correctTargetContent.baseRotationDegrees;}else{const wr=((correctTargetContent.baseRotationDegrees+getRandomInt(rng,1,3)*90)%360)as(0|90|180|270); d = JSON.parse(JSON.stringify(correctTargetContent)); d.baseRotationDegrees=wr;} d.shapes=[{...correctTargetContent.shapes[0]}];if(d.count<=0)d.count=1;if(!usedSigs.has(signature(d))){dists.push(d);usedSigs.add(signature(d));}}
        options=[correctTargetContent,...dists.slice(0,7)];
      }
      break;

    case ItemSpecificRuleSet.SUM_AND_ROTATION_180: 
      itemRuleDescription = ["Riga: Somma Unità", "Colonna: Rotazione 180°"];
       { 
        let baseCount, addDelta, numAvShapes;
        switch(normalizedDifficulty){
            case 1: baseCount=getRandomInt(rng,1,3); addDelta=getRandomInt(rng,1,2); numAvShapes=getRandomInt(rng,2,3); break;
            case 2: baseCount=getRandomInt(rng,2,4); addDelta=getRandomInt(rng,1,3); numAvShapes=getRandomInt(rng,3,ALL_SHAPE_TYPES.length); break;
            default: baseCount=getRandomInt(rng,3,5); addDelta=getRandomInt(rng,2,3); numAvShapes=ALL_SHAPE_TYPES.length; break;
        }
        addDelta = Math.max(1, addDelta);
        const avShapes = shuffleArray(ALL_SHAPE_TYPES,rng).slice(0,numAvShapes);
        const baseShape=avShapes[getRandomInt(rng,0,avShapes.length-1)];
        const baseCol=ALL_SHAPE_COLORS[getRandomInt(rng,0,ALL_SHAPE_COLORS.length-1)];
        
        matrix[0][0]={shapes:[{type:baseShape,color:baseCol}],count:baseCount,baseRotationDegrees:0};
        matrix[0][1]=applySum(matrix[0][0],addDelta); matrix[0][2]=applySum(matrix[0][1],addDelta);
        matrix[1][0]=applyRotation(matrix[0][0],180);
        matrix[1][1]=applySum(matrix[1][0],addDelta); matrix[1][1].shapes[0].color = matrix[0][1].shapes[0].color;
        matrix[1][2]=applySum(matrix[1][1],addDelta); matrix[1][2].shapes[0].color = matrix[0][2].shapes[0].color;
        matrix[2][0]=applyRotation(matrix[1][0],180);
        matrix[2][1]=applySum(matrix[2][0],addDelta); matrix[2][1].shapes[0].color = matrix[0][1].shapes[0].color;
        
        correctTargetContent = applyRotation(matrix[1][2], 180);
        correctTargetContent.count = applySum(matrix[2][1], addDelta).count;
        if(correctTargetContent.count<=0)correctTargetContent.count=1;

        const dists:CellContent[]=[];const usedSigs:Set<string>=new Set(correctTargetContent.count>0?[signature(correctTargetContent)] : []); let att=0;
        while(dists.length<7&&att<100){att++;let d:CellContent; if(getRandomInt(rng,0,1)===0){let wd=addDelta+(getRandomInt(rng,0,1)===0?1:-1);if(wd===addDelta||wd==0)wd=addDelta+(addDelta>1?-1:1);if(wd==0)wd=1;d=applySum(matrix[2][1],wd);d.baseRotationDegrees=correctTargetContent.baseRotationDegrees;}else{const wr=((correctTargetContent.baseRotationDegrees+180)%360)as(0|90|180|270); d=JSON.parse(JSON.stringify(correctTargetContent)); d.baseRotationDegrees=wr;} d.shapes=[{...correctTargetContent.shapes[0]}];if(d.count<=0)d.count=1;if(!usedSigs.has(signature(d))){dists.push(d);usedSigs.add(signature(d));}}
        options=[correctTargetContent,...dists.slice(0,7)];
      }
      break;

    case ItemSpecificRuleSet.ROTATION_90_AND_COLOR: 
      itemRuleDescription = ["Riga: Progressione Colore", "Colonna: Rotazione 90°"];
      {
        const baseShapeType = ALL_SHAPE_TYPES[getRandomInt(rng,0,ALL_SHAPE_TYPES.length-1)];
        let colorCycle: string[];
        const lenMins = [3,4,4], lenMaxs = [4,5,ALL_SHAPE_COLORS.length]; 
        const len = getRandomInt(rng, lenMins[normalizedDifficulty-1], lenMaxs[normalizedDifficulty-1]);
        colorCycle=shuffleArray(ALL_SHAPE_COLORS,rng).slice(0, Math.max(2,len));

        matrix[0][0] = { shapes: [{ type: baseShapeType, color: colorCycle[0] }], count: 1, baseRotationDegrees: 0 };
        matrix[0][1] = applyColorProgression(matrix[0][0], colorCycle, 1);
        matrix[0][2] = applyColorProgression(matrix[0][0], colorCycle, 2);
        matrix[1][0] = applyRotation(matrix[0][0], 90);
        matrix[1][1] = applyColorProgression(matrix[1][0], colorCycle, 1);
        matrix[1][2] = applyColorProgression(matrix[1][0], colorCycle, 2);
        matrix[2][0] = applyRotation(matrix[1][0], 90);
        matrix[2][1] = applyColorProgression(matrix[2][0], colorCycle, 1);
        correctTargetContent = applyColorProgression(matrix[2][0], colorCycle, 2); 
        correctTargetContent.baseRotationDegrees = matrix[2][0].baseRotationDegrees; 

        const dists:CellContent[]=[];const usedSigs:Set<string>=new Set([signature(correctTargetContent)]); let att=0;
        while(dists.length<7&&att<100){att++; let d=JSON.parse(JSON.stringify(correctTargetContent)); if(getRandomInt(rng,0,1)===0){ const wri = (d.baseRotationDegrees + getRandomInt(rng,1,2)*90)%360 as (0|90|180|270); if(wri === d.baseRotationDegrees) continue; d.baseRotationDegrees = wri;} else { const wci = (colorCycle.indexOf(d.shapes[0].color) + getRandomInt(rng,1,colorCycle.length-1)) % colorCycle.length; if(colorCycle[wci] === d.shapes[0].color && colorCycle.length > 1) continue; d.shapes[0].color = colorCycle[wci];} if(!usedSigs.has(signature(d))){dists.push(d);usedSigs.add(signature(d));}}
        options=[correctTargetContent,...dists.slice(0,7)];
      }
      break;

    case ItemSpecificRuleSet.SUM_COLOR_SHAPE: 
      itemRuleDescription = ["Riga: Somma Unità", "Colonna: Progressione Forma", "Matrice: Progressione Colore"];
      {
        let baseCount, addDelta;
        let shapeCycleLen, colorCycleLen;

        switch(normalizedDifficulty){
            case 1: baseCount=1; addDelta=getRandomInt(rng,1,2); shapeCycleLen=getRandomInt(rng,2,3); colorCycleLen=getRandomInt(rng,3,4); break;
            case 2: baseCount=getRandomInt(rng,1,2); addDelta=getRandomInt(rng,1,2); shapeCycleLen=getRandomInt(rng,3,ALL_SHAPE_TYPES.length); colorCycleLen=getRandomInt(rng,4,5); break;
            default: baseCount=getRandomInt(rng,1,2); addDelta=2; shapeCycleLen=ALL_SHAPE_TYPES.length; colorCycleLen=getRandomInt(rng,5,ALL_SHAPE_COLORS.length); break;
        }
        addDelta = Math.max(1,addDelta);
        const shapeCycle = shuffleArray(ALL_SHAPE_TYPES, rng).slice(0, Math.max(2,shapeCycleLen));
        const colorCycle = shuffleArray(ALL_SHAPE_COLORS, rng).slice(0, Math.max(3,colorCycleLen));

        for(let r=0; r<3; ++r) {
            for (let c=0; c<3; ++c) {
                const currentShape = shapeCycle[r % shapeCycle.length];
                const currentCount = baseCount + (c * addDelta);
                const currentColor = colorCycle[(r*3 + c) % colorCycle.length];
                matrix[r][c] = { shapes: [{ type: currentShape, color: currentColor }], count: Math.max(1,currentCount), baseRotationDegrees: 0 };
            }
        }
        correctTargetContent = matrix[2][2]; 
        if(correctTargetContent.count<=0)correctTargetContent.count=1;

        const dists:CellContent[]=[];const usedSigs:Set<string>=new Set([signature(correctTargetContent)]); let att=0;
        while(dists.length<7&&att<100){att++; let d=JSON.parse(JSON.stringify(correctTargetContent));
            const ruleToBreak = getRandomInt(rng,0,2);
            if(ruleToBreak === 0) { let wd=addDelta+(getRandomInt(rng,0,1)===0?1:-1);if(wd===addDelta||wd==0)wd=addDelta+(addDelta>1?-1:1);if(wd==0)wd=1; d.count = (baseCount + (1 * addDelta)) + wd; if(d.count <=0) d.count = 1; }
            else if (ruleToBreak === 1) { const wsi = (shapeCycle.indexOf(d.shapes[0].type) + getRandomInt(rng,1,shapeCycle.length-1)) % shapeCycle.length; if(shapeCycle[wsi]===d.shapes[0].type && shapeCycle.length>1) continue; d.shapes[0].type = shapeCycle[wsi]; }
            else { const wci = (colorCycle.indexOf(d.shapes[0].color) + getRandomInt(rng,1,colorCycle.length-1)) % colorCycle.length; if(colorCycle[wci]===d.shapes[0].color && colorCycle.length>1) continue; d.shapes[0].color = colorCycle[wci]; }
            if(!usedSigs.has(signature(d))){dists.push(d);usedSigs.add(signature(d));}
        } options=[correctTargetContent,...dists.slice(0,7)];
      }
      break;
    
    case ItemSpecificRuleSet.PLACEHOLDER_FOR_ITEM_8:
      itemRuleDescription = ["Placeholder Item 8 (R+O non implementato). Usa: Progressione Forma e Colore."];
      {
        let shCycle:ShapeType[],coCycle:string[];
        const shLenMins = [3,3,ALL_SHAPE_TYPES.length], shLenMaxs = [4,ALL_SHAPE_TYPES.length,ALL_SHAPE_TYPES.length];
        const coLenMins = [3,3,4], coLenMaxs = [4,4,ALL_SHAPE_COLORS.length];
        const shLen = getRandomInt(rng, shLenMins[normalizedDifficulty-1],shLenMaxs[normalizedDifficulty-1]);
        const coLen = getRandomInt(rng, coLenMins[normalizedDifficulty-1], coLenMaxs[normalizedDifficulty-1]);
        shCycle=shuffleArray(ALL_SHAPE_TYPES,rng).slice(0,Math.max(2,shLen)); coCycle=shuffleArray(ALL_SHAPE_COLORS,rng).slice(0,Math.max(2,coLen));

        const initSh=shCycle[0];const initCo=coCycle[0];
        matrix[0][0]={shapes:[{type:initSh,color:initCo}],count:1,baseRotationDegrees:0};
        matrix[0][1]=applyShapeProgression(matrix[0][0],shCycle,1); matrix[0][2]=applyShapeProgression(matrix[0][1],shCycle,1);
        matrix[1][0]=applyColorProgression(matrix[0][0],coCycle,1); matrix[2][0]=applyColorProgression(matrix[1][0],coCycle,1);
        matrix[1][1]=applyShapeProgression(matrix[1][0],shCycle,1); matrix[1][1].shapes[0].color = applyColorProgression(matrix[0][1], coCycle,1).shapes[0].color;
        matrix[1][2]=applyShapeProgression(matrix[1][1],shCycle,1); matrix[1][2].shapes[0].color = applyColorProgression(matrix[0][2], coCycle,1).shapes[0].color;
        matrix[2][1]=applyShapeProgression(matrix[2][0],shCycle,1); matrix[2][1].shapes[0].color = applyColorProgression(matrix[1][1], coCycle,1).shapes[0].color;
        correctTargetContent=applyShapeProgression(matrix[2][1],shCycle,1); correctTargetContent.shapes[0].color=applyColorProgression(matrix[1][2],coCycle,1).shapes[0].color;
        const dists:CellContent[]=[];const usedSigs:Set<string>=new Set([signature(correctTargetContent)]); let att=0;
        while(dists.length<7&&att<100){att++;let d:CellContent=JSON.parse(JSON.stringify(correctTargetContent));if(getRandomInt(rng,0,1)===0){const wsi=(shCycle.indexOf(d.shapes[0].type)+getRandomInt(rng,1,shCycle.length-1))%shCycle.length;if(shCycle[wsi]===d.shapes[0].type&&shCycle.length>1)continue;d.shapes[0].type=shCycle[wsi];}else{const wci=(coCycle.indexOf(d.shapes[0].color)+getRandomInt(rng,1,coCycle.length-1))%coCycle.length;if(coCycle[wci]===d.shapes[0].color&&coCycle.length>1)continue;d.shapes[0].color=coCycle[wci];} if(!usedSigs.has(signature(d))){dists.push(d);usedSigs.add(signature(d));}}
        options=[correctTargetContent,...dists.slice(0,7)];
      }
      break;

    case ItemSpecificRuleSet.PLACEHOLDER_FOR_ITEM_9:
      itemRuleDescription = ["Placeholder Item 9 (S+X+Sz non implementato). Usa: Alternanza Colore/Presenza."];
      {
        let altColors: string[]; let baseShapePt3 = ALL_SHAPE_TYPES[getRandomInt(rng,0,ALL_SHAPE_TYPES.length-1)]; 
        const altColorsLenMins = [2,3,3], altColorsLenMaxs = [3,4,getRandomInt(rng,3,4)];
        const altLen = getRandomInt(rng, altColorsLenMins[normalizedDifficulty-1], altColorsLenMaxs[normalizedDifficulty-1]);
        altColors = shuffleArray(ALL_SHAPE_COLORS, rng).slice(0,Math.max(2,altLen));

        matrix[0][0] = { shapes: [{ type: baseShapePt3, color: altColors[0] }], count: 1, baseRotationDegrees: 0 };
        matrix[0][1] = applyColorAlternation(matrix[0][0], altColors, 1); matrix[0][2] = applyColorAlternation(matrix[0][0], altColors, 2);
        matrix[1][0] = applyPresenceToggle(matrix[0][0], 1); matrix[1][0].shapes = [{...matrix[0][0].shapes[0]}];
        matrix[2][0] = applyPresenceToggle(matrix[0][0], 2); matrix[2][0].shapes = [{...matrix[0][0].shapes[0]}];
        matrix[1][1] = applyColorAlternation(matrix[1][0], altColors, 1); matrix[1][1] = applyPresenceToggle(matrix[1][1],1);
        matrix[1][2] = applyColorAlternation(matrix[1][0], altColors, 2); matrix[1][2] = applyPresenceToggle(matrix[1][2],1);
        matrix[2][1] = applyColorAlternation(matrix[2][0], altColors, 1); matrix[2][1] = applyPresenceToggle(matrix[2][1],2);
        correctTargetContent = applyColorAlternation(matrix[2][0], altColors, 2); correctTargetContent = applyPresenceToggle(correctTargetContent,2);
        if(correctTargetContent.count === 0 && matrix[0][0].count > 0) correctTargetContent.shapes = [{...matrix[0][0].shapes[0]}]; 
        else if(correctTargetContent.count > 0 && matrix[0][0].count === 0 ) correctTargetContent.shapes = [{...matrix[2][0].shapes[0], color: altColors[2%altColors.length]}];

        const dists:CellContent[]=[]; const usedSigs:Set<string>=new Set([signature(correctTargetContent)]); let att=0;
        while(dists.length<7&&att<100){att++; let d:CellContent=JSON.parse(JSON.stringify(correctTargetContent)); if(getRandomInt(rng,0,1)===0){ const wrongColorIndex = (altColors.indexOf(d.shapes[0].color) + getRandomInt(rng,1,altColors.length-1)) % altColors.length; d.shapes[0].color = altColors[wrongColorIndex]; if(d.shapes[0].color === correctTargetContent.shapes[0].color && altColors.length > 1) continue; }else{ d.count = correctTargetContent.count > 0 ? 0 : (matrix[0][0].count > 0 ? matrix[0][0].count : 1) ; if(d.count > 0) d.shapes = [{...correctTargetContent.shapes[0]}];} if(!usedSigs.has(signature(d))){dists.push(d);usedSigs.add(signature(d));}}
        options = [correctTargetContent, ...dists.slice(0,7)];
      }
      break;

    case ItemSpecificRuleSet.PLACEHOLDER_FOR_ITEM_10:
      itemRuleDescription = ["Placeholder Item 10 (R+S+C+M non implementato). Usa: Somma e Rotazione."];
      {
        let baseCount, addDelta, numAvShapes;
        switch(normalizedDifficulty){
            case 1: baseCount=getRandomInt(rng,1,3); addDelta=getRandomInt(rng,1,2); numAvShapes=getRandomInt(rng,2,3); break;
            case 2: baseCount=getRandomInt(rng,2,4); addDelta=getRandomInt(rng,1,3); numAvShapes=getRandomInt(rng,3,ALL_SHAPE_TYPES.length); break;
            default: baseCount=getRandomInt(rng,3,5); addDelta=getRandomInt(rng,2,3); numAvShapes=ALL_SHAPE_TYPES.length; break;
        }
        addDelta = Math.max(1, addDelta);
        const avShapes = shuffleArray(ALL_SHAPE_TYPES,rng).slice(0,numAvShapes);
        const baseShape=avShapes[getRandomInt(rng,0,avShapes.length-1)];
        const baseCol=ALL_SHAPE_COLORS[getRandomInt(rng,0,ALL_SHAPE_COLORS.length-1)];
        matrix[0][0]={shapes:[{type:baseShape,color:baseCol}],count:baseCount,baseRotationDegrees:0}; matrix[0][1]=applySum(matrix[0][0],addDelta); matrix[0][2]=applySum(matrix[0][1],addDelta);
        matrix[1][0]=applyRotation(matrix[0][0],90); matrix[1][1]=applySum(matrix[1][0],addDelta); matrix[1][1].shapes[0].color = matrix[0][1].shapes[0].color; matrix[1][2]=applySum(matrix[1][1],addDelta); matrix[1][2].shapes[0].color = matrix[0][2].shapes[0].color;
        matrix[2][0]=applyRotation(matrix[1][0],90); matrix[2][1]=applySum(matrix[2][0],addDelta); matrix[2][1].shapes[0].color = matrix[0][1].shapes[0].color;
        correctTargetContent=applyRotation(matrix[1][2], 90); correctTargetContent.count = applySum(matrix[2][1], addDelta).count; if(correctTargetContent.count<=0)correctTargetContent.count=1;
        const dists:CellContent[]=[];const usedSigs:Set<string>=new Set(correctTargetContent.count>0?[signature(correctTargetContent)] : []); let att=0;
        while(dists.length<7&&att<100){att++;let d:CellContent; if(getRandomInt(rng,0,1)===0){let wd=addDelta+(getRandomInt(rng,0,1)===0?1:-1);if(wd===addDelta||wd==0)wd=addDelta+(addDelta>1?-1:1);if(wd==0)wd=1;d=applySum(matrix[2][1],wd);d.baseRotationDegrees=correctTargetContent.baseRotationDegrees;}else{const wr=((correctTargetContent.baseRotationDegrees+getRandomInt(rng,1,3)*90)%360)as(0|90|180|270); d = JSON.parse(JSON.stringify(correctTargetContent)); d.baseRotationDegrees=wr;} d.shapes=[{...correctTargetContent.shapes[0]}];if(d.count<=0)d.count=1;if(!usedSigs.has(signature(d))){dists.push(d);usedSigs.add(signature(d));}}
        options=[correctTargetContent,...dists.slice(0,7)];
      }
      break;

    case ItemSpecificRuleSet.ORIGINAL_PT2_SHAPE_COLOR: 
      itemRuleDescription = ["PT2: Riga Progressione Figura, Colonna Progressione Colore"];
      { 
        let shCycle:ShapeType[],coCycle:string[];
        const shLenMins = [3,3,ALL_SHAPE_TYPES.length], shLenMaxs = [4,ALL_SHAPE_TYPES.length,ALL_SHAPE_TYPES.length];
        const coLenMins = [3,3,4], coLenMaxs = [4,4,ALL_SHAPE_COLORS.length];
        const shLen = getRandomInt(rng, shLenMins[normalizedDifficulty-1],shLenMaxs[normalizedDifficulty-1]);
        const coLen = getRandomInt(rng, coLenMins[normalizedDifficulty-1], coLenMaxs[normalizedDifficulty-1]);
        shCycle=shuffleArray(ALL_SHAPE_TYPES,rng).slice(0,Math.max(2,shLen)); coCycle=shuffleArray(ALL_SHAPE_COLORS,rng).slice(0,Math.max(2,coLen));
        const initSh=shCycle[0];const initCo=coCycle[0];
        matrix[0][0]={shapes:[{type:initSh,color:initCo}],count:1,baseRotationDegrees:0};
        matrix[0][1]=applyShapeProgression(matrix[0][0],shCycle,1); matrix[0][2]=applyShapeProgression(matrix[0][1],shCycle,1);
        matrix[1][0]=applyColorProgression(matrix[0][0],coCycle,1); matrix[2][0]=applyColorProgression(matrix[1][0],coCycle,1);
        matrix[1][1]=applyShapeProgression(matrix[1][0],shCycle,1); matrix[1][1].shapes[0].color = applyColorProgression(matrix[0][1], coCycle,1).shapes[0].color;
        matrix[1][2]=applyShapeProgression(matrix[1][1],shCycle,1); matrix[1][2].shapes[0].color = applyColorProgression(matrix[0][2], coCycle,1).shapes[0].color;
        matrix[2][1]=applyShapeProgression(matrix[2][0],shCycle,1); matrix[2][1].shapes[0].color = applyColorProgression(matrix[1][1], coCycle,1).shapes[0].color;
        correctTargetContent=applyShapeProgression(matrix[2][1],shCycle,1); correctTargetContent.shapes[0].color=applyColorProgression(matrix[1][2],coCycle,1).shapes[0].color;
        const dists:CellContent[]=[];const usedSigs:Set<string>=new Set([signature(correctTargetContent)]); let att=0;
        while(dists.length<7&&att<100){att++;let d:CellContent=JSON.parse(JSON.stringify(correctTargetContent));if(getRandomInt(rng,0,1)===0){const wsi=(shCycle.indexOf(d.shapes[0].type)+getRandomInt(rng,1,shCycle.length-1))%shCycle.length;if(shCycle[wsi]===d.shapes[0].type&&shCycle.length>1)continue;d.shapes[0].type=shCycle[wsi];}else{const wci=(coCycle.indexOf(d.shapes[0].color)+getRandomInt(rng,1,coCycle.length-1))%coCycle.length;if(coCycle[wci]===d.shapes[0].color&&coCycle.length>1)continue;d.shapes[0].color=coCycle[wci];} if(!usedSigs.has(signature(d))){dists.push(d);usedSigs.add(signature(d));}}
        options=[correctTargetContent,...dists.slice(0,7)];
      }
      break;

    case ItemSpecificRuleSet.ORIGINAL_PT3_COLOR_PRESENCE: 
      itemRuleDescription = ["PT3: Riga Alternanza Colore, Colonna Alternanza Presenza"];
      { 
        let altColors: string[]; let baseShapePt3 = ALL_SHAPE_TYPES[getRandomInt(rng,0,ALL_SHAPE_TYPES.length-1)];
        const altColorsLenMins = [2,3,3], altColorsLenMaxs = [3,4,getRandomInt(rng,3,4)];
        const altLen = getRandomInt(rng, altColorsLenMins[normalizedDifficulty-1], altColorsLenMaxs[normalizedDifficulty-1]);
        altColors = shuffleArray(ALL_SHAPE_COLORS, rng).slice(0,Math.max(2,altLen));
        matrix[0][0] = { shapes: [{ type: baseShapePt3, color: altColors[0] }], count: 1, baseRotationDegrees: 0 };
        matrix[0][1] = applyColorAlternation(matrix[0][0], altColors, 1); matrix[0][2] = applyColorAlternation(matrix[0][0], altColors, 2);
        matrix[1][0] = applyPresenceToggle(matrix[0][0], 1); matrix[1][0].shapes = [{...matrix[0][0].shapes[0]}];
        matrix[2][0] = applyPresenceToggle(matrix[0][0], 2); matrix[2][0].shapes = [{...matrix[0][0].shapes[0]}];
        matrix[1][1] = applyColorAlternation(matrix[1][0], altColors, 1); matrix[1][1] = applyPresenceToggle(matrix[1][1],1);
        matrix[1][2] = applyColorAlternation(matrix[1][0], altColors, 2); matrix[1][2] = applyPresenceToggle(matrix[1][2],1);
        matrix[2][1] = applyColorAlternation(matrix[2][0], altColors, 1); matrix[2][1] = applyPresenceToggle(matrix[2][1],2);
        correctTargetContent = applyColorAlternation(matrix[2][0], altColors, 2); correctTargetContent = applyPresenceToggle(correctTargetContent,2);
        if(correctTargetContent.count === 0 && matrix[0][0].count > 0) correctTargetContent.shapes = [{...matrix[0][0].shapes[0]}];
        else if(correctTargetContent.count > 0 && matrix[0][0].count === 0 ) correctTargetContent.shapes = [{...matrix[2][0].shapes[0], color: altColors[2%altColors.length]}];
        const dists:CellContent[]=[]; const usedSigs:Set<string>=new Set([signature(correctTargetContent)]); let att=0;
        while(dists.length<7&&att<100){att++; let d:CellContent=JSON.parse(JSON.stringify(correctTargetContent)); if(getRandomInt(rng,0,1)===0){ const wrongColorIndex = (altColors.indexOf(d.shapes[0].color) + getRandomInt(rng,1,altColors.length-1)) % altColors.length; d.shapes[0].color = altColors[wrongColorIndex]; if(d.shapes[0].color === correctTargetContent.shapes[0].color && altColors.length > 1) continue; }else{ d.count = correctTargetContent.count > 0 ? 0 : (matrix[0][0].count > 0 ? matrix[0][0].count : 1) ; if(d.count > 0) d.shapes = [{...correctTargetContent.shapes[0]}];} if(!usedSigs.has(signature(d))){dists.push(d);usedSigs.add(signature(d));}}
        options = [correctTargetContent, ...dists.slice(0,7)];
      }
      break;

    default:
      console.error("Unknown activeRuleSet or fallthrough error:", activeRuleSet);
      itemRuleDescription = ["Errore: Regola Sconosciuta implementata"];
      matrix[0][0]={shapes:[{type:ShapeType.CIRCLE,color:ALL_SHAPE_COLORS[0]}],count:1,baseRotationDegrees:0};
      for(let r_idx=0; r_idx<3; ++r_idx) for(let c_idx=0; c_idx<3; ++c_idx) if(!(r_idx===0 && c_idx===0)) matrix[r_idx][c_idx] = {...matrix[0][0]};
      correctTargetContent = {...matrix[0][0]};
      options = [correctTargetContent];
      break;
  }

  const finalMatrixCells = [ matrix[0][0], matrix[0][1], matrix[0][2], matrix[1][0], matrix[1][1], matrix[1][2], matrix[2][0], matrix[2][1], ];
  options = shuffleArray(options, rng);
  let foundCorrectIndex = options.findIndex(opt => signature(opt) === signature(correctTargetContent));

  if(foundCorrectIndex===-1){
    const optIndexToReplace = options.length > 0 ? rng() % options.length : 0;
    if(options.length < 8) options.push(correctTargetContent);
    else options[optIndexToReplace]=correctTargetContent;
    options=shuffleArray(options,rng);
    foundCorrectIndex=options.findIndex(opt=>signature(opt)===signature(correctTargetContent));
    if(foundCorrectIndex===-1) foundCorrectIndex=0;
  }
  let fillAttempts = 0;
  while(options.length < 8 && fillAttempts < 50) { // Limit attempts to prevent infinite loops
    const dummyShapeType = ALL_SHAPE_TYPES[getRandomInt(rng, 0, ALL_SHAPE_TYPES.length -1)];
    const dummyColor = ALL_SHAPE_COLORS[getRandomInt(rng, 0, ALL_SHAPE_COLORS.length -1)];
    const dummyOption: CellContent = {shapes: [{type: dummyShapeType, color: dummyColor}], count:getRandomInt(rng,1,3), baseRotationDegrees:(getRandomInt(rng,0,3)*90)as(0|90|180|270)};
    if(!options.find(opt => signature(opt) === signature(dummyOption))) { 
        options.push(dummyOption); 
    }
    fillAttempts++;
  }
   // If still not 8, fill with simple unique options or duplicates if necessary
  while(options.length < 8){
      const dummyShapeType = ALL_SHAPE_TYPES[options.length % ALL_SHAPE_TYPES.length];
      const dummyColor = ALL_SHAPE_COLORS[options.length % ALL_SHAPE_COLORS.length];
      options.push({shapes: [{type: dummyShapeType, color: dummyColor}], count:1, baseRotationDegrees:0});
  }

  options = options.slice(0,8);
  // Final check to ensure correct option is present
  if (options.findIndex(opt => signature(opt) === signature(correctTargetContent)) === -1) { 
    options[rng() % options.length] = correctTargetContent; 
    options = shuffleArray(options,rng); // Re-shuffle if we had to force it in
    foundCorrectIndex = options.findIndex(opt => signature(opt) === signature(correctTargetContent));
    if(foundCorrectIndex === -1) foundCorrectIndex = 0; // Ultimate fallback
  }


  return {
    matrixCellContents: finalMatrixCells,
    optionCellContents: options,
    correctOptionIndex: foundCorrectIndex,
    seed: currentSeed,
    difficultyLevelUsed: normalizedDifficulty,
    rulesInEffect: { patternType: activeRuleSet, description: itemRuleDescription } 
  };
}

export function generateFullMatrixItem(difficultyLevel: number, itemGlobalIndex: number, seed?: string): GeneratedItemWithBase64 {
  const itemContent = generateMatrixItemContent(difficultyLevel, itemGlobalIndex, seed);
  
  // Initialize rng for jitter calculation using the item's seed
  const rngForJitter = seededRandom(itemContent.seed); 

  const matrixCellsBase64 = itemContent.matrixCellContents.map(content => encodeSvgToBase64(cellContentToSvg(content, CELL_SIZE)));
  const optionsBase64 = itemContent.optionCellContents.map(content => encodeSvgToBase64(cellContentToSvg(content, CELL_SIZE)));
  
  let diffEst = 0.2 + (itemContent.difficultyLevelUsed-1)*0.15;
  if (itemContent.rulesInEffect.patternType <= 10) { 
    diffEst += itemContent.rulesInEffect.patternType * 0.025; 
  } else { 
    diffEst += ( (itemContent.rulesInEffect.patternType - 10) * 0.05); 
  }
  
  // Corrected jitter calculation
  const randomFloatForJitter = rngForJitter() / Math.pow(2,32); // Produces a float between 0 and 1
  const jitterValue = randomFloatForJitter * 0.1 - 0.05; // Jitter between -0.05 and +0.05
  diffEst = Math.min(0.95, Math.max(0.1, diffEst + jitterValue)); 

  return {
    matrixCellsBase64, optionsBase64, correctOptionIndex:itemContent.correctOptionIndex, seed:itemContent.seed,
    rules:itemContent.rulesInEffect.description, difficultyEstimate:parseFloat(diffEst.toFixed(2)), 
    difficultyLevelUsed:itemContent.difficultyLevelUsed, patternTypeUsed: itemContent.rulesInEffect.patternType,
    creationTimestamp:new Date().toISOString(), renderEngine:"SVG-v2.2-DiffScaledJitterFix", 
  };
}
