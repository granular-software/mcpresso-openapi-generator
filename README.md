# MCPresso OpenAPI Generator

A clean, modular generator that converts OpenAPI specifications into fully functional MCPresso servers with type-safe Zod schemas and HTTP handlers.

## Features

- **Clean Architecture**: Modular, maintainable code split into focused components
- **Type Safety**: Full TypeScript support with Zod schema validation
- **OpenAPI Support**: Handles complex OpenAPI 3.0 specifications
- **MCPresso Integration**: Generates MCP-compliant resources and methods
- **HTTP Handlers**: Automatic generation of axios-based API clients
- **Schema Conversion**: Converts OpenAPI schemas to Zod with proper validation
- **Resource Grouping**: Smart grouping of operations into logical resources
- **File Organization**: Clean file structure with separate schema and resource files

## Architecture

The generator is split into focused, maintainable modules:

- **`types.ts`**: TypeScript interfaces and types
- **`utils.ts`**: Utility functions for string manipulation and naming
- **`schema-generator.ts`**: Converts OpenAPI schemas to Zod schemas
- **`resource-generator.ts`**: Groups operations and creates MCPresso resources
- **`file-generator.ts`**: Generates all output files (server, types, package.json, etc.)
- **`generator.ts`**: Main orchestrator that coordinates all components

## Installation

```bash
npm install mcpresso-openapi-generator
```

## Usage

### CLI

```bash
# Generate a server from an OpenAPI specification
mcpresso-openapi-generator generate \
  --source ./api-spec.json \
  --output ./generated-server \
  --name my-api-server \
  --verbose
```

### Programmatic

```typescript
import { generateFromOpenAPI } from 'mcpresso-openapi-generator';

await generateFromOpenAPI({
  source: './api-spec.json',
  outputDir: './generated-server',
  serverName: 'my-api-server',
  verbose: true
});
```

## Generated Output

The generator creates a complete MCPresso server with the following structure:

```
generated-server/
├── server.js              # Main server file
├── types.ts               # Type exports
├── package.json           # Dependencies and scripts
├── README.md              # Documentation
├── apiClient.ts           # Axios-based API client
├── schemas/               # Generated Zod schemas
│   ├── User.ts
│   ├── Product.ts
│   └── ...
└── resources/             # Generated MCPresso resources
    ├── UserResource.ts
    ├── ProductResource.ts
    └── ...
```

## Generated Files

### Server File (`server.js`)
Main MCPresso server that imports and configures all resources.

### Schema Files (`schemas/*.ts`)
Individual Zod schema files for each OpenAPI type definition.

### Resource Files (`resources/*.ts`)
MCPresso resource definitions with HTTP handlers for each operation.

### API Client (`apiClient.ts`)
Configured axios client with authentication and error handling.

### Package Configuration
- `package.json` with all necessary dependencies
- `README.md` with setup and usage instructions
- `types.ts` with type exports

## Features

### Schema Conversion
- Converts OpenAPI schemas to Zod with proper validation
- Handles complex types (arrays, objects, unions, intersections)
- Supports OpenAPI formats (email, date-time, uuid, etc.)
- Manages circular references with lazy evaluation

### Resource Generation
- Groups operations by path structure
- Maps HTTP methods to MCPresso methods (GET→get, POST→create, etc.)
- Generates proper input/output schemas
- Creates HTTP handlers with path parameter substitution

### HTTP Handlers
- Automatic path parameter substitution
- Query parameter handling
- Request/response body mapping
- Error handling with proper error messages
- Authentication token support

### Type Safety
- Full TypeScript support
- Zod schema validation
- Proper type exports
- IntelliSense support

## Example

Given this OpenAPI specification:

```json
{
  "openapi": "3.0.0",
  "paths": {
    "/users": {
      "get": {
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": { "$ref": "#/components/schemas/User" }
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "User": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "email": { "type": "string", "format": "email" }
        },
        "required": ["id", "name", "email"]
      }
    }
  }
}
```

The generator creates:

**`schemas/User.ts`**:
```typescript
import { z } from 'zod';

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email()
});

export type User = z.infer<typeof userSchema>;
```

**`resources/UserResource.ts`**:
```typescript
import { z } from 'zod';
import { createResource } from 'mcpresso';
import apiClient from '../apiClient.js';
import { userSchema } from '../schemas/User.js';

export const userResource = createResource({
  name: "user",
  schema: userSchema,
  uri_template: "user/{id}",
  methods: {
    get: {
      description: "Get all users",
      handler: async (args) => {
        try {
          const response = await apiClient({
            method: 'GET',
            url: '/users',
            params: args
          });
          return response.data;
        } catch (error) {
          // Error handling...
        }
      }
    }
  }
});
```

## Configuration

### Environment Variables
- `API_BASE_URL`: Base URL for API calls (default: http://localhost:3000)
- `API_TOKEN`: Authentication token
- `PORT`: Server port (default: 3080)

### Customization
You can customize the generated code by:
1. Modifying the API client configuration
2. Adding custom authentication logic
3. Modifying server configuration
4. Adding rate limiting or retries

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run in development mode
npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT 