/**
 * @manasdb/mcp-server
 * Type declarations for use as an importable module.
 */

/** Configuration for a single database provider */
export interface DatabaseConfig {
  type: 'mongodb' | 'postgres' | string;
  uri: string;
  dbName?: string;
}

/** Model configuration for embedding provider */
export interface ModelConfig {
  source: 'transformers' | 'gemini' | 'openai' | 'ollama' | string;
  model?: string;
  apiKey?: string;
}

/** Full ManasDB MCP Server configuration (mirrors @manasdb/core ManasDB constructor) */
export interface ManasDBMCPConfig {
  databases?: DatabaseConfig[];
  uri?: string;
  dbName?: string;
  projectName?: string;
  modelConfig?: ModelConfig;
  telemetry?: boolean;
  debug?: boolean;
}

/** Result entry returned by the recall tool */
export interface RecallResult {
  contentId: string;
  text: string;
  score: number;
  database: string;
  tags?: string[];
  metadata?: {
    matchedChunk?: string;
    sectionTitle?: string;
    healedContext?: boolean;
  };
}
