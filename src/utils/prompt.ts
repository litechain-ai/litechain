export function interpolatePrompt(prompt: string, variables: Record<string, string>) {
    return prompt.replace(/{(\w+)}/g, (_, key) => variables[key] ?? `{${key}}`);
  }
  