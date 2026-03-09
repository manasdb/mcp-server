# @manasdb/mcp-server

[![npm version](https://img.shields.io/npm/v/@manasdb/mcp-server?color=blue&style=flat-square)](https://www.npmjs.com/package/@manasdb/mcp-server)
[![npm downloads](https://img.shields.io/npm/dm/@manasdb/mcp-server?style=flat-square)](https://www.npmjs.com/package/@manasdb/mcp-server)
[![Node.js](https://img.shields.io/node/v/@manasdb/mcp-server?style=flat-square)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-8B5CF6?style=flat-square)](https://modelcontextprotocol.io)
[![License](https://img.shields.io/npm/l/@manasdb/mcp-server?style=flat-square)](LICENSE)
[![Powered by ManasDB](https://img.shields.io/badge/Powered%20by-ManasDB%20Core-FF6B35?style=flat-square)](https://github.com/manasdb/manasdb)

> **ManasDB = Memory Layer for AI Agents.**

AI agents today lack persistent memory. `@manasdb/mcp-server` provides a **plug-and-play memory layer** for MCP-compatible assistants like Claude and Cursor — powered by ManasDB's unique polyglot storage architecture.

With a single MCP server, AI agents can:

- 🧠 **Store memories** across multiple databases simultaneously
- 🔍 **Retrieve context** with semantic vector search
- 🗑️ **Delete outdated knowledge** on demand

No custom integration. No boilerplate. Just one command.

---

## Quick Start

```bash
npx @manasdb/mcp-server setup
```

This drops you into an interactive setup wizard that generates a ready-to-paste `claude_desktop_config.json` snippet in under 60 seconds.

---

## Architecture

```
AI Assistant (Claude / Cursor / Any MCP Client)
     │
     │  MCP Protocol (stdio)
     ▼
 @manasdb/mcp-server
     │
     │  Tools: memorize · recall · forget
     ▼
 @manasdb/core  ◄── Embeddings (Transformers / Ollama / Gemini / OpenAI)
     │
 ┌───┴──────────────────┬────────────────────┐
 ▼                      ▼                    ▼
MongoDB             PostgreSQL           Redis / ES
                                         (coming soon)
```

**ManasDB is AI Memory Infrastructure.** The components are:

| Package               | Role                                                           |
| :-------------------- | :------------------------------------------------------------- |
| `@manasdb/core`       | Core library: chunking, embedding, polyglot storage            |
| `@manasdb/mcp-server` | MCP Server: exposes tools to AI assistants                     |
| Database Adapters     | MongoDB, PostgreSQL (built-in), Redis, Elasticsearch (planned) |

---

## Why ManasDB?

| Feature                         | ManasDB |  Mem0   | memGPT  | LangChain |
| :------------------------------ | :-----: | :-----: | :-----: | :-------: |
| **Polyglot Storage**            |    ✔    |    ✘    |    ✘    |     ✘     |
| **Multiple DBs simultaneously** |    ✔    |    ✘    |    ✘    |     ✘     |
| **Deduplicated Retrieval**      |    ✔    | Limited | Limited |  Limited  |
| **Local Embedding (Ollama)**    |    ✔    |    ✘    |    ✘    |  Limited  |
| **Agent Tools (MCP)**           |    ✔    | Partial | Partial |  Partial  |
| **Zero Cloud Lock-in**          |    ✔    |    ✘    |    ✘    |     ✘     |

---

## Supported Databases

| Database                    |     Status     | Provider Type   |
| :-------------------------- | :------------: | :-------------- |
| **MongoDB** (Atlas / Local) |   ✅ Stable    | `mongodb`       |
| **PostgreSQL** (pgvector)   |   ✅ Stable    | `postgres`      |
| **Redis**                   | 🔜 Coming Soon | `redis`         |
| **Elasticsearch**           | 🔜 Coming Soon | `elasticsearch` |

---

## Example Interaction

Here is how it works end-to-end in Claude Desktop:

**User:** Remember my name is Akshay.

**Claude → `memorize` called**

```json
{
  "text": "User name is Akshay"
}
```

> ✅ Successfully memorized the context across all healthy database providers.

_Later in a new conversation..._

**User:** What is my name?

**Claude → `recall` called**

```json
{
  "query": "user name"
}
```

**Claude:** Your name is Akshay.

---

## Setup & Configuration

> For deeper information on how ManasDB's polyglot memory, chunking, and retrieval algorithms work, see the primary SDK: [`@manasdb/core`](https://github.com/manasdb/manasdb).

### Interactive Setup (Recommended)

```bash
npx @manasdb/mcp-server setup
```

The wizard will ask you for:

1. Project Name
2. MongoDB URI
3. PostgreSQL URI
4. Embedding Model Source (`transformers`, `ollama`, `gemini`, `openai`)
5. Model Name (e.g. `nomic-embed-text:latest` for Ollama)
6. Enable Telemetry

It then outputs a ready-to-use `claude_desktop_config.json` snippet.

### Manual Configuration

Pass the full config to as a `--manas-config` argument or set `MANAS_DB_CONFIG` as an environment variable. The config supports all `@manasdb/core` options:

```json
{
  "databases": [
    {
      "type": "mongodb",
      "uri": "mongodb://localhost:27017",
      "dbName": "my_app"
    },
    { "type": "postgres", "uri": "postgresql://localhost:5432/postgres" }
  ],
  "projectName": "knowledge_base",
  "modelConfig": { "source": "ollama", "model": "nomic-embed-text:latest" },
  "telemetry": true,
  "debug": false
}
```

---

## Integrations

### Claude Desktop

```json
{
  "mcpServers": {
    "manasdb": {
      "command": "npx",
      "args": [
        "-y",
        "@manasdb/mcp-server",
        "--manas-config={\"databases\":[{\"type\":\"mongodb\",\"uri\":\"mongodb://...\"}],\"modelConfig\":{\"source\":\"transformers\"}}"
      ]
    }
  }
}
```

### Cursor

1. Open **Settings** → **Features** → **MCP Servers**
2. Click **+ Add new MCP Server**
3. **Type**: `command`
4. **Command**: `npx -y @manasdb/mcp-server --manas-config="{...}"`

---

## Available Tools

| Tool       | Description                                                                               | Input                    |
| :--------- | :---------------------------------------------------------------------------------------- | :----------------------- |
| `memorize` | Store information into ManasDB                                                            | `{ "text": "..." }`      |
| `recall`   | Retrieve context semantically. Returns results with `contentId` for each memory.          | `{ "query": "..." }`     |
| `forget`   | Permanently delete a memory from all databases by its `contentId` (returned by `recall`). | `{ "contentId": "..." }` |

> **Tip:** Use `recall` first to find the `contentId` of the memory you want to delete, then pass it to `forget`.

---

## License

See [LICENSE](LICENSE).
