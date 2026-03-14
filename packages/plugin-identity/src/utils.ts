import { existsSync, readFileSync, writeFileSync } from "fs";

const REGISTRY_FILE = ".agent-registry.json";

export function loadAgentRegistry(): Record<string, any> {
  try {
    if (existsSync(REGISTRY_FILE)) {
      return JSON.parse(readFileSync(REGISTRY_FILE, "utf-8"));
    }
  } catch (err: any) {
    console.error(`Failed to load agent registry: ${err.message}`);
  }
  return {};
}

export function saveAgentRegistry(registry: Record<string, any>): void {
  try {
    writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2), "utf-8");
  } catch (err: any) {
    console.error(`Failed to save agent registry: ${err.message}`);
  }
}
