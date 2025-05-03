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
      $new(
        "span",
        {
          title: message.selected.fullPath,
        },
        [message.selected.shortPath],
      ),
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

        let currentStack: Element[] = [];

        window.focus();

        window.addEventListener(
          "mouseover",
          (e) => {
            e.preventDefault();
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
              const classes = e.className ? `.${e.className.split(" ").join(".")}` : "";
              const attributes = Array.from(e.attributes)
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

// on extension page escape, abort
window.addEventListener("keydown", async (e) => {
  if (e.key === "Escape") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    const output = await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: async () => {
        (globalThis as any)._selection_ac?.abort?.();
      },
      world: "MAIN",
    });
  }
});
