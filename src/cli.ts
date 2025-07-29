#!/usr/bin/env node

import { Command } from 'commander';
import { generateFromOpenAPI } from './generator.js';
import chalk from 'chalk';

const program = new Command();

program
  .name('mcpresso-openapi-generator')
  .description('Generate MCPresso servers from OpenAPI specifications')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate a MCPresso server from an OpenAPI specification')
  .requiredOption('-s, --source <path>', 'Path to OpenAPI specification file (JSON)')
  .requiredOption('-o, --output <path>', 'Output directory for generated files')
  .requiredOption('-n, --name <name>', 'Name for the generated server')
  .option('-v, --verbose', 'Enable verbose output')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🚀 MCPresso OpenAPI Generator'));
      console.log(chalk.gray('Generating MCPresso server from OpenAPI specification...\n'));

      await generateFromOpenAPI({
        source: options.source,
        outputDir: options.output,
        serverName: options.name,
        verbose: options.verbose || false
      });

      console.log(chalk.green('\n✅ Generation completed successfully!'));
      console.log(chalk.blue(`📁 Output directory: ${options.output}`));
      console.log(chalk.gray('\nNext steps:'));
      console.log(chalk.gray('1. cd ' + options.output));
      console.log(chalk.gray('2. npm install'));
      console.log(chalk.gray('3. Set your API_BASE_URL and API_TOKEN environment variables'));
      console.log(chalk.gray('4. npm start'));

    } catch (error) {
      console.error(chalk.red('\n❌ Generation failed:'), error);
      process.exit(1);
    }
  });

program.parse(); 