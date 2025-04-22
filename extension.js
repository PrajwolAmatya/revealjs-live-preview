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

// Global variable to store slide state
let globalSlideState = {
    indexh: 0,
    indexv: 0,
    indexf: undefined
}

// Updates the preview with latest changes
function updatePreview(filePath, context, panel) {
    const markdownContent = fs.readFileSync(filePath, 'utf8')
    const fileName = path.basename(filePath, path.extname(filePath))

    const processedContent = processImagePaths(markdownContent, filePath, panel.webview)

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

    panel.title = fileName
    panel.webview.html = getWebviewContent(
        fileName,
        processedContent,
        panel.webview,
        context,
        selectedTheme,
        dataSeparator,
        dataSeparatorVertical,
        JSON.stringify(revealConfig),
        JSON.stringify(globalSlideState),
        filePath
    )
}

function processImagePaths(content, filePath, webview) {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath))
    const workspacePath = workspaceFolder ? workspaceFolder.uri.fsPath : path.dirname(filePath)
    const fileDir = path.dirname(filePath)

    // Process both relative and absolute paths
    return content.replace(/!\[.*?\]\((.*?)\)/g, (match, imagePath) => {
        try {
            // Handle absolute paths within workspace
            if (path.isAbsolute(imagePath) && workspacePath) {
                const absolutePath = path.normalize(imagePath)
                if (absolutePath.startsWith(workspacePath)) {
                    const webviewUri = webview.asWebviewUri(vscode.Uri.file(absolutePath))
                    return match.replace(imagePath, webviewUri.toString())
                }
            }
            // Handle relative paths
            else if (!imagePath.startsWith('http') && !imagePath.startsWith('data:')) {
                const fullPath = path.resolve(fileDir, imagePath)
                if (fs.existsSync(fullPath)) {
                    const webviewUri = webview.asWebviewUri(vscode.Uri.file(fullPath))
                    return match.replace(imagePath, webviewUri.toString())
                }
            }
        } catch (error) {
            console.error('Error processing image path:', error)
        }
        return match
    })
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
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'media'),
                    vscode.Uri.file(path.dirname(filePath)) // Allow access to markdown file's directory
                ]
            }
        )

        // Message listener for state updates
        panel.webview.onDidReceiveMessage(message => {
            if (message.type === 'slideState') {
                globalSlideState = message.state
            }
        }, undefined, context.subscriptions)

        updatePreview(filePath, context, panel)

        const watcher = fs.watch(filePath, { encoding: 'utf8' }, () => {
            updatePreview(filePath, context, panel)
        })

        panel.onDidDispose(() => {
            watcher.close()
        })

        const textDocListener = vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document.fileName === filePath) {
                updatePreview(filePath, context, panel)
            }
        })

        context.subscriptions.push(textDocListener)
    })

    context.subscriptions.push(disposable)
}

function getWebviewContent(
    fileName,
    markdownContent,
    webview,
    context,
    theme,
    dataSeparator,
    dataSeparatorVertical,
    revealConfigString,
    slideStateString,
    filePath
) {
    const revealBasePath = vscode.Uri.joinPath(context.extensionUri, 'media', 'reveal.js')
    const revealCss = webview.asWebviewUri(vscode.Uri.joinPath(revealBasePath, 'dist', 'reveal.css')).toString()
    const themeCss = webview.asWebviewUri(vscode.Uri.joinPath(revealBasePath, 'dist', 'theme', `${theme}.css`)).toString()
    const highlightThemeCss = webview.asWebviewUri(vscode.Uri.joinPath(revealBasePath, 'plugin', 'highlight', 'monokai.css')).toString()
    const resetCss = webview.asWebviewUri(vscode.Uri.joinPath(revealBasePath, 'dist', 'reset.css')).toString()
    const revealJs = webview.asWebviewUri(vscode.Uri.joinPath(revealBasePath, 'dist', 'reveal.js')).toString()
    const markdownPlugin = webview.asWebviewUri(vscode.Uri.joinPath(revealBasePath, 'plugin', 'markdown', 'markdown.js')).toString()
    const highlightPlugin = webview.asWebviewUri(vscode.Uri.joinPath(revealBasePath, 'plugin', 'highlight', 'highlight.js')).toString()
    const notesPlugin = webview.asWebviewUri(vscode.Uri.joinPath(revealBasePath, 'plugin', 'notes', 'notes.js')).toString()

    const fileDir = path.dirname(filePath)
    const baseHref = webview.asWebviewUri(vscode.Uri.file(fileDir)).toString()

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${fileName}</title>
  <link rel="stylesheet" href="${revealCss}">
  <link rel="stylesheet" href="${resetCss}">
  <link rel="stylesheet" href="${themeCss}">
  <link rel="stylesheet" href="${highlightThemeCss}">
  <base href="${baseHref}/">
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
    const vscode = acquireVsCodeApi();
    const initialSlideState = ${slideStateString};
    const revealConfig = ${revealConfigString};
    
    Reveal.initialize({
      ...revealConfig,
      plugins: [ RevealMarkdown, RevealHighlight, RevealNotes ]
    }).then(() => {
      // Restore initial slide state
      if (initialSlideState) {
        Reveal.slide(initialSlideState.indexh, initialSlideState.indexv, initialSlideState.indexf);
      }
      
      // Update state on slide changes
      Reveal.on('slidechanged', event => {
        const state = {
          indexh: event.indexh,
          indexv: event.indexv,
          indexf: event.indexf
        };
        vscode.postMessage({
          type: 'slideState',
          state: state
        });
      });
    });
  </script>
</body>
</html>`
}

module.exports = { activate }