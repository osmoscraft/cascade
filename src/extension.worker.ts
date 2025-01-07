import type { ExtensionMessage } from "./typings/message";
import { setupOffscreenDocument } from "./utils/offscreen";

chrome.action.onClicked.addListener(handleActionClick);
chrome.runtime.onMessage.addListener(handleExtensionMessage);
chrome.runtime.onInstalled.addListener(handleExtensionInstall);
chrome.runtime.onStartup.addListener(handleBrowserStart);

function handleActionClick() {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));
}

async function handleExtensionMessage(message: ExtensionMessage) {}

const backgroundPageParameters: chrome.offscreen.CreateParameters = {
  url: chrome.runtime.getURL("background.html"),
  reasons: [chrome.offscreen.Reason.IFRAME_SCRIPTING],
  justification: "Use javascript to query and update a DOM in a sandboxed iframe.",
};

async function handleExtensionInstall() {
  await setupOffscreenDocument(backgroundPageParameters);
}

async function handleBrowserStart() {
  await setupOffscreenDocument(backgroundPageParameters);
}
