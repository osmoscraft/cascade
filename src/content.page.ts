console.log("content script going live");

document.addEventListener(
  "keydown",
  (e) => {
    // ctrl + k
    if (e.ctrlKey && e.key === "k") {
      e.preventDefault();

      console.log("ctrl + k pressed");
      // open the dialog

      const container = document.querySelector("#prompt-dialog") as HTMLDialogElement;
      container.showModal();
    }
  },
  {
    capture: true,
  },
);

const dialog = document.createElement("dialog");
dialog.innerHTML = `
<style>
@scope {
  font-size: 16px;
  color-scheme: dark;
  padding: 16px;
  margin: auto;
  max-width: calc(100% - 32px);
  max-height: calc(100% - 32px);
}
</style>

<command-widget></command-widget>
`;

dialog.id = "prompt-dialog";
document.body.appendChild(dialog);

class CommandWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot!.innerHTML = `
<form method="dialog">
  <input type="text" placeholder="Type your command here..." />
  <button>Run</button>
</form>
    `;
  }

  connectedCallback() {
    this.shadowRoot!.querySelector("form")!.addEventListener("submit", (e) => {
      debugger;
      // send task to background script for processing
    });
    this.shadowRoot!.querySelector("input")!.addEventListener(
      "keydown",
      // prevent input from leaking outside of the dialog
      (e) => e.stopImmediatePropagation(),
      { capture: true },
    );
  }
}

customElements.define("command-widget", CommandWidget);
