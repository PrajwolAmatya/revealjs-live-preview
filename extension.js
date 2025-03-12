const vscode = require('vscode')
const path = require('path')
const fs = require('fs')

// Updates the preview with latest changes
function updatePreview(filePath, context, panel) {
    const markdownContent = fs.readFileSync(filePath, 'utf8')

    // Get user settings
    const config = vscode.workspace.getConfiguration('revealjsLivePreview')
    const selectedTheme = config.get('theme', 'white')
    const dataSeparator = config.get('dataSeparator', '\r?\n---\r?\n')
    const dataSeparatorVertical = config.get('dataSeparatorVertical', '\r?\n--\r?\n')

    // Reveal.js configs
    const revealConfig = {
        controls: config.get('revealjsLivePreview.controls', true),
        controlsTutorial: config.get('revealjsLivePreview.controlsTutorial', true),
        controlsLayout: config.get('revealjsLivePreview.controlsLayout', 'bottom-right'),
        controlsBackArrows: config.get('revealjsLivePreview.controlsBackArrows', 'faded'),
        progress: config.get('revealjsLivePreview.progress', true),
        slideNumber: config.get('revealjsLivePreview.slideNumber', false),
        showSlideNumber: config.get('revealjsLivePreview.showSlideNumber', 'all'),
        hashOneBasedIndex: config.get('revealjsLivePreview.hashOneBasedIndex', false),
        hash: config.get('revealjsLivePreview.hash', false),
        respondToHashChanges: config.get('revealjsLivePreview.respondToHashChanges', true),
        transition: config.get('revealjsLivePreview.transition', 'slide'),
        transitionSpeed: config.get('revealjsLivePreview.transitionSpeed', 'default'),
        backgroundTransition: config.get('revealjsLivePreview.backgroundTransition', 'fade'),
        autoSlide: config.get('revealjsLivePreview.autoSlide', 0),
        autoSlideStoppable: config.get('revealjsLivePreview.autoSlideStoppable', true),
        mouseWheel: config.get('revealjsLivePreview.mouseWheel', false),
        pdfSeparateFragments: config.get('revealjsLivePreview.pdfSeparateFragments', true),
        hideInactiveCursor: config.get('revealjsLivePreview.hideInactiveCursor', true),
        hideCursorTime: config.get('revealjsLivePreview.hideCursorTime', 5000)
    }
    const revealConfigString = JSON.stringify(revealConfig)

    panel.webview.html = getWebviewContent(
        markdownContent,
        panel.webview,
        context,
        selectedTheme,
        dataSeparator,
        dataSeparatorVertical,
        revealConfigString
    )
}

// Activates the extension
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

        updatePreview(filePath, context, panel)

        // Watch file for changes
        fs.watch(filePath, { encoding: 'utf8' }, () => {
            updatePreview(filePath, context, panel)
        })

        vscode.workspace.onDidChangeTextDocument((event) => {
            if (event.document.fileName === filePath) {
                updatePreview(filePath, context, panel)
            }
        })
    })

    context.subscriptions.push(disposable)
}

// Generates HTML for preview
function getWebviewContent(
    markdownContent,
    webview,
    context,
    theme,
    dataSeparator,
    dataSeparatorVertical,
    revealConfigString
) {
    const revealBasePath = vscode.Uri.file(
        path.join(context.extensionPath, 'node_modules', 'reveal.js')
    )
    const revealCss = webview.asWebviewUri(
        vscode.Uri.file(path.join(revealBasePath.fsPath, 'dist', 'reveal.css'))
    )
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
    const notesPlugin = webview.asWebviewUri(
        vscode.Uri.file(path.join(revealBasePath.fsPath, 'plugin', 'notes', 'notes.js'))
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
  <script src="${notesPlugin}"></script>
  <script>
    const config = ${revealConfigString}
    Reveal.initialize({
        ...config,
      plugins: [ RevealMarkdown, RevealHighlight, RevealNotes ]
    });
  </script>
</body>
</html>`
}

module.exports = { activate }
