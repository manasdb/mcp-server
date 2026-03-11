#!/usr/bin/env node

/**
 * A simple interactive script to generate the Claude Desktop config or command line arguments
 * for the ManasDB MCP Server.
 */

import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// __dirname is pointing to dist/ where both setup.js and index.js exist
const indexPath = path.resolve(__dirname, 'index.js').replace(/\\/g, '/');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("=========================================");
console.log("   ManasDB MCP Server Config Generator   ");
console.log("=========================================\n");

const config: any = {};

rl.question('1. Project Name [default: manasdb_mcp]: ', (projectName) => {
  if (projectName) config.projectName = projectName;

  rl.question('2. MongoDB URI (leave empty to skip): ', (mongoUri) => {
    rl.question('3. PostgreSQL URI (leave empty to skip): ', (pgUri) => {
      
      const databases = [];
      if (mongoUri) databases.push({ type: 'mongodb', uri: mongoUri });
      if (pgUri) databases.push({ type: 'postgres', uri: pgUri });
      
      if (databases.length > 0) {
        config.databases = databases;
      }

      console.log('\n--- Embedding Model Configuration ---');
      console.log('Available sources: transformers, gemini, openai, ollama');
      rl.question('4. Model Source [default: transformers]: ', (source) => {
        const modelSource = source.trim() || 'transformers';
        const modelConfig: any = { source: modelSource };

        rl.question(`5. Model Name (e.g. nomic-embed-text:latest for ollama) [leave empty to skip]: `, (modelName) => {
          if (modelName.trim()) modelConfig.model = modelName.trim();
          config.modelConfig = modelConfig;

          // Note on API Keys: API keys (like gemini or openai) should ideally be set in your system's
          // environment variables to avoid exposing them inside plain-text JSON configs!
          if (['gemini', 'openai'].includes(modelSource)) {
             console.log(`\n[WARNING] For ${modelSource}, remember to set your ${modelSource.toUpperCase()}_API_KEY as an environment variable in Claude/Cursor or your system!\n`);
          }

          rl.question('6. Enable Telemetry? (Y/n) [default: Y]: ', (telemetry) => {
            if (telemetry.toLowerCase() === 'n') config.telemetry = false;
            
            console.log("\n=========================================");
            console.log("Generated Configuration Payload:");
            console.log("=========================================\n");
            const jsonString = JSON.stringify(config);
            console.log(jsonString);
            
            console.log("\n\n-- Example standard execution parameter:");
            console.log(`--manas-config='${jsonString}'\n`);
            
            console.log("-- claude_desktop_config.json Snippet --");
            const claudeSnippet = {
              mcpServers: {
                manasdb: {
                  command: "node",
                  args: [
                    indexPath,
                    `--manas-config=${jsonString}`
                  ],
                  env: {
                    // Provide an example environment variable if they chose a hosted source
                    ...(['gemini', 'openai'].includes(modelSource) ? { [`${modelSource.toUpperCase()}_API_KEY`]: "YOUR_API_KEY_HERE" } : {})
                  }
                }
              }
            };
            console.log(JSON.stringify(claudeSnippet, null, 2));

            rl.close();
          });
        });
      });
    });
  });
});

