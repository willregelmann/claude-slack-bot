const path = require('path');
const fs = require('fs').promises;
const os = require('os');

class AgentTemplates {
  constructor() {
    this.templatesDir = path.join(os.homedir(), '.claude-slack', 'templates');
    this.initializeTemplates();
  }

  async initializeTemplates() {
    try {
      await fs.mkdir(this.templatesDir, { recursive: true });
      await this.createDefaultTemplates();
    } catch (error) {
      console.error('Failed to initialize templates:', error);
    }
  }

  async ensureInitialized() {
    await this.initializeTemplates();
  }

  async createDefaultTemplates() {
    const defaultTemplates = {
      'frontend': {
        name: 'Frontend Development',
        description: 'React, Vue, Angular, and other frontend frameworks',
        defaultDir: './frontend',
        defaultPort: 3001,
        suggestedAlias: 'frontend',
        tools: ['Edit', 'Read', 'Bash', 'WebSearch'],
        restrictions: {
          allowedTools: ['Edit', 'Read', 'Bash', 'Glob', 'Grep', 'WebSearch'],
          disallowedTools: ['WebFetch']
        }
      },
      'backend': {
        name: 'Backend Development',
        description: 'APIs, databases, and server-side development',
        defaultDir: './backend',
        defaultPort: 3002,
        suggestedAlias: 'backend',
        tools: ['Edit', 'Read', 'Bash', 'WebSearch'],
        restrictions: {
          allowedTools: ['Edit', 'Read', 'Bash', 'Glob', 'Grep', 'WebSearch'],
          disallowedTools: ['WebFetch']
        }
      },
      'docs': {
        name: 'Documentation',
        description: 'Writing and maintaining documentation',
        defaultDir: './docs',
        defaultPort: 3003,
        suggestedAlias: 'docs',
        tools: ['Edit', 'Read', 'WebSearch'],
        restrictions: {
          allowedTools: ['Edit', 'Read', 'Glob', 'Grep', 'WebSearch'],
          disallowedTools: ['Bash', 'WebFetch']
        }
      },
      'devops': {
        name: 'DevOps & Infrastructure',
        description: 'Deployment, monitoring, and infrastructure management',
        defaultDir: './devops',
        defaultPort: 3004,
        suggestedAlias: 'devops',
        tools: ['Edit', 'Read', 'Bash', 'WebSearch'],
        restrictions: {
          allowedTools: ['Edit', 'Read', 'Bash', 'Glob', 'Grep', 'WebSearch'],
          disallowedTools: []
        }
      },
      'testing': {
        name: 'Testing & QA',
        description: 'Test writing, automation, and quality assurance',
        defaultDir: './tests',
        defaultPort: 3005,
        suggestedAlias: 'testing',
        tools: ['Edit', 'Read', 'Bash', 'WebSearch'],
        restrictions: {
          allowedTools: ['Edit', 'Read', 'Bash', 'Glob', 'Grep', 'WebSearch'],
          disallowedTools: ['WebFetch']
        }
      },
      'mobile': {
        name: 'Mobile Development',
        description: 'iOS, Android, and cross-platform mobile development',
        defaultDir: './mobile',
        defaultPort: 3006,
        suggestedAlias: 'mobile',
        tools: ['Edit', 'Read', 'Bash', 'WebSearch'],
        restrictions: {
          allowedTools: ['Edit', 'Read', 'Bash', 'Glob', 'Grep', 'WebSearch'],
          disallowedTools: ['WebFetch']
        }
      }
    };

    for (const [key, template] of Object.entries(defaultTemplates)) {
      const templatePath = path.join(this.templatesDir, `${key}.json`);
      
      try {
        await fs.access(templatePath);
        // Template exists, don't overwrite
      } catch (error) {
        // Template doesn't exist, create it
        await fs.writeFile(templatePath, JSON.stringify(template, null, 2));
      }
    }
  }

  async listTemplates() {
    await this.ensureInitialized();
    
    try {
      const files = await fs.readdir(this.templatesDir);
      const templates = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const templatePath = path.join(this.templatesDir, file);
            const content = await fs.readFile(templatePath, 'utf8');
            const template = JSON.parse(content);
            template.id = file.replace('.json', '');
            templates.push(template);
          } catch (error) {
            console.warn(`Failed to load template ${file}:`, error.message);
          }
        }
      }

      return templates.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      return [];
    }
  }

  async getTemplate(id) {
    try {
      const templatePath = path.join(this.templatesDir, `${id}.json`);
      const content = await fs.readFile(templatePath, 'utf8');
      const template = JSON.parse(content);
      template.id = id;
      return template;
    } catch (error) {
      throw new Error(`Template "${id}" not found`);
    }
  }

  async createTemplate(id, template) {
    const templatePath = path.join(this.templatesDir, `${id}.json`);
    await fs.writeFile(templatePath, JSON.stringify(template, null, 2));
  }

  async deleteTemplate(id) {
    const templatePath = path.join(this.templatesDir, `${id}.json`);
    try {
      await fs.unlink(templatePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  async applyTemplate(templateId, options = {}) {
    const template = await this.getTemplate(templateId);
    
    // Merge template defaults with provided options
    const agentConfig = {
      alias: options.alias || template.suggestedAlias || templateId,
      dir: options.dir || template.defaultDir || '.',
      port: options.port || template.defaultPort || 3000,
      template: templateId,
      restrictions: template.restrictions || {}
    };

    // Resolve directory path
    agentConfig.dir = path.resolve(agentConfig.dir);

    return agentConfig;
  }

  getTemplateHelp() {
    return `
Claude Slack Agent Templates

Templates provide pre-configured settings for common development scenarios.

Available Commands:
  claude-slack template list                    List available templates
  claude-slack template show <id>              Show template details
  claude-slack template create <id>            Create agent from template
  claude-slack template new <id>               Create custom template

Usage Examples:
  claude-slack template create frontend        Create frontend agent
  claude-slack template create backend --dir=./api --port=4000

Template Features:
  • Pre-configured directory structures
  • Recommended tool restrictions
  • Suggested aliases and ports
  • Environment-specific settings
`;
  }
}

module.exports = AgentTemplates;