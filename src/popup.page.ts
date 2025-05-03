import { createJSONEditor } from "vanilla-jsoneditor";
import { generateQueryScript, type ExampleElement } from "./lib/code-gen";
import { useConfigForm } from "./lib/use-config-form";
import { useMonaco } from "./lib/use-monaco";
import { useTabs } from "./lib/use-tabs";
import "./popup.page.css";
import "./styles/elements.css";
import "./styles/reset.css";
import "./styles/theme.css";
import type { ExtensionMessage } from "./typings/message";
import { $, $all, $new } from "./utils/dom";

let selectionAbortControllers: AbortController[] = [];
let codeGenAbortControllers: AbortController[] = [];

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
    const newElement = $new(
      "div",
      {
        "data-full-path": message.selected.fullPath,
        "data-is-positive": message.selected.isPositive.toString(),
      },
      [
        removeButton,
        message.selected.isPositive ? "(+) " : "(-) ",
        $new(
          "span",
          {
            title: message.selected.fullPath,
          },
          [message.selected.shortPath],
        ),
      ],
    );
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
const editor = useMonaco({
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

        let currentStack: Element[] = [];

        window.addEventListener(
          "mouseover",
          (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            document
              .querySelectorAll("[data-extension-selection]")
              .forEach((e) => e.removeAttribute("data-extension-selection"));

            const stack = document.elementsFromPoint(e.clientX, e.clientY);
            currentStack = stack;
            stack.at(0)?.setAttribute("data-extension-selection", "true");
          },
          { signal: ac.signal, capture: true },
        );

        // on right click, remove the first element from the stack and select the next avaialble in the stack
        window.addEventListener(
          "contextmenu",
          (e) => {
            e.preventDefault();
            if (currentStack.length === 1) return;
            const nextElement = currentStack.shift();
            if (nextElement) {
              document
                .querySelectorAll("[data-extension-selection]")
                .forEach((e) => e.removeAttribute("data-extension-selection"));
              nextElement.setAttribute("data-extension-selection", "true");
            }
          },
          { signal: ac.signal, capture: true },
        );

        // on escape, abort
        window.addEventListener(
          "keydown",
          (e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              ac.abort();
              console.log("aborted selection");
            }
          },
          { signal: ac.signal, capture: true },
        );

        /**
         * add nth-child if an element has sibling
         * include id
         * include all the class names and attributes
         * @example html > body > div:nth-child(1) > div#main > div.container > p[data-active]
         */
        function printSelectorPath() {
          const path = currentStack
            .toReversed()
            .map((e) => {
              // html and body should be directly returned
              if (e.localName === "html" || e.localName === "body") return e.localName;

              const id = e.id ? `#${e.id}` : "";
              const classes = e.className?.trim() ? `.${e.className?.trim().split(" ").join(".")}` : "";
              const attributes = Array.from(e.attributes)
                .filter(
                  (attr) => attr.name !== "id" && attr.name !== "class" && attr.name !== "data-extension-selection",
                )
                .map((attr) => `[${attr.name}="${attr.value}"]`)
                .join("");
              const nthChild =
                (e.parentElement?.children?.length ?? 0) > 1
                  ? `:nth-child(${Array.from(e.parentElement!.children).indexOf(e) + 1})`
                  : "";
              return `${e.localName}${id}${classes}${attributes}${nthChild}`;
            })
            .join(" > ");
          return path;
        }

        function printShortPath() {
          const path = currentStack
            .toReversed()
            .map((e) => e.localName)
            .join(" > ");
          return path;
        }

        window.addEventListener(
          "click",
          (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            const selectedElement = document.querySelector("[data-extension-selection]");
            console.log("will send", { element: selectedElement, extensionId, isPositive });

            chrome.runtime.sendMessage(extensionId, {
              selected: {
                isPositive,
                shortPath: printShortPath(),
                fullPath: printSelectorPath(),
                textContent: selectedElement?.textContent ?? "",
                innerHTML: selectedElement?.innerHTML ?? "",
                outerHTML: selectedElement?.outerHTML ?? "",
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
    const abortController = new AbortController();
    abortController.signal.addEventListener("abort", async () => {
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

    selectionAbortControllers = [...selectionAbortControllers, abortController];
  }),
);

$("#stop-selection")!.addEventListener("click", async () => {
  selectionAbortControllers.forEach((ac) => ac.abort());
  selectionAbortControllers = [];
});

// escape to abort any task
window.addEventListener("keydown", async (e) => {
  if (e.key === "Escape") {
    if (selectionAbortControllers.length || codeGenAbortControllers.length) {
      e.preventDefault();
      selectionAbortControllers.forEach((ac) => ac.abort());
      selectionAbortControllers = [];
      codeGenAbortControllers.forEach((ac) => ac.abort());
      codeGenAbortControllers = [];
    }
  }
});

// config form
useConfigForm($("#config-form")!);

// code gen
$("#generate-code")!.addEventListener("click", async () => {
  const instruction = $<HTMLTextAreaElement>("#instruction")?.value ?? "";
  const examples: ExampleElement[] = [...$all<HTMLElement>("#selected-elements > div")].map((e) => ({
    isPositive: e.dataset.isPositive === "true",
    fullPath: e.dataset.fullPath ?? "",
    innerHTML: e.innerHTML,
  }));

  // switch to script tab
  $<HTMLButtonElement>("#script-tab-trigger")?.click();
  // clear code editor
  editor.clear();
  const abortController = new AbortController();
  codeGenAbortControllers = [...codeGenAbortControllers, abortController];

  if (!examples.length && !instruction) {
    editor.append(`// ERROR: Missing instruction and examples\n`);
    return;
  }

  const finalInstruction = instruction.trim() ? instruction : "Scrap data based on the examples";
  const response = await generateQueryScript({
    elements: examples,
    instruction: finalInstruction,
    signal: abortController.signal,
  });

  for await (const res of response) {
    if (res.type !== "response.output_text.delta") continue;
    editor.append(res.delta);
  }

  editor.append("\n\n// Press Ctrl/Cmd + Enter to run");
});
