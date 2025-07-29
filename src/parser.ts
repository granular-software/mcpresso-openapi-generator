import fs from 'fs-extra';
import path from 'path';

export interface ParsedOpenAPI {
  operations: any[];
  schemas: any[];
  info: any;
}

export async function parseOpenAPISpec(sourcePath: string): Promise<ParsedOpenAPI> {
  const content = await fs.readFile(sourcePath, 'utf-8');
  const spec = JSON.parse(content);
  
  const operations: any[] = [];
  const schemas: any[] = [];
  
  // Parse paths and operations
  if (spec.paths) {
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      const typedPathItem = pathItem as any;
      
      for (const [method, operation] of Object.entries(typedPathItem)) {
        if (method === 'parameters') continue;
        
        const typedOperation = operation as any;
        operations.push({
          method: method.toUpperCase(),
          path,
          operation: typedOperation
        });
      }
    }
  }
  
  // Parse schemas
  if (spec.components && spec.components.schemas) {
    for (const [name, schema] of Object.entries(spec.components.schemas)) {
      schemas.push({
        name,
        schema: schema as any
      });
    }
  }
  
  return {
    operations,
    schemas,
    info: spec.info || {}
  };
} 