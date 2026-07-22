
export function createSeededRandom(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class SeededRandomHelper {
  private rand: () => number;

  constructor(seed?: number) {

    if (seed === undefined || seed === null) {
      this.rand = Math.random;
    } else {
      this.rand = createSeededRandom(seed);
    }
  }

  nextFloat(min = 0, max = 1): number {
    return this.rand() * (max - min) + min;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.nextFloat(min, max + 1));
  }

  pick<T>(arr: T[]): T {
    if (!arr || arr.length === 0) return undefined as any;
    const idx = this.nextInt(0, arr.length - 1);
    return arr[idx] as T;
  }

  pickWeightedIndex(weights: number[]): number {
    const totalWeight = weights.reduce((acc, w) => acc + w, 0);
    let r = this.nextFloat(0, totalWeight);
    for (let i = 0; i < weights.length; i++) {
      const w = weights[i];
      if (w !== undefined) {
        if (r < w) {
          return i;
        }
        r -= w;
      }
    }
    return weights.length - 1;
  }

  pickWeighted<T>(choices: Array<{ item: T; weight: number }>): T {
    const weights = choices.map((c) => c.weight);
    const idx = this.pickWeightedIndex(weights);
    const choice = choices[idx];
    if (choice) {
      return choice.item;
    }
    return choices[0]!.item;
  }
}
