#!/usr/bin/env node
/**
 * CLI Router
 * Allows `npx @manasdb/mcp-server` and `npx @manasdb/mcp-server setup`.
 */

const args = process.argv.slice(2);

if (args[0] === 'setup') {
  // Remove the 'setup' arg and forward to the setup script
  process.argv.splice(2, 1);
  await import('./setup.js');
} else {
  // Default: start the MCP server
  await import('./index.js');
}
