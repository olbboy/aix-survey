/**
 * Email Template Renderer
 * Uses Handlebars for template rendering
 */

import Handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';

// Template cache for performance
const templateCache = new Map<string, HandlebarsTemplateDelegate>();

/**
 * Register Handlebars helpers
 */
function registerHelpers() {
  // Format number helper
  Handlebars.registerHelper('formatNumber', (value: number, decimals: number = 2) => {
    return value.toFixed(decimals);
  });

  // Format date helper
  Handlebars.registerHelper('formatDate', (date: string | Date) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  // Conditional helper
  Handlebars.registerHelper('eq', (a: any, b: any) => {
    return a === b;
  });

  Handlebars.registerHelper('gte', (a: number, b: number) => {
    return a >= b;
  });

  Handlebars.registerHelper('lte', (a: number, b: number) => {
    return a <= b;
  });

  // Maturity level color helper
  Handlebars.registerHelper('maturityColor', (level: string) => {
    const colors: Record<string, string> = {
      'Sơ khai': '#ef4444',
      'Khởi đầu': '#f97316',
      'Phát triển': '#eab308',
      'Trưởng thành': '#3b82f6',
      'Tối ưu': '#22c55e',
    };
    return colors[level] || '#6b7280';
  });
}

// Register helpers on module load
registerHelpers();

/**
 * Load and compile template
 */
async function loadTemplate(templateName: string): Promise<HandlebarsTemplateDelegate> {
  // Check cache first
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName)!;
  }

  // Load template file
  const templatePath = path.join(process.cwd(), 'src', 'lib', 'email', 'templates', `${templateName}.hbs`);

  try {
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    const compiled = Handlebars.compile(templateContent);

    // Cache the compiled template
    templateCache.set(templateName, compiled);

    return compiled;
  } catch (error) {
    console.error(`Failed to load template ${templateName}:`, error);
    throw new Error(`Template ${templateName} not found`);
  }
}

/**
 * Render template with data
 */
export async function renderTemplate(
  templateName: string,
  data: Record<string, any>
): Promise<string> {
  try {
    const template = await loadTemplate(templateName);
    return template(data);
  } catch (error) {
    console.error(`Failed to render template ${templateName}:`, error);
    throw error;
  }
}

/**
 * Clear template cache (useful for development)
 */
export function clearTemplateCache(): void {
  templateCache.clear();
}
