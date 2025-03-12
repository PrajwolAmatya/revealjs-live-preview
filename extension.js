const vscode = require('vscode')
const path = require('path')
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
            { 
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(context.extensionPath, 'node_modules', 'reveal.js'))
                ]
            }
        )

        function updatePreview() {
            const markdownContent = fs.readFileSync(filePath, 'utf8')

            // Get user settings
            const config = vscode.workspace.getConfiguration('revealjsLivePreview')
            const selectedTheme = config.get('theme', 'white')
            const dataSeparator = config.get('dataSeparator', '\r?\n---\r?\n')
            const dataSeparatorVertical = config.get('dataSeparatorVertical', '\r?\n--\r?\n')

            panel.webview.html = getWebviewContent(markdownContent, panel.webview, context, selectedTheme, dataSeparator, dataSeparatorVertical)
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
function getWebviewContent(markdownContent, webview, context, theme, dataSeparator, dataSeparatorVertical) {
    const revealBasePath = vscode.Uri.file(
        path.join(context.extensionPath, 'node_modules', 'reveal.js')
    )

    const revealCss = webview.asWebviewUri(
        vscode.Uri.file(path.join(revealBasePath.fsPath, 'dist', 'reveal.css'))
    )

    // Use the user-selected theme dynamically
    const themeCss = webview.asWebviewUri(
        vscode.Uri.file(path.join(revealBasePath.fsPath, 'dist', 'theme', `${theme}.css`))
    )

    const revealJs = webview.asWebviewUri(
        vscode.Uri.file(path.join(revealBasePath.fsPath, 'dist', 'reveal.js'))
    )
    const markdownPlugin = webview.asWebviewUri(
        vscode.Uri.file(path.join(revealBasePath.fsPath, 'plugin', 'markdown', 'markdown.js'))
    )
    const highlightPlugin = webview.asWebviewUri(
        vscode.Uri.file(path.join(revealBasePath.fsPath, 'plugin', 'highlight', 'highlight.js'))
    )

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reveal.js Preview</title>
  <link rel="stylesheet" href="${revealCss}">
  <link rel="stylesheet" href="${themeCss}">
</head>
<body>
  <div class="reveal">
    <div class="slides">
      <section data-markdown 
        data-separator="${dataSeparator}"
        data-separator-vertical="${dataSeparatorVertical}">
        <textarea data-template>${markdownContent}</textarea>
      </section>
    </div>
  </div>
  <script src="${revealJs}"></script>
  <script src="${markdownPlugin}"></script>
  <script src="${highlightPlugin}"></script>
  <script>
    Reveal.initialize({
      plugins: [ RevealMarkdown, RevealHighlight ]
    });
  </script>
</body>
</html>`
}

function deactivate() {}

module.exports = { activate, deactivate }
