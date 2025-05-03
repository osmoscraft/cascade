import { editor, KeyCode, KeyMod, languages, Uri } from "monaco-editor";

// Monaco editor
export function useMonaco(props: { onRun?: (value: string) => void }) {
  self.MonacoEnvironment = {
    getWorker: async function (_workerId: string, label: string) {
      if (label === "typescript" || label === "javascript") {
        // due to large payload size, we must manually fetch the worker
        const workerBlob = await fetch(chrome.runtime.getURL("language/typescript/ts.js")).then((res) => res.blob());
        const url = URL.createObjectURL(workerBlob);

        return new Worker(url, { type: "module" });
      }

      const workerBlob = await fetch(chrome.runtime.getURL("editor/editor.worker.js")).then((res) => res.blob());
      const url = URL.createObjectURL(workerBlob);

      return new Worker(url, { type: "module" });
    },
  };

  const model = editor.createModel(
    "console.log('hello,world')\nexport default [1,2,3];",
    "javascript",
    Uri.parse("file:///index.js"),
  );
  const monacoContainer = document.getElementById("monaco-container")!;
  editor.create(monacoContainer, {
    model,
    language: "typescript",
    theme: "vs-dark",
    minimap: { enabled: false },
    lineNumbers: "off",
    overviewRulerLanes: 0,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    lineDecorationsWidth: "1ch",
    tabSize: 2,
  });

  languages.typescript.typescriptDefaults.setCompilerOptions({
    module: languages.typescript.ModuleKind.ESNext,
    target: languages.typescript.ScriptTarget.ESNext,
    skipDefaultLibCheck: true,
    skipLibCheck: true,
    isolatedModules: true,
    allowJs: true,
  });

  // add a custom types.d.ts file
  languages.typescript.typescriptDefaults.addExtraLib(
    `
declare module "https://esm.sh/*" {
  const value: any;
  export default value;
}
  `,
    "esm-sh.d.ts",
  );

  // add handler for ctrl + enter
  editor.addEditorAction({
    id: "run",
    label: "Run",
    keybindings: [KeyMod.CtrlCmd | KeyCode.Enter],
    run: async (ed) => {
      const value = ed.getValue();

      props.onRun?.(value);
    },
  });
}
