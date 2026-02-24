/**
 * Simple template engine for .md prompt files.
 *
 * Supports:
 *   {{variableName}}         — variable substitution
 *   {{obj.prop}}             — nested object access
 *   {{#if condition}}...{{/if}}           — conditional block
 *   {{#each items}}...{{/each}}           — loop (item available as {{item}} or {{item.prop}})
 */

function resolvePath(vars: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, vars);
}

function renderBlock(template: string, vars: Record<string, unknown>): string {
  // Process #each blocks first (may be nested inside #if)
  let result = template.replace(
    /\{\{#each\s+([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_match, path: string, body: string) => {
      const items = resolvePath(vars, path);
      if (!Array.isArray(items)) return '';
      return items
        .map((item: unknown) => {
          const itemVars =
            item !== null && typeof item === 'object'
              ? { ...vars, ...(item as Record<string, unknown>), item }
              : { ...vars, item };
          return renderBlock(body, itemVars);
        })
        .join('');
    },
  );

  // Process #if blocks
  result = result.replace(
    /\{\{#if\s+([\w.]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, path: string, body: string) => {
      const value = resolvePath(vars, path);
      return value ? renderBlock(body, vars) : '';
    },
  );

  // Replace remaining {{var}} and {{obj.prop}} placeholders
  result = result.replace(/\{\{([\w.]+)\}\}/g, (_match, path: string) => {
    const value = resolvePath(vars, path);
    return value !== undefined && value !== null ? String(value) : '';
  });

  return result;
}

export function renderTemplate(template: string, vars: Record<string, unknown>): string {
  return renderBlock(template, vars);
}
