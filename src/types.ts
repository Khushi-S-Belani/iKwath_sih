export interface KwathaRecipe {
  id: string;
  name: string;
  tag: string;
  category: string;
  afiCode: string;
  yavakutaCurana: string[];
  waterQuantityMl: number;
  reductionTargetMl: number;
  boilTempRange: string;
  prepTimeMin: number;
  servingTemp: string;
  consistencyScore: number;
}

export type ScreenIndex = 0 | 1 | 2 | 3;
