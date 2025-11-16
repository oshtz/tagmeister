export interface SystemPromptDefinition {
  name: string;
  description?: string;
  text: string;
  isDefault: boolean;
}

export const DEFAULT_SYSTEM_PROMPTS: SystemPromptDefinition[] = [
  {
    name: 'FLUX (Natural Language)',
    description: 'Single-paragraph, literal descriptions suited for FLUX-style captioning.',
    text: "Describe this image in one concise paragraph, starting immediately with the primary subject (e.g., 'Watch,' 'Landscape,' 'Person'). Focus on key elements, their relationships, and notable details. Be specific and direct, avoiding any introductory phrases like 'The image shows' or 'I can see.' Prioritize the most important aspects and describe them factually. Identify the main subject quickly and accurately, noting its dominant characteristics such as size, color, shape, or position. For multiple elements, describe their spatial relationships. Include relevant details about composition, color schemes, lighting, and textures. Mention any actions, movements, functions, or unique features of objects, and appearances or behaviors of people or animals. Include any visible text, logos, or recognizable symbols. Describe what you see literally, without interpreting the image's style (e.g., don't use terms like 'stylized,' 'illustration,' or mention artistic techniques). Treat every subject as a real object or scene, not as a representation. Use varied and precise vocabulary to create a vivid description while maintaining a neutral tone. Avoid subjective interpretations unless crucial to understanding the image's content.",
    isDefault: true,
  },
  {
    name: 'SDXL (Booru Tags)',
    description: 'Dense comma-separated SDXL/Booru tags.',
    text: 'Generate a list of tags for this image in the style of Booru image boards and SDXL prompts. Focus on describing the visual elements, subjects, objects, settings, colors, lighting, composition, artistic style, and other relevant attributes. Format the output as a comma-separated list of tags without numbering or bullet points. Be specific and detailed, but keep each tag concise (1-3 words typically). Include tags for the main subject, background elements, colors, lighting, composition, style, medium, and any notable features. Do not include explanatory text or categorization headers - just provide the raw comma-separated tag list. Make sure to include mostly single-word tags, you can use some double-word tags if needed but mostly single word if possible.',
    isDefault: true,
  },
];

const defaultPromptMap = new Map(DEFAULT_SYSTEM_PROMPTS.map(prompt => [prompt.name, prompt]));

export const isDefaultPromptName = (name: string) => defaultPromptMap.has(name);

export const getSystemPromptByName = (
  name: string,
  customPrompts: SystemPromptDefinition[] = []
): SystemPromptDefinition => {
  const custom = customPrompts.find(prompt => prompt.name === name);
  if (custom) {
    return custom;
  }
  return defaultPromptMap.get(name) ?? DEFAULT_SYSTEM_PROMPTS[0];
};

export const getAllSystemPrompts = (
  customPrompts: SystemPromptDefinition[] = []
): SystemPromptDefinition[] => {
  return [...DEFAULT_SYSTEM_PROMPTS, ...customPrompts];
};
