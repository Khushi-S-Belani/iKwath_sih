export interface KwathaRecipe {
  id: string;
  name: string;
  tag: string;
  category: string;
  afiCode: string;
  yavakutaCurana: string[];
  coarsePowderDose?: string;
  waterQuantityMl: number | string;
  reductionTargetMl: number | string;
  boilTempRange: string;
  prepTimeMin: number | string;
  servingTemp: string;
  consistencyScore: number;
}

export type ScreenIndex = 0 | 1 | 2 | 3;
