import { z } from 'zod';
import { OpenAPISchema, GeneratedSchema } from './types.js';
import { extractRefName, toPascalCase, toValidIdentifier } from './utils.js';

export class SchemaGenerator {
  private schemaMap: Map<string, any>;
  private generatedSchemas: Map<string, GeneratedSchema>;

  constructor(schemas: OpenAPISchema[]) {
    this.schemaMap = new Map(schemas.map(s => [s.name, s.schema]));
    this.generatedSchemas = new Map();
  }

  /**
   * Generate Zod schemas from OpenAPI schemas
   */
  generateSchemas(schemas: OpenAPISchema[]): GeneratedSchema[] {
    const results: GeneratedSchema[] = [];

    for (const { name, schema } of schemas) {
      try {
        const zodSchema = this.convertToZod(schema);
        const typeName = toPascalCase(name);
        const fileName = `${typeName}.ts`;
        const schemaVar = `${toValidIdentifier(name)}Schema`;

        const generatedSchema: GeneratedSchema = {
          name,
          zodSchema,
          fileName,
          typeName,
          warnings: []
        };

        this.generatedSchemas.set(name, generatedSchema);
        results.push(generatedSchema);
      } catch (error) {
        console.warn(`Failed to convert schema '${name}': ${error}`);
      }
    }

    return results;
  }

  /**
   * Convert OpenAPI schema to Zod schema
   */
  private convertToZod(schema: any, visited: Set<string> = new Set()): z.ZodTypeAny {
    if (!schema) {
      return z.any();
    }

    // Handle references
    if (schema.$ref) {
      const refName = extractRefName(schema.$ref);
      if (visited.has(refName)) {
        // Circular reference - use lazy evaluation
        return z.lazy(() => {
          const existing = this.generatedSchemas.get(refName);
          return existing ? existing.zodSchema : z.any();
        });
      }

      visited.add(refName);
      const refSchema = this.schemaMap.get(refName);
      if (refSchema) {
        return this.convertToZod(refSchema, visited);
      }
      
      // If we can't resolve the reference, create a placeholder
      return z.lazy(() => z.object({}).passthrough());
    }

    // Handle different types
    switch (schema.type) {
      case 'string':
        return this.convertStringSchema(schema);

      case 'number':
      case 'integer':
        return this.convertNumberSchema(schema);

      case 'boolean':
        return z.boolean();

      case 'array':
        return this.convertArraySchema(schema, visited);

      case 'object':
        return this.convertObjectSchema(schema, visited);

      default:
        return this.convertComplexSchema(schema, visited);
    }
  }

  /**
   * Convert string schema to Zod
   */
  private convertStringSchema(schema: any): z.ZodTypeAny {
    let zodSchema = z.string();

    if (schema.enum) {
      return z.enum(schema.enum as [string, ...string[]]);
    }

    if (schema.format) {
      switch (schema.format) {
        case 'date-time':
          return z.string().datetime();
        case 'date':
          return z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
        case 'email':
          return z.string().email();
        case 'uri':
        case 'url':
          return z.string().url();
        case 'uuid':
          return z.string().uuid();
        case 'ipv4':
          return z.string().ip({ version: 'v4' });
        case 'ipv6':
          return z.string().ip({ version: 'v6' });
      }
    }

    if (schema.pattern) {
      zodSchema = zodSchema.regex(new RegExp(schema.pattern));
    }

    if (schema.minLength !== undefined) {
      zodSchema = zodSchema.min(schema.minLength);
    }

    if (schema.maxLength !== undefined) {
      zodSchema = zodSchema.max(schema.maxLength);
    }

    return zodSchema;
  }

  /**
   * Convert number schema to Zod
   */
  private convertNumberSchema(schema: any): z.ZodTypeAny {
    let zodSchema: z.ZodTypeAny = schema.type === 'integer' ? z.number().int() : z.number();

    if (schema.minimum !== undefined) {
      zodSchema = (zodSchema as z.ZodNumber).min(schema.minimum);
    }

    if (schema.maximum !== undefined) {
      zodSchema = (zodSchema as z.ZodNumber).max(schema.maximum);
    }

    if (schema.exclusiveMinimum !== undefined) {
      zodSchema = (zodSchema as z.ZodNumber).gt(schema.exclusiveMinimum);
    }

    if (schema.exclusiveMaximum !== undefined) {
      zodSchema = (zodSchema as z.ZodNumber).lt(schema.exclusiveMaximum);
    }

    if (schema.multipleOf !== undefined) {
      return zodSchema.refine(
        (val) => val % schema.multipleOf === 0,
        { message: `Must be a multiple of ${schema.multipleOf}` }
      );
    }

    return zodSchema;
  }

  /**
   * Convert array schema to Zod
   */
  private convertArraySchema(schema: any, visited: Set<string>): z.ZodTypeAny {
    if (schema.items) {
      const itemSchema = this.convertToZod(schema.items, visited);
      let arraySchema: z.ZodTypeAny = z.array(itemSchema);

      if (schema.minItems !== undefined) {
        arraySchema = (arraySchema as z.ZodArray<any>).min(schema.minItems);
      }

      if (schema.maxItems !== undefined) {
        arraySchema = (arraySchema as z.ZodArray<any>).max(schema.maxItems);
      }

      if (schema.uniqueItems) {
        return arraySchema.refine(
          (arr) => new Set(arr).size === arr.length,
          { message: 'Array items must be unique' }
        );
      }

      return arraySchema;
    }

    return z.array(z.any());
  }

  /**
   * Convert object schema to Zod
   */
  private convertObjectSchema(schema: any, visited: Set<string>): z.ZodTypeAny {
    if (schema.properties) {
      const shape: Record<string, z.ZodTypeAny> = {};
      
      for (const [key, prop] of Object.entries(schema.properties)) {
        const propSchema = this.convertToZod(prop as any, visited);
        const isRequired = schema.required && schema.required.includes(key);
        shape[key] = isRequired ? propSchema : propSchema.optional();
      }
      
      let objectSchema: z.ZodTypeAny = z.object(shape);

      if (schema.additionalProperties === false) {
        objectSchema = (objectSchema as z.ZodObject<any>).strict();
      } else if (schema.additionalProperties) {
        const additionalSchema = this.convertToZod(schema.additionalProperties, visited);
        objectSchema = (objectSchema as z.ZodObject<any>).catchall(additionalSchema);
      }

      return objectSchema;
    }

    return z.record(z.any());
  }

  /**
   * Convert complex schemas (oneOf, anyOf, allOf)
   */
  private convertComplexSchema(schema: any, visited: Set<string>): z.ZodTypeAny {
    // Handle oneOf/anyOf
    if (schema.oneOf || schema.anyOf) {
      const unionSchemas = (schema.oneOf || schema.anyOf) as any[];
      const zodSchemas = unionSchemas.map(s => this.convertToZod(s, visited));
      
      if (zodSchemas.length >= 2) {
        return z.union([zodSchemas[0], zodSchemas[1], ...zodSchemas.slice(2)]);
      }
      return zodSchemas[0] || z.any();
    }

    // Handle allOf
    if (schema.allOf) {
      const allOfSchemas = schema.allOf as any[];
      const zodSchemas = allOfSchemas.map(s => this.convertToZod(s, visited));
      
      if (zodSchemas.length >= 2) {
        return z.intersection(zodSchemas[0], zodSchemas[1], ...zodSchemas.slice(2));
      }
      return zodSchemas[0] || z.any();
    }

    return z.any();
  }

  /**
   * Generate schema file content
   */
  generateSchemaFile(schema: GeneratedSchema): string {
    const { typeName, zodSchema, warnings } = schema;
    const schemaVar = `${toValidIdentifier(schema.name)}Schema`;
    
    const warningComments = warnings.length > 0 ? 
      `\n${warnings.join('\n')}\n` : '';
    
    return `import { z } from 'zod';${warningComments}

export const ${schemaVar} = ${this.serializeZodSchema(zodSchema)};

export type ${typeName} = z.infer<typeof ${schemaVar}>;
`;
  }

  /**
   * Serialize Zod schema to string representation
   */
  private serializeZodSchema(schema: z.ZodTypeAny): string {
    const typeName = schema._def.typeName;
    
    switch (typeName) {
      case 'ZodString':
        return 'z.string()';
      case 'ZodNumber':
        return 'z.number()';
      case 'ZodBoolean':
        return 'z.boolean()';
      case 'ZodArray':
        const itemType = this.serializeZodSchema(schema._def.type);
        return `z.array(${itemType})`;
      case 'ZodOptional':
        const innerType = this.serializeZodSchema(schema._def.innerType);
        return `${innerType}.optional()`;
      case 'ZodObject':
        const shape = schema._def.shape();
        const properties: string[] = [];
        
        for (const [key, value] of Object.entries(shape)) {
          const serialized = this.serializeZodSchema(value as z.ZodTypeAny);
          properties.push(`  ${key}: ${serialized}`);
        }
        
        return `z.object({\n${properties.join(',\n')}\n})`;
      case 'ZodUnion':
        const options = schema._def.options.map((opt: z.ZodTypeAny) => this.serializeZodSchema(opt));
        return `z.union([${options.join(', ')}])`;
      case 'ZodIntersection':
        const intersectionTypes = schema._def.options.map((opt: z.ZodTypeAny) => this.serializeZodSchema(opt));
        return `z.intersection(${intersectionTypes.join(', ')})`;
      case 'ZodLiteral':
        const value = schema._def.value;
        if (typeof value === 'string') {
          return `z.literal("${value}")`;
        }
        return `z.literal(${value})`;
      case 'ZodEnum':
        const enumValues = schema._def.values;
        return `z.enum([${enumValues.map((v: string) => `"${v}"`).join(', ')}])`;
      case 'ZodLazy':
        return 'z.lazy(() => z.any())'; // Simplified for now
      default:
        return 'z.any()';
    }
  }
} 