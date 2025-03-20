const vscode = require('vscode')
const path = require('path')
const fs = require('fs')

function isValidRegex(str) {
    if (typeof str !== 'string' || str.trim() === '') {
        return false
    }
    try {
        new RegExp(str)
        return true
    } catch {
        return false
    }
}

// Updates the preview with latest changes
function updatePreview(filePath, context, panel) {
    const markdownContent = fs.readFileSync(filePath, 'utf8')
    const fileName = path.basename(filePath, path.extname(filePath))

    // Get user settings
    const config = vscode.workspace.getConfiguration('revealjsLivePreview')
    const selectedTheme = config.get('theme', 'white')
    let dataSeparator = config.get('dataSeparator', '\\r?\\n---\\r?\\n')
    if (!isValidRegex(dataSeparator)) {
        vscode.window.showErrorMessage(`Invalid regex ${dataSeparator} for horizontal slide separator. Using default: \\r?\\n---\\r?\\n`)
        dataSeparator = '\\r?\\n---\\r?\\n'
    }
    
    let dataSeparatorVertical = config.get('dataSeparatorVertical', '\\r?\\n--\\r?\\n')
    if (!isValidRegex(dataSeparatorVertical)) {
        vscode.window.showErrorMessage(`Invalid regex ${dataSeparatorVertical} for vertical slide separator. Using default: \\r?\\n--\\r?\\n`)
        dataSeparatorVertical = '\\r?\\n--\\r?\\n'
    }
    // Reveal.js configs
    const revealConfig = {
        controls: config.get('controls', true),
        controlsTutorial: config.get('controlsTutorial', true),
        controlsLayout: config.get('controlsLayout', 'bottom-right'),
        controlsBackArrows: config.get('controlsBackArrows', 'faded'),
        progress: config.get('progress', true),
        slideNumber: config.get('slideNumber', false),
        showSlideNumber: config.get('showSlideNumber', 'all'),
        hashOneBasedIndex: config.get('hashOneBasedIndex', false),
        hash: config.get('hash', false),
        respondToHashChanges: config.get('respondToHashChanges', true),
        transition: config.get('transition', 'slide'),
        transitionSpeed: config.get('transitionSpeed', 'default'),
        backgroundTransition: config.get('backgroundTransition', 'fade'),
        autoSlide: config.get('autoSlide', 0),
        autoSlideStoppable: config.get('autoSlideStoppable', true),
        mouseWheel: config.get('mouseWheel', false),
        pdfSeparateFragments: config.get('pdfSeparateFragments', true),
        hideInactiveCursor: config.get('hideInactiveCursor', true),
        hideCursorTime: config.get('hideCursorTime', 5000)
    }
    const revealConfigString = JSON.stringify(revealConfig)

    panel.title = fileName
    panel.webview.html = getWebviewContent(
        fileName,
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
                enableScripts: true
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
    fileName,
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
    const highlightThemeCss = webview.asWebviewUri(
        vscode.Uri.file(path.join(revealBasePath.fsPath, 'plugin', 'highlight', 'monokai.css'))
    )
    const resetCss = webview.asWebviewUri(
        vscode.Uri.file(path.join(revealBasePath.fsPath, 'dist', 'reset.css'))
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
  <title>${fileName}</title>
  <link rel="stylesheet" href="${revealCss}">
  <link rel="stylesheet" href="${resetCss}">
  <link rel="stylesheet" href="${themeCss}">
  <link rel="stylesheet" href="${highlightThemeCss}">
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
