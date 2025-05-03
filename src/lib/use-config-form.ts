export const openaiApiKeyStorageKey = "cascade:openai-api-key";

export function getOpenAIApiKey() {
  return localStorage.getItem(openaiApiKeyStorageKey) ?? "";
}

export function useConfigForm(form: HTMLFormElement) {
  form.querySelector<HTMLInputElement>(`[name="openai-api-key"]`)!.value =
    localStorage.getItem(openaiApiKeyStorageKey) ?? "";

  form!.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const openaiApiKey = formData.get("openai-api-key") as string;
    localStorage.setItem(openaiApiKeyStorageKey, openaiApiKey);
  });
}
