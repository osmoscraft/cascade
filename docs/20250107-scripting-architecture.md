# Scripting Architecture

- Option 1: DevTools API
  - Have access to inspector API, e.g. cursor select element to $0 variable
- Option 2: Offscreen document + iframe
  - Extension can run and carry data across multiple pages
- Option 3: UserScripts API

## Findings

- Main page scripting
  - ref: https://stackoverflow.com/questions/77578840/how-to-apply-dynamic-user-scripts-to-a-particular-tab-in-chrome-mv3-extension-u
- Background page iframe scripting
  - ref: https://groups.google.com/a/chromium.org/g/chromium-extensions/c/rMKJc8Yy9nU
  - No dynamic injection due to lack of tabId
