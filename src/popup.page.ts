import { editor } from "monaco-editor";
import type { ExtensionMessage } from "./typings/message";
import { $ } from "./utils/dom";

import "./styles/elements.css";
import "./styles/reset.css";
import "./styles/theme.css";

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

/* Elements */
// const codeEditor = $<HTMLTextAreaElement>("#code-editor")!;
const outputElement = $<HTMLDivElement>("#output")!;

/* Event registrations */
chrome.runtime.onMessage.addListener(handleExtensionMessage);
// codeEditor.addEventListener("run", handleTest);

/* Handlers */

// async function handleTest() {
//   const script = codeEditor.value;
//   const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
//   if (!tab) return;

//   const result = await chrome.scripting.executeScript({
//     target: { tabId: tab.id! },
//     func: (script: string) => {
//       return window.eval(script);
//     },
//     args: [script],
//     world: "MAIN",
//   });

//   outputElement.innerText = JSON.stringify(result[0]?.result, null, 2);
// }

async function handleExtensionMessage(
  _message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender,
  _sendResponse: (...args: any) => any,
) {}
