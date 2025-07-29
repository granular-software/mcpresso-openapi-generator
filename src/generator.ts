import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { parseOpenAPISpec } from './parser.js';
import { SchemaGenerator } from './schema-generator.js';
import { ResourceGenerator } from './resource-generator.js';
import { FileGenerator } from './file-generator.js';
import { GenerateOptions } from './types.js';

export async function generateFromOpenAPI(options: GenerateOptions): Promise<void> {
  const { source, outputDir, serverName, verbose = false } = options;
  
  if (verbose) {
    console.log(chalk.blue('🚀 Starting OpenAPI to MCPresso conversion...'));
  }

  try {
    // Step 1: Parse OpenAPI specification
    if (verbose) {
      console.log(chalk.blue('📖 Parsing OpenAPI specification...'));
    }
    const parsed = await parseOpenAPISpec(source);
    
    if (verbose) {
      console.log(chalk.green('✅ OpenAPI specification parsed successfully'));
      console.log(`   - ${parsed.operations.length} operations found`);
      console.log(`   - ${parsed.schemas.length} schemas found`);
    }

    // Step 2: Generate Zod schemas
    if (verbose) {
      console.log(chalk.blue('🔧 Converting schemas to Zod...'));
    }
    const schemaGenerator = new SchemaGenerator(parsed.schemas);
    const generatedSchemas = schemaGenerator.generateSchemas(parsed.schemas);
    
    if (verbose) {
      console.log(chalk.green(`✅ Successfully converted ${generatedSchemas.length} schemas`));
    }

    // Step 3: Generate resources
    if (verbose) {
      console.log(chalk.blue('🏗️  Generating MCPresso resources...'));
    }
    const resourceGenerator = new ResourceGenerator(generatedSchemas);
    const generatedResources = resourceGenerator.generateResources(parsed.operations);
    
    if (verbose) {
      console.log(chalk.green(`✅ Successfully generated ${generatedResources.length} resources`));
    }

    // Step 4: Generate all files
    if (verbose) {
      console.log(chalk.blue('📝 Generating output files...'));
    }
    const fileGenerator = new FileGenerator();
    const generatedCode = fileGenerator.generateFiles(
      serverName,
      generatedSchemas,
      generatedResources,
      parsed
    );

    // Step 5: Write files to disk
    if (verbose) {
      console.log(chalk.blue('💾 Writing files to disk...'));
    }
    await writeOutputFiles(outputDir, generatedCode, verbose);

    if (verbose) {
      console.log(chalk.green('✅ Generation completed successfully!'));
      console.log(chalk.blue(`📁 Output directory: ${outputDir}`));
    }

  } catch (error) {
    console.error(chalk.red('❌ Generation failed:'), error);
    throw error;
  }
}

/**
 * Write all generated files to the output directory
 */
async function writeOutputFiles(
  outputDir: string,
  code: any,
  verbose: boolean
): Promise<void> {
  // Create output directory
  await fs.mkdir(outputDir, { recursive: true });

  // Write main files
  const mainFiles = [
    { name: 'server.js', content: code.server },
    { name: 'types.ts', content: code.types },
    { name: 'package.json', content: code.packageJson },
    { name: 'README.md', content: code.readme },
    { name: 'apiClient.ts', content: code.apiClient },
  ];

  for (const file of mainFiles) {
    const filePath = path.join(outputDir, file.name);
    await fs.writeFile(filePath, String(file.content), 'utf-8');
    if (verbose) {
      console.log(chalk.gray(`  → Wrote: ${file.name}`));
    }
  }

  // Write schema files
  for (const [fileName, content] of Object.entries(code.schemaFiles)) {
    const filePath = path.join(outputDir, fileName);
    const dirPath = path.dirname(filePath);
    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(filePath, String(content), 'utf-8');
    if (verbose) {
      console.log(chalk.gray(`  → Wrote: ${fileName}`));
    }
  }

  // Write resource files
  for (const [fileName, content] of Object.entries(code.resourceFiles)) {
    const filePath = path.join(outputDir, fileName);
    const dirPath = path.dirname(filePath);
    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(filePath, String(content), 'utf-8');
    if (verbose) {
      console.log(chalk.gray(`  → Wrote: ${fileName}`));
    }
  }
} 