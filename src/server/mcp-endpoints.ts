import { Context } from "hono";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { registerAllTools } from "../tools/index.ts";
import { createLogger } from "../utils/logger.ts";

const logger = createLogger({ component: "mcp-endpoints" });

async function handleMcpRequest(c: Context) {
  const mcpToken = c.get("mcpToken") as string;

  const server = new McpServer(
    {
      name: "google-tasks-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  registerAllTools(server, mcpToken);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  try {
    await server.connect(transport);
    logger.info("MCP request handled via Streamable HTTP");
    return await transport.handleRequest(c.req.raw);
  } catch {
    logger.error("Failed to handle MCP request via Streamable HTTP");
    return c.json(
      {
        error: "internal_server_error",
        error_description: "Failed to process MCP request",
      },
      500,
    );
  }
}

export const handleMcpGet = handleMcpRequest;
export const handleMcpPost = handleMcpRequest;
