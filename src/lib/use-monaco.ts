import { editor, KeyCode, KeyMod, typescript, Uri } from "monaco-editor";

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
    "// You can run any javascript on the page\nwindow.alert('hello, world')\n\n// Export a value to JSON editor\nexport default [1,2,3];\n\n// Press Ctrl/Cmd + Enter to run",
    "javascript",
    Uri.parse("file:///index.js"),
  );
  const monacoContainer = document.getElementById("monaco-container")!;
  const instance = editor.create(monacoContainer, {
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

  const runCurrentValue = () => {
    props.onRun?.(model.getValue());
  };

  typescript.typescriptDefaults.setCompilerOptions({
    module: typescript.ModuleKind.ESNext,
    target: typescript.ScriptTarget.ESNext,
    skipDefaultLibCheck: true,
    skipLibCheck: true,
    isolatedModules: true,
    allowJs: true,
  });

  // add a custom types.d.ts file
  typescript.typescriptDefaults.addExtraLib(
    `
declare module "https://esm.sh/*" {
  const value: any;
  export default value;
}
  `,
    "esm-sh.d.ts",
  );

  // Bind run to this specific editor instance so Ctrl/Cmd+Enter works reliably.
  instance.addCommand(KeyMod.CtrlCmd | KeyCode.Enter, runCurrentValue);
  instance.addAction({
    id: "run",
    label: "Run",
    keybindings: [KeyMod.CtrlCmd | KeyCode.Enter],
    run: async () => {
      runCurrentValue();
    },
  });

  const getDocumentEndRange = () => {
    const lastLine = model.getLineCount();
    const lastColumn = model.getLineMaxColumn(lastLine);
    return {
      startLineNumber: lastLine,
      startColumn: lastColumn,
      endLineNumber: lastLine,
      endColumn: lastColumn,
    };
  };

  const clear = () => model.setValue("");

  const append = (text: string) =>
    model.applyEdits([
      {
        /** empty range for insertion */
        range: getDocumentEndRange(),
        text,
        forceMoveMarkers: true,
      },
    ]);

  return {
    instance,
    model,
    clear,
    append,
  };
}
