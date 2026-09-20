const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

const skills = require('./skills');
const modules = require('./marketplace/moduleLoader');

const server = new McpServer({ name: 'pixel-ai', version: '1.0.0' });

const DEC = {};
skills.list().forEach(s => { DEC[s.name] = s.description; });

server.registerTool('climate', {
  title: 'Climat cabine',
  description: DEC.climate,
  inputSchema: { occupant: z.enum(['neo', 'nourrisson', 'enfant', 'adulte']).optional().default('adulte') }
}, async (args) => {
  const r = await skills.execute('climate', args);
  return { content: [{ type: 'text', text: JSON.stringify(r) }] };
});

server.registerTool('maintenance', {
  title: 'Maintenance cabine',
  description: DEC.maintenance,
  inputSchema: { issue: z.string().optional(), online: z.boolean().optional() }
}, async (args) => {
  const r = await skills.execute('maintenance', args);
  return { content: [{ type: 'text', text: JSON.stringify(r) }] };
});

server.registerTool('translate', {
  title: 'PixelTranslate',
  description: DEC.translate,
  inputSchema: { text: z.string(), target: z.string().optional() }
}, async (args) => {
  const r = await skills.execute('translate', args);
  return { content: [{ type: 'text', text: JSON.stringify(r) }] };
});

server.registerTool('compliance', {
  title: 'Conformité tunisienne',
  description: DEC.compliance,
  inputSchema: {}
}, async () => {
  const r = await skills.execute('compliance');
  return { content: [{ type: 'text', text: JSON.stringify(r) }] };
});

server.registerTool('accounting', {
  title: 'Comptabilité',
  description: DEC.accounting,
  inputSchema: {
    action: z.enum(['calculate_tva', 'social_contributions']).default('calculate_tva'),
    amountHT: z.number().optional(),
    tvaRate: z.number().optional(),
    salary: z.number().optional()
  }
}, async (args) => {
  const r = await skills.execute('accounting', args);
  return { content: [{ type: 'text', text: JSON.stringify(r) }] };
});

server.registerTool('coding', {
  title: 'Génération de code',
  description: DEC.coding,
  inputSchema: {
    language: z.string().optional().default('javascript'),
    task: z.string().optional().default('boilerplate'),
    name: z.string().optional().default('PixelComponent')
  }
}, async (args) => {
  const r = await skills.execute('coding', args);
  return { content: [{ type: 'text', text: JSON.stringify(r) }] };
});

server.registerTool('data_science', {
  title: 'Analyse de données',
  description: DEC.data_science,
  inputSchema: { dataset: z.array(z.number()).optional() }
}, async (args) => {
  const r = await skills.execute('data_science', args);
  return { content: [{ type: 'text', text: JSON.stringify(r) }] };
});

server.registerTool('module', {
  title: 'Module métier',
  description: 'Exécute un module métier téléchargé depuis le marketplace (legal-lawyer, clinic-health, driving-school, hotel-hotel, retail-shop, cabin-atlas).',
  inputSchema: {
    moduleId: z.string(),
    parameters: z.record(z.any()).optional()
  }
}, async (args) => {
  const r = modules.executeModuleSkill(args.moduleId, args.parameters);
  return { content: [{ type: 'text', text: JSON.stringify(r) }] };
});

const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);
console.error(`[Pixel AI MCP] démarré — ${skills.list().length} skills, ${modules.listModules().length} modules.`);