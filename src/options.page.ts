import "./styles/elements.css";
import "./styles/reset.css";
import "./styles/theme.css";

import type { ExtensionMessage } from "./typings/message";

chrome.runtime.onMessage.addListener(handleExtensionMessage);

async function handleExtensionMessage(
  _message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender,
  _sendResponse: (...args: any) => any
) {}
