import { SwiggySimulator } from "./swiggy.simulator.js";
import { ZomatoSimulator } from "./zomato.simulator.js";
import { WebsiteSimulator } from "./website.simulator.js";
import { QrSimulator } from "./qr.simulator.js";
class Registry {
    providers = new Map();
    constructor() {
        this.register(new SwiggySimulator());
        this.register(new ZomatoSimulator());
        this.register(new WebsiteSimulator());
        this.register(new QrSimulator());
    }
    register(provider) {
        this.providers.set(provider.provider.toUpperCase(), provider);
    }
    get(name) {
        return this.providers.get(name.toUpperCase());
    }
    getRegisteredProviders() {
        return Array.from(this.providers.keys());
    }
}
export const SimulatorRegistry = new Registry();
export default SimulatorRegistry;
