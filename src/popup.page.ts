import { editor, KeyCode, KeyMod } from "monaco-editor";
import { createJSONEditor } from "vanilla-jsoneditor";
import type { ExtensionMessage } from "./typings/message";
import { $ } from "./utils/dom";

import "./styles/elements.css";
import "./styles/reset.css";
import "./styles/theme.css";

import "./popup.page.css";

// poc load monaco
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

const jsonEditor = createJSONEditor({
  target: $<HTMLDivElement>("#json-editor")!,
  props: {
    navigationBar: false,
    statusBar: false,
    indentation: 2,
    tabSize: 2,
  },
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

/* Event registrations */
chrome.runtime.onMessage.addListener(handleExtensionMessage);

// on dragging resizeHandle element, resize the json-editor by adjusting its height
$("#resize-handle")!.addEventListener("mousedown", (e) => {
  e.preventDefault();

  const startY = (e as MouseEvent).clientY;
  const startHeightPxString = monacoContainer.style.height;
  const startHeight = parseInt(startHeightPxString, 10);

  const onMouseMove = (e: MouseEvent) => {
    const diff = e.clientY - startY;
    monacoContainer.style.height = `${startHeight + diff}px`;
  };

  const onMouseUp = () => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
});

async function handleExtensionMessage(
  _message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender,
  _sendResponse: (...args: any) => any,
) {}

$<HTMLButtonElement>("#test")?.addEventListener("click", () => {
  chrome.tabs.query({}, (tabs) => {
    console.log(tabs);
  });
  chrome.runtime.sendMessage({
    test: true,
  } satisfies ExtensionMessage);
});
