/**
 * Main application class for benchmark file operations
 * Demonstrates TypeScript class structure and methods
 */
export class BenchmarkApp {
  private name: string;
  private version: string;

  constructor(name: string, version: string = '1.0.0') {
    this.name = name;
    this.version = version;
  }

  /**
   * Get the application name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get the application version
   */
  getVersion(): string {
    return this.version;
  }

  /**
   * Initialize the application
   */
  initialize(): void {
    console.log(`Initializing ${this.name} v${this.version}`);
  }
}
