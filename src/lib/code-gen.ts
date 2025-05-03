import OpenAI from "openai";
import { getOpenAIApiKey } from "./use-config-form";

export interface ExampleElement {
  isPositive: boolean;
  fullPath: string;
  innerHTML: string;
}

export interface GenerateQueryScriptOptions {
  elements: ExampleElement[];
  instruction: string;
  signal: AbortSignal;
}
export function generateQueryScript(options: GenerateQueryScriptOptions) {
  const { elements, instruction, signal } = options;
  console.log("Generating query script...");
  console.log({ elements, instruction });

  const openai = new OpenAI({
    dangerouslyAllowBrowser: true,
    apiKey: getOpenAIApiKey(),
  });

  const systemPrompt = `
<goal>Help user scrape a web page by writing a javascript snippet</goal>

<requirements>
User can provide a list of <include-example> elements that you should scrape. 
User can provide a list of <ignore-example> elements that you should exclude.
You must generalize the example elements to select and ignore all the elements based on user's intention.
</requirements>

Respond in a single javascript snippet wrapped in markdown code block, as shown in the <response-format>.
The snippet is an ESM module, with the default export being an array of objects scraped from the page
Do NOT wrap code in markdown code block.
<response-format>
// Your implementation here

export default results;
</response-format>
  `.trim();

  const userPrompt = `
<instruction>${instruction}</instruction>

## Examples
${elements
  .filter((e) => e.isPositive)
  .map(
    (e) => `<include-example>
  <full-path>${e.fullPath}</full-path>
  <inner-html>
    ${e.innerHTML}
  </inner-html>
</include-example>`,
  )
  .join("\n")}

${elements
  .filter((e) => !e.isPositive)
  .map(
    (e) => `<ignore-example>
  <full-path>${e.fullPath}</full-path>
  <inner-html>
    ${e.innerHTML}
  </inner-html>
</ignore-example>`,
  )
  .join("\n")}
  `;

  const response = openai.responses.create(
    {
      model: "gpt-4.1",
      stream: true,
      input: [
        {
          role: "developer",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    },
    {
      signal,
    },
  );

  return response;
}
