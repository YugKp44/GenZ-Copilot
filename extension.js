const vscode = require("vscode");
const { Groq } = require("groq-sdk");
const path = require("path");
const dotenvPath = path.join(__dirname, ".env");
require("dotenv").config({ path: dotenvPath });

// Initialize Groq API
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Activate the extension.
 * @param {vscode.ExtensionContext} context - The extension context.
 */
function activate(context) {
  console.log("AI Copilot Extension Activated!");

  // Register an inline completion provider for all programming languages
  const inlineCompletionProvider = vscode.languages.registerInlineCompletionItemProvider(
    { scheme: "file", language: "*" }, // Apply to all file types
    {
      async provideInlineCompletionItems(document, position) {
        try {
          const editor = vscode.window.activeTextEditor;
          if (!editor) return { items: [] };

          const languageId = document.languageId; // Detect file language
          const precedingText = document.getText(
            new vscode.Range(new vscode.Position(0, 0), position)
          );
          const currentLine = document.lineAt(position.line).text.trim();

          console.log("Language Detected:", languageId);
          console.log("Current Line:", currentLine);

          // Construct prompt with file language and additional context
          const prompt = `You are an expert ${languageId} developer. 
          Based on the following code and comments, provide the next lines of executable code.
          Strictly avoid unnecessary comments and return only executable code:
          
          ${precedingText}\n${currentLine}`;
          console.log("Prompt sent to Groq API:", prompt);

          // Call Groq API to get a suggestion
          const response = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.1-8b-instant", // Replace with a valid model
          });

          let suggestionText = response.choices[0]?.message?.content?.trim();
          if (!suggestionText) return { items: [] };

          // Filter out any remaining comments (as a safety measure)
          suggestionText = filterOnlyCode(suggestionText);

          console.log("Filtered Suggestion:", suggestionText);

          // Return inline completion item
          return {
            items: [
              {
                insertText: suggestionText,
                range: new vscode.Range(position, position),
              },
            ],
          };
        } catch (error) {
          console.error("Error in provideInlineCompletionItems:", error.message || error.response?.data);
          return { items: [] };
        }
      },
    }
  );

  context.subscriptions.push(inlineCompletionProvider);
}

/**
 * Filters response to return only executable code.
 * @param {string} text - The text to filter.
 * @returns {string} - Filtered code.
 */
function filterOnlyCode(text) {
  const lines = text.split("\n");
  return lines
    .filter((line) => {
      const trimmed = line.trim();
      return (
        !trimmed.startsWith("#") && // Exclude Python-style comments
        !trimmed.startsWith("//") && // Exclude single-line comments
        !trimmed.startsWith("/*") && // Exclude block comments
        !trimmed.endsWith("*/") // Exclude closing block comments
      );
    })
    .join("\n");
}

/**
 * Deactivate the extension.
 */
function deactivate() {
  console.log("AI Copilot Extension Deactivated!");
}

// Export the activate and deactivate functions
module.exports = {
  activate,
  deactivate,
};
