const vscode = require('vscode')
const fs = require('fs')

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    const disposable = vscode.commands.registerCommand('revealjsLivePreview.start', function () {
        const editor = vscode.window.activeTextEditor
        if (!editor) {
            vscode.window.showErrorMessage('Open a Markdown file to preview slides.')
            return
        }

        const filePath = editor.document.fileName
        const panel = vscode.window.createWebviewPanel(
            'revealjsPreview',
            'Reveal.js Preview',
            vscode.ViewColumn.Two,
            { enableScripts: true }
        )

        function updatePreview() {
            const markdownContent = fs.readFileSync(filePath, 'utf8')
            panel.webview.html = getWebviewContent(markdownContent, panel.webview)
        }

        updatePreview()

        // Watch file for changes
        fs.watch(filePath, { encoding: 'utf8' }, updatePreview)

        vscode.workspace.onDidChangeTextDocument((event) => {
            if (event.document.fileName === filePath) {
                updatePreview()
            }
        })
    })

    context.subscriptions.push(disposable)
}

/**
 * Generates HTML for the Reveal.js preview.
 * @param {string} markdownContent
 * @returns {string} HTML string
 */
function getWebviewContent(markdownContent) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reveal.js Preview</title>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js/dist/theme/white.css">
  <script src="https://cdn.jsdelivr.net/npm/reveal.js/plugin/markdown/markdown.js"></script>
  <script>
    function startReveal() {
      Reveal.initialize({
        plugins: [ RevealMarkdown ]
      });
    }
  </script>
</head>
<body onload="startReveal()">
  <div class="reveal">
    <div class="slides">
      <section data-markdown>
        <textarea data-template>${markdownContent}</textarea>
      </section>
    </div>
  </div>
</body>
</html>`
}

function deactivate() {}

module.exports = { activate, deactivate }
