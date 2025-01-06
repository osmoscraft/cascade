import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { keymap } from "@codemirror/view";
import { EditorView, minimalSetup } from "codemirror";

import "./code-editor-element.css";

export function defineCodeEditorElement() {
  customElements.define("code-editor-element", CodeEditorElement);
}

export class CodeEditorElement extends HTMLElement {
  static observedAttributes = ["value"];

  private editorView: EditorView | null = null;

  connectedCallback() {
    this.editorView = new EditorView({
      extensions: [
        keymap.of([
          {
            key: "Ctrl-Enter",
            run: () => {
              this.dispatchEvent(new CustomEvent("run", { bubbles: true }));
              return true;
            },
          },
        ]),
        minimalSetup,
        oneDark,
        javascript(),
        EditorView.lineWrapping,
        EditorView.focusChangeEffect.of((state, focusing) => {
          if (focusing) return null;
          this.dispatchEvent(new CustomEvent("change", { detail: state.doc.toString() }));
          return null;
        }),
      ],
      parent: this,
    });

    if (this.hasAttribute("value")) {
      this.value = this.getAttribute("value") ?? "";
    }
  }

  attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
    if (name === "value") {
      this.value = newValue;
    }
  }

  set value(value: string) {
    this.editorView?.dispatch({
      changes: {
        from: 0,
        to: this.editorView.state.doc.length,
        insert: value,
      },
    });
  }

  get value() {
    return this.editorView?.state.doc.toString() ?? "";
  }

  appendText(text: string) {
    const length = this.editorView?.state.doc.length ?? 0;
    this.editorView?.dispatch({
      changes: {
        from: length,
        to: length,
        insert: text,
      },
    });
  }
}
