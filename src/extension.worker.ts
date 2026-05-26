import type { ExtensionMessage } from "./typings/message";
import { setupOffscreenDocument } from "./utils/offscreen";

chrome.action.onClicked.addListener(handleActionClick);
chrome.runtime.onMessageExternal.addListener(handleExternalMessage);
chrome.runtime.onInstalled.addListener(handleExtensionInstall);
chrome.runtime.onStartup.addListener(handleBrowserStart);

function handleActionClick() {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));
}

function handleExternalMessage(
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void,
) {
  void relayExtensionMessage(message, sendResponse);
  return true;
}

async function relayExtensionMessage(message: ExtensionMessage, sendResponse: (response?: unknown) => void) {
  try {
    await chrome.runtime.sendMessage(message);
    sendResponse({ ok: true });
  } catch (error) {
    console.error("Failed to relay external message", error);
    sendResponse({ ok: false });
  }
}

const backgroundPageParameters: chrome.offscreen.CreateParameters | null = chrome.offscreen
  ? {
      url: chrome.runtime.getURL("background.html"),
      reasons: [chrome.offscreen.Reason.IFRAME_SCRIPTING],
      justification: "Use javascript to query and update a DOM in a sandboxed iframe.",
    }
  : null;

async function handleExtensionInstall() {
  await ensureOffscreenDocument();
}

async function handleBrowserStart() {
  await ensureOffscreenDocument();
}

async function ensureOffscreenDocument() {
  if (!backgroundPageParameters) {
    console.warn("Offscreen API unavailable; skipping offscreen document setup.");
    return;
  }

  await setupOffscreenDocument(backgroundPageParameters);
}
