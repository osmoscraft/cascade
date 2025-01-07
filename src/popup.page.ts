import { editor, KeyCode, KeyMod } from "monaco-editor";
import type { ExtensionMessage } from "./typings/message";
import { $ } from "./utils/dom";

import "./styles/elements.css";
import "./styles/reset.css";
import "./styles/theme.css";

import { createJSONEditor } from "vanilla-jsoneditor";
import "./popup.page.css";

// poc load monaco
self.MonacoEnvironment = {
  getWorker: function (_workerId: string, label: string) {
    if (label === "typescript" || label === "javascript") {
      return new Worker("./ts.js", { type: "module" });
    }

    throw new Error(`Unsupported language ${label}`);
  },
};

const jsonEditor = createJSONEditor({
  target: $<HTMLDivElement>("#json-editor")!,
});

const monacoContainer = document.getElementById("monaco-container")!;
editor.create(monacoContainer, {
  value: "console.log('Hello world!');",
  language: "typescript",
  theme: "vs-dark",
  minimap: { enabled: false },
  lineNumbers: "off",
  overviewRulerLanes: 0,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  lineDecorationsWidth: "1ch",
  folding: false,
});

// add handler for ctrl + enter
editor.addEditorAction({
  id: "run",
  label: "Run",
  keybindings: [KeyMod.CtrlCmd | KeyCode.Enter],
  run: async (ed) => {
    const value = ed.getValue();

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    const output = await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: (script: string) => {
        return window.eval(script);
      },
      args: [value],
      world: "MAIN",
    });

    jsonEditor.set({ json: output.at(0)?.result });
  },
});

/* Elements */

/* Event registrations */
chrome.runtime.onMessage.addListener(handleExtensionMessage);

async function handleExtensionMessage(
  _message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender,
  _sendResponse: (...args: any) => any,
) {}
