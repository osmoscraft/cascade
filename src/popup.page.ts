import { createJSONEditor } from "vanilla-jsoneditor";
import { useMonaco } from "./lib/use-monaco";
import { useTabs } from "./lib/use-tabs";
import "./popup.page.css";
import "./styles/elements.css";
import "./styles/reset.css";
import "./styles/theme.css";
import type { ExtensionMessage } from "./typings/message";
import { $, $all, $new } from "./utils/dom";

chrome.runtime.onMessageExternal.addListener(handleExtensionMessage);
async function handleExtensionMessage(
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender,
  _sendResponse: (...args: any) => any,
) {
  if (message.selected !== undefined) {
    console.log(`[selected]`, message.selected);
    const removeButton = $new("button", {}, ["remove"]);
    removeButton.addEventListener("click", (e) => (e.target as HTMLElement)?.parentElement?.remove());
    const newElement = $new("div", {}, [
      removeButton,
      message.selected.isPositive ? "(+) " : "(-) ",
      $new("span", {}, [message.selected.tagPath ?? "?"]),
    ]);
    $("#selected-elements")?.append(newElement);
  }
}

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

// select elements from the page
$all("#select-positive,#select-negative").forEach((selectTrigger) =>
  selectTrigger.addEventListener("click", async (e) => {
    const isPositive = (e.target as HTMLElement).id === "select-positive";

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    const output = await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      args: [chrome.runtime.id, isPositive] as const,
      func: async (extensionId, isPositive) => {
        // abort previous selection
        (globalThis as any)._selection_ac?.abort?.();

        const ac = new AbortController();
        (globalThis as any)._selection_ac = ac;

        window.addEventListener(
          "mouseover",
          (e) => {
            e.preventDefault();
            document
              .querySelectorAll("[data-extension-selection]")
              .forEach((e) => e.removeAttribute("data-extension-selection"));

            const target = e.target as HTMLElement;
            target.setAttribute("data-extension-selection", "true");
          },
          { signal: ac.signal, capture: true },
        );

        window.addEventListener(
          "click",
          (e) => {
            e.preventDefault();
            console.log("will send", { element: e.target, extensionId, isPositive });

            function getTagPath(e: MouseEvent) {
              return document
                .elementsFromPoint(e.clientX, e.clientY)
                .map((el) => (el as HTMLElement).localName)
                .reverse()
                .join(" > ");
            }

            chrome.runtime.sendMessage(extensionId, {
              selected: {
                isPositive,
                tagPath: getTagPath(e),
                textContent: (e.target as HTMLElement).textContent ?? "",
              },
            } satisfies ExtensionMessage);
          },
          { signal: ac.signal, capture: true },
        );

        // inject style sheet
        const style = document.createElement("style");
        style.innerHTML = `
        [data-extension-selection] {
          outline: 2px solid ${isPositive ? `#00ff00` : `#ff0000`};
          outline-offset: -2px;
          background-color: ${isPositive ? `rgba(0, 255, 0, 0.2)` : `rgba(255, 0, 0, 0.2)`};
        }
          `;

        ac.signal.addEventListener("abort", () => {
          style.remove();
          document
            .querySelectorAll("[data-extension-selection]")
            .forEach((e) => e.removeAttribute("data-extension-selection"));
        });
        document.head.appendChild(style);
      },
      world: "MAIN",
    });

    console.log(`started selection mode`);
  }),
);

$("#stop-selection")!.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  const output = await chrome.scripting.executeScript({
    target: { tabId: tab.id! },
    func: async () => {
      (globalThis as any)._selection_ac?.abort?.();
    },
    world: "MAIN",
  });
});
