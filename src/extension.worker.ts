import type { ExtensionMessage } from "./typings/message";

chrome.action.onClicked.addListener(handleActionClick);
chrome.runtime.onMessage.addListener(handleExtensionMessage);

function handleActionClick() {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));
}

async function handleExtensionMessage(message: ExtensionMessage) {}
