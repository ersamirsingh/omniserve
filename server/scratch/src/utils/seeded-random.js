/**
 * Mulberry32 seeded random number generator.
 * Produces a pseudo-random number between [0, 1).
 */
export function createSeededRandom(seed) {
    return function () {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
export class SeededRandomHelper {
    rand;
    constructor(seed) {
        // If no seed is provided, fallback to standard Math.random
        if (seed === undefined || seed === null) {
            this.rand = Math.random;
        }
        else {
            this.rand = createSeededRandom(seed);
        }
    }
    /**
     * Returns a random float between [min, max)
     */
    nextFloat(min = 0, max = 1) {
        return this.rand() * (max - min) + min;
    }
    /**
     * Returns a random integer between [min, max] (inclusive)
     */
    nextInt(min, max) {
        return Math.floor(this.nextFloat(min, max + 1));
    }
    /**
     * Picks a random element from an array
     */
    pick(arr) {
        if (!arr || arr.length === 0)
            return undefined;
        const idx = this.nextInt(0, arr.length - 1);
        return arr[idx];
    }
    /**
     * Selects a random index based on cumulative weights.
     * weights: array of numbers representing the relative probability.
     */
    pickWeightedIndex(weights) {
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
    /**
     * Picks a random item from an array of choices with weights.
     * e.g. pickWeighted([{item: 'A', weight: 10}, {item: 'B', weight: 90}])
     */
    pickWeighted(choices) {
        const weights = choices.map((c) => c.weight);
        const idx = this.pickWeightedIndex(weights);
        const choice = choices[idx];
        if (choice) {
            return choice.item;
        }
        return choices[0].item;
    }
}
