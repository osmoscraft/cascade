import "./styles/elements.css";
import "./styles/reset.css";
import "./styles/theme.css";
import type { ExtensionMessage } from "./typings/message";
import { $ } from "./utils/dom";

/* Elements */
const loadButton = $<HTMLButtonElement>("#load")!;
const codeEditor = $<HTMLTextAreaElement>("#code-editor")!;
const testButton = $<HTMLButtonElement>("#test")!;
const outputElement = $<HTMLDivElement>("#output")!;

/* Event registrations */
chrome.runtime.onMessage.addListener(handleExtensionMessage);
loadButton.addEventListener("click", handleLoad);
testButton.addEventListener("click", handleTest);

/* Handlers */

async function handleTest() {
  const script = codeEditor.value;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const result = await chrome.scripting.executeScript({
    target: { tabId: tab.id! },
    func: (script: string) => {
      return eval(script);
    },
    args: [script],
    world: "MAIN",
  });

  outputElement.innerText = JSON.stringify(result[0]?.result, null, 2);
}

async function handleLoad() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const result = await chrome.scripting.executeScript({
    target: { tabId: tab.id! },
    func: () => {
      const clone = document.importNode(document.documentElement, true);

      clone.querySelectorAll("script,link,style").forEach((style) => style.remove());

      clone.querySelectorAll("*").forEach((el) => {
        const attrs = el.getAttributeNames();
        attrs.forEach((attr) => {
          if (attr !== "id") {
            el.removeAttribute(attr);
          }
        });
      });

      eval("console.log(42)");
      return clone.querySelector("article")?.outerHTML;
    },
    world: "MAIN",
  });

  const html = result[0]?.result;
  console.log({ html });
}

async function handleExtensionMessage(
  _message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender,
  _sendResponse: (...args: any) => any,
) {}
