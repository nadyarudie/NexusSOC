export async function generateMarkdown(content, isUrl = false) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

  const systemPrompt =
    "You are an automated document parsing engine. Your job is to format the provided raw text into clean, highly readable Markdown. Use headings, bullet points, code blocks, bold text, and tables where appropriate to logically organize the unstructured data. Output ONLY the raw Markdown text. Do NOT wrap the entire response in ```markdown...``` backticks. Do NOT add conversational text.";

  let payload = {
    contents: [],
    systemInstruction: { parts: [{ text: systemPrompt }] },
  };

  if (!isUrl) {
    let extractedText = content;
    const maxLength = 80000;
    if (extractedText.length > maxLength) {
      extractedText = extractedText.substring(0, maxLength) + "\n\n...[content truncated due to length]";
    }
    payload.contents.push({ parts: [{ text: "Please format the following document text into Markdown:\n\n" + extractedText }] });
  } else {
    payload.contents.push({ parts: [{ text: "Read the content from this URL and provide a detailed, well-structured markdown summary of its contents: " + content }] });
    payload.tools = [{ google_search: {} }];
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (result.candidates && result.candidates[0] && result.candidates[0].content) {
    let md = result.candidates[0].content.parts[0].text;
    return md.replace(/^```(markdown)?\n/i, '').replace(/\n```$/i, '');
  } else {
    throw new Error("Could not generate markdown from the API response.");
  }
}