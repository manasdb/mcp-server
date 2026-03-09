#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import pkg from "@manasdb/core";
const { ManasDB } = pkg as any;

// Redirect all standard console output to stderr.
// MCP clients expect strictly JSON-RPC on stdout. Any random
// console.log from underlying libraries will crash the parser.
const originalConsoleLog = console.log;
console.log = function (...args) {
  console.error(...args);
};

// 1. Read config from environment variables
let configStr = process.env.MANAS_DB_CONFIG;

// Support dynamic overrides via explicit command-line flags
// Example usage: node dist/index.js --manas-config='[{"type":"mongodb"}]'
const configArg = process.argv.find(arg => arg.startsWith('--manas-config='));
if (configArg) {
  const extractedValue = configArg.split(/--manas-config=(.*)/s)[1];
  if (extractedValue) {
    configStr = extractedValue;
  }
}

if (!configStr) {
  console.error("Missing Database Configuration.");
  console.error("Please provide a JSON array via the MANAS_DB_CONFIG environment variable OR the --manas-config command-line flag.");
  process.exit(1);
}

let configPayload: any;
try {
  configPayload = JSON.parse(configStr);
} catch (error) {
  console.error("Failed to parse configuration JSON:", error);
  process.exit(1);
}

// Support both the direct array for databases, or a full ManasDB config object
if (Array.isArray(configPayload)) {
  configPayload = { databases: configPayload };
}

// 2. Initialize ManasDB with the generic payload
const manasdb = new ManasDB(configPayload);

// 3. Create MCP Server
const server = new Server(
  {
    name: "manasdb-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define Schemas
const MemorizeSchema = z.object({
  text: z.string().describe("The text content to memorize and store in ManasDB"),
});

const RecallSchema = z.object({
  query: z.string().describe("The query to search for related context across databases"),
});

const ForgetSchema = z.object({
  contentId: z.string().describe("The exact contentId (document ID) returned by memorize to permanently delete from all databases."),
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "memorize",
        description: "Absorb and store new information into ManasDB memory",
        inputSchema: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "The text content to memorize",
            },
          },
          required: ["text"],
        },
      },
      {
        name: "recall",
        description: "Recall related context from ManasDB memory (deduplicated across configured providers)",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The topic or question to query in memory",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "forget",
        description: "Permanently delete a memory from all ManasDB databases using its contentId. The contentId is returned when memorize is called. Use recall first to find the contentId of what you want to forget.",
        inputSchema: {
          type: "object",
          properties: {
            contentId: {
              type: "string",
              description: "The exact contentId (document ID) of the memory to delete. Use the recall tool first to locate the contentId.",
            },
          },
          required: ["contentId"],
        },
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (request.params.name === "memorize") {
      const { text } = MemorizeSchema.parse(request.params.arguments);
      
      try {
        await manasdb.absorb(text);
        return {
          content: [
            {
              type: "text",
              text: "Successfully memorized the context across all healthy database providers.",
            },
          ],
        };
      } catch (dbError: any) {
        console.error("Database error during memorize:", dbError);
        return {
          content: [
            {
              type: "text",
              text: `Partial or complete failure during memorize: ${dbError.message}`,
            },
          ],
          isError: true,
        };
      }
    }

    if (request.params.name === "recall") {
      const { query } = RecallSchema.parse(request.params.arguments);
      try {
        const results = await manasdb.recall(query);
        return {
          content: [
            {
              type: "text",
              text: typeof results === "string" ? results : JSON.stringify(results, null, 2),
            },
          ],
        };
      } catch (dbError: any) {
        // According to requirements: "log the error but return results from the healthy providers"
        // This relies on @manasdb/core's polyglot self-healing. If an error surfaces here, log it.
        console.error("Database error during recall:", dbError);
        return {
          content: [
            {
              type: "text",
              text: `Partial or complete failure during recall: ${dbError.message}`,
            },
          ],
          isError: true,
        };
      }
    }

    if (request.params.name === "forget") {
      const { contentId } = ForgetSchema.parse(request.params.arguments);
      try {
        await manasdb.delete(contentId);
        return {
          content: [
            {
              type: "text",
              text: `Successfully deleted memory with contentId: ${contentId} from all databases.`,
            },
          ],
        };
      } catch (dbError: any) {
        console.error("Database error during forget:", dbError);
        return {
          content: [
            {
              type: "text",
              text: `Failed to delete memory: ${dbError.message}`,
            },
          ],
          isError: true,
        };
      }
    }

    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      throw new McpError(ErrorCode.InvalidParams, `Invalid arguments: ${error.message}`);
    }
    console.error("Tool execution error:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error executing ${request.params.name}: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  await manasdb.init();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ManasDB MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error starting server:", error);
  process.exit(1);
});
