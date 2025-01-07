import type { ExtensionMessage } from "./typings/message";

chrome.runtime.onMessage.addListener(handleExtensionMessage);

async function handleExtensionMessage(
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender,
  _sendResponse: (...args: any) => any,
) {
  if (message.test) {
    console.log("Received test message");

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      console.log(tabs);
    });
  }
}
