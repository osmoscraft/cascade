import { createJSONEditor } from "vanilla-jsoneditor";
import { useMonaco } from "./lib/use-monaco";
import { useTabs } from "./lib/use-tabs";
import "./popup.page.css";
import "./styles/elements.css";
import "./styles/reset.css";
import "./styles/theme.css";
import type { ExtensionMessage } from "./typings/message";
import { $ } from "./utils/dom";

/* Event registrations */
chrome.runtime.onMessage.addListener(handleExtensionMessage);

// Tabs
useTabs(document.querySelector<HTMLElement>(`[role="tablist"]`)!);

// JSON editor
const jsonEditor = createJSONEditor({
  target: $<HTMLDivElement>("#json-editor")!,
  props: {
    navigationBar: false,
    statusBar: false,
    indentation: 2,
    tabSize: 2,
  },
});

// Code editor
useMonaco({
  onRun: async (value) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    const output = await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: async (script: string) => {
        const scriptUri = `data:text/javascript;charset=utf-8,${encodeURIComponent(`/** ${Date.now()} */\n` + script)}`;
        const result = await window.eval(`import(${JSON.stringify(scriptUri)})`);
        console.log(`[eval native]`, result);
        return result.default;
      },
      args: [value],
      world: "MAIN",
    });

    console.log(`[eval output]`, output);

    jsonEditor.set({ json: output.at(0)?.result });
  },
});

// on dragging resizeHandle element, resize the target element
$("#resize-handle")!.addEventListener("mousedown", (e) => {
  e.preventDefault();

  const startY = (e as MouseEvent).clientY;
  const resizeTarget = document.querySelector("#resize-target") as HTMLDivElement;
  const startHeightPxString = resizeTarget.style.height;
  const startHeight = parseInt(startHeightPxString, 10);

  const onMouseMove = (e: MouseEvent) => {
    const diff = e.clientY - startY;
    resizeTarget.style.height = `${startHeight + diff}px`;
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
