package com.greenassistant

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory
import java.awt.BorderLayout
import java.awt.Color
import java.awt.Dimension
import java.io.File
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import javax.swing.*
import javax.swing.border.EmptyBorder

class GreenAssistantToolWindowFactory : ToolWindowFactory {

    private val hasPreviousSession = AtomicBoolean(false)

    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val rootPanel = JPanel(BorderLayout())
        rootPanel.border = EmptyBorder(0, 0, 0, 0)

        val jetbrainsBlue = Color(0x4A90E2)
        val jetbrainsBlueHover = Color(0x3B7FD9)
        val jetbrainsBackground = Color(0xFFFFFF)
        val jetbrainsChatBackground = Color(0xF5F5F5)
        val jetbrainsBorder = Color(0xD0D0D0)
        val jetbrainsText = Color(0x2B2B2B)
        val jetbrainsTextSecondary = Color(0x808080)

        val headerPanel = JPanel(BorderLayout()).apply {
            border = EmptyBorder(12, 16, 8, 16)
            background = jetbrainsBackground
        }

        val titleLabel = JLabel("EcoMind").apply {
            foreground = jetbrainsText
            font = font.deriveFont(java.awt.Font.BOLD, 14f)
        }

        val subtitleLabel = JLabel("Chat with EcoMind about this project").apply {
            foreground = jetbrainsTextSecondary
            font = font.deriveFont(12f)
        }

        val titleBox = JPanel().apply {
            layout = BoxLayout(this, BoxLayout.Y_AXIS)
            isOpaque = false
            add(titleLabel)
            add(subtitleLabel)
        }

        val statusDot = JLabel("●").apply {
            foreground = Color(0x4CAF50)
        }

        val statusLabel = JLabel("Ready").apply {
            foreground = jetbrainsTextSecondary
            border = EmptyBorder(0, 4, 0, 0)
        }

        val statusPanel = JPanel(BorderLayout()).apply {
            isOpaque = false
            add(statusDot, BorderLayout.WEST)
            add(statusLabel, BorderLayout.CENTER)
        }

        headerPanel.add(titleBox, BorderLayout.WEST)
        headerPanel.add(statusPanel, BorderLayout.EAST)

        val chatArea = JTextPane().apply {
            isEditable = false
            contentType = "text/html"
            background = jetbrainsChatBackground
            border = EmptyBorder(16, 16, 16, 16)
        }

        val scrollPane = JScrollPane(chatArea).apply {
            border = BorderFactory.createMatteBorder(0, 0, 1, 0, jetbrainsBorder)
            verticalScrollBarPolicy = JScrollPane.VERTICAL_SCROLLBAR_AS_NEEDED
            background = jetbrainsBackground
        }

        val inputPanel = JPanel(BorderLayout(10, 0)).apply {
            border = EmptyBorder(8, 16, 4, 16)
            background = jetbrainsBackground
        }

        val inputField = JTextField().apply {
            border = BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(jetbrainsBorder, 1),
                BorderFactory.createEmptyBorder(10, 14, 10, 14)
            )
            font = font.deriveFont(13f)
            background = jetbrainsBackground
            foreground = jetbrainsText
            toolTipText = "Type your message and press Enter or click Send"
        }

        val sendButton = JButton("Send").apply {
            preferredSize = Dimension(90, 38)
            font = font.deriveFont(java.awt.Font.BOLD, 13f)
            background = jetbrainsBlue
            foreground = Color.WHITE
            isOpaque = true
            border = BorderFactory.createEmptyBorder(10, 20, 10, 20)
            isFocusPainted = false
            cursor = java.awt.Cursor.getPredefinedCursor(java.awt.Cursor.HAND_CURSOR)
            addMouseListener(object : java.awt.event.MouseAdapter() {
                override fun mouseEntered(e: java.awt.event.MouseEvent) {
                    if (isEnabled) {
                        background = jetbrainsBlueHover
                    }
                }
                override fun mouseExited(e: java.awt.event.MouseEvent) {
                    if (isEnabled) {
                        background = jetbrainsBlue
                    }
                }
            })
        }

        inputPanel.add(inputField, BorderLayout.CENTER)
        inputPanel.add(sendButton, BorderLayout.EAST)

        val hintLabel = JLabel("Press Enter to send • Use the input below to talk about this project").apply {
            border = EmptyBorder(0, 20, 8, 20)
            foreground = jetbrainsTextSecondary
            font = font.deriveFont(11f)
            horizontalAlignment = SwingConstants.LEFT
            background = jetbrainsBackground
            isOpaque = true
        }

        val bottomPanel = JPanel(BorderLayout()).apply {
            background = jetbrainsBackground
            add(inputPanel, BorderLayout.CENTER)
            add(hintLabel, BorderLayout.SOUTH)
        }

        rootPanel.add(headerPanel, BorderLayout.NORTH)
        rootPanel.add(scrollPane, BorderLayout.CENTER)
        rootPanel.add(bottomPanel, BorderLayout.SOUTH)

        val messages = mutableListOf<Pair<String, String>>()
        var currentAssistantContent = StringBuilder()

        fun setStatus(state: String) {
            SwingUtilities.invokeLater {
                statusLabel.text = state
                statusDot.foreground = when (state) {
                    "Ready" -> Color(0x4CAF50)
                    "Thinking..." -> jetbrainsBlue
                    "Error" -> Color(0xF44336)
                    "Timeout" -> Color(0xFF9800)
                    else -> jetbrainsTextSecondary
                }
            }
        }

        fun escapeHtml(text: String): String {
            return text
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;")
                .replace("\n", "<br>")
        }

        fun rebuildChatArea() {
            SwingUtilities.invokeLater {
                try {
                    val messagesHtml = messages.joinToString("") { (role, content) ->
                        val escapedContent = escapeHtml(content)
                        if (escapedContent.isEmpty()) return@joinToString ""
                        when (role) {
                            "user" -> """
                                <div style="margin-bottom: 16px; text-align: right;">
                                    <div style="display: inline-block; max-width: 75%; background: #4A90E2; color: #FFFFFF !important; padding: 12px 18px; border-radius: 20px; word-wrap: break-word; box-shadow: 0 2px 4px rgba(74, 144, 226, 0.2);">
                                        <span style="color: #FFFFFF !important;">$escapedContent</span>
                                    </div>
                                </div>
                            """.trimIndent()
                            "assistant" -> """
                                <div style="margin-bottom: 16px; text-align: left;">
                                    <div style="display: inline-block; max-width: 75%; background: #FFFFFF; color: #1A1A1A !important; padding: 12px 18px; border-radius: 20px; word-wrap: break-word; border: 1px solid #D0D0D0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                        <span style="color: #1A1A1A !important;">$escapedContent</span>
                                    </div>
                                </div>
                            """.trimIndent()
                            else -> ""
                        }
                    }

                    val streamingHtml = if (currentAssistantContent.isNotEmpty()) {
                        val escapedContent = escapeHtml(currentAssistantContent.toString())
                        if (escapedContent.isNotEmpty()) {
                            """
                                <div style="margin-bottom: 16px; text-align: left;">
                                    <div style="display: inline-block; max-width: 75%; background: #FFFFFF; color: #1A1A1A !important; padding: 12px 18px; border-radius: 20px; word-wrap: break-word; border: 1px solid #D0D0D0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                        <span style="color: #1A1A1A !important;">$escapedContent</span><span style="opacity: 0.6; color: #4A90E2;">▊</span>
                                    </div>
                                </div>
                            """.trimIndent()
                        } else ""
                    } else ""

                    val bodyContent = when {
                        messagesHtml.isEmpty() && streamingHtml.isEmpty() -> {
                            """
                                <div style="text-align: center; padding: 60px 20px;">
                                    <div style="font-size: 24px; color: #4A90E2; margin-bottom: 12px; font-weight: 500;">💬</div>
                                    <h2 style="color: #1A1A1A; margin-bottom: 8px; font-size: 18px; font-weight: 500;">Hi! I'm EcoMind</h2>
                                    <p style="color: #4A4A4A; font-size: 14px;">How can I help you with your code today?</p>
                                </div>
                            """.trimIndent()
                        }
                        else -> messagesHtml + streamingHtml
                    }

                    val htmlContent = """
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <style type="text/css">
                                body {
                                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'JetBrains Mono', 'Consolas', monospace;
                                    font-size: 13px;
                                    line-height: 1.6;
                                    margin: 0;
                                    padding: 0;
                                    color: #1A1A1A;
                                    background: #F5F5F5;
                                }
                                p, div, span {
                                    color: inherit;
                                }
                                code {
                                    font-family: 'JetBrains Mono', 'Consolas', monospace;
                                    background: #E8E8E8;
                                    padding: 2px 6px;
                                    border-radius: 3px;
                                    font-size: 12px;
                                }
                                pre {
                                    background: #E8E8E8;
                                    padding: 12px;
                                    border-radius: 6px;
                                    overflow-x: auto;
                                    border: 1px solid #D0D0D0;
                                }
                            </style>
                        </head>
                        <body>
                            $bodyContent
                        </body>
                        </html>
                    """.trimIndent()

                    if (chatArea.editorKit !is javax.swing.text.html.HTMLEditorKit) {
                        chatArea.contentType = "text/html"
                    }

                    chatArea.text = htmlContent

                    SwingUtilities.invokeLater {
                        try {
                            chatArea.caretPosition = chatArea.document.length
                        } catch (_: Exception) {
                        }
                    }
                } catch (_: Exception) {
                    try {
                        chatArea.contentType = "text/plain"
                        val plainText = messages.joinToString("\n\n") { (role, content) ->
                            "${if (role == "user") "You" else "EcoMind"}: $content"
                        } + if (currentAssistantContent.isNotEmpty()) "\n\nEcoMind: $currentAssistantContent" else ""
                        chatArea.text = plainText
                    } catch (_: Exception) {
                    }
                }
            }
        }

        fun appendUserMessage(text: String) {
            messages.add("user" to text)
            rebuildChatArea()
        }

        fun appendAssistantMessage(text: String) {
            messages.add("assistant" to text)
            rebuildChatArea()
        }

        fun startAssistantMessage() {
            currentAssistantContent.clear()
            rebuildChatArea()
        }

        fun appendAssistantChunk(chunk: String) {
            val cleanChunk = chunk.replace(Regex("\u001B\\[[;\\d]*m"), "")
            currentAssistantContent.append(cleanChunk)
            rebuildChatArea()
        }

        fun finishAssistantMessage() {
            if (currentAssistantContent.isNotEmpty()) {
                messages.add("assistant" to currentAssistantContent.toString())
                currentAssistantContent.clear()
            }
            rebuildChatArea()
        }

        fun setInputEnabled(enabled: Boolean) {
            inputField.isEnabled = enabled
            sendButton.isEnabled = enabled
            SwingUtilities.invokeLater {
                if (enabled) {
                    sendButton.background = jetbrainsBlue
                    sendButton.foreground = Color.WHITE
                } else {
                    sendButton.background = Color(0xD0D0D0)
                    sendButton.foreground = Color(0x808080)
                }
            }
        }

        fun findClaudeExecutable(): String {
            val envPath = System.getenv("CLAUDE_CLI_PATH")
            if (!envPath.isNullOrBlank()) {
                val f = File(envPath)
                if (f.exists() && f.isFile) {
                    return f.absolutePath
                }
            }

            val home = System.getenv("USERPROFILE") ?: System.getProperty("user.home")
            if (home != null) {
                val candidates = listOf(
                    File(home, ".local/bin/claude.exe"),
                    File(home, ".local/bin/claude")
                )
                val found = candidates.firstOrNull { it.exists() && it.isFile }
                if (found != null) {
                    return found.absolutePath
                }
            }

            return "claude"
        }

        fun sendMessage() {
            val text = inputField.text.trim()
            if (text.isEmpty()) return

            appendUserMessage(text)
            inputField.text = ""
            setInputEnabled(false)
            startAssistantMessage()
            setStatus("Thinking...")

            ApplicationManager.getApplication().executeOnPooledThread {
                try {
                    val claudeCommand = findClaudeExecutable()

                    val cmd = mutableListOf(
                        claudeCommand,
                        "--print",
                        "--dangerously-skip-permissions"
                    )

                    if (hasPreviousSession.get()) {
                        cmd.add("--continue")
                    }

                    cmd.add("-p")
                    cmd.add(text)

                    val pb = ProcessBuilder(cmd)

                    val projectDir = project.basePath
                    if (projectDir != null) {
                        pb.directory(File(projectDir))
                    }

                    pb.redirectErrorStream(true)

                    val env = pb.environment()
                    System.getenv().forEach { (k, v) ->
                        if (k != "CLAUDE_CLI_PATH") {
                            env[k] = v
                        }
                    }

                    val home = System.getenv("USERPROFILE") ?: System.getProperty("user.home")
                    if (home != null) {
                        val localBinPath = File(home, ".local/bin")
                        if (localBinPath.exists() && localBinPath.isDirectory) {
                            val isWindows = System.getProperty("os.name").lowercase().contains("windows")
                            val pathKey = if (isWindows) "Path" else "PATH"
                            val currentPath = env[pathKey] ?: env["PATH"] ?: ""
                            val localBinAbsolute = localBinPath.absolutePath

                            if (!currentPath.split(if (isWindows) ";" else ":").contains(localBinAbsolute)) {
                                val pathSeparator = if (isWindows) ";" else ":"
                                env[pathKey] = if (currentPath.isEmpty()) {
                                    localBinAbsolute
                                } else {
                                    "$currentPath$pathSeparator$localBinAbsolute"
                                }
                            }
                        }
                    }

                    val process = pb.start()
                    process.outputStream.close()

                    val reader = process.inputStream.bufferedReader()
                    val buffer = CharArray(1024)

                    val hasReceivedOutput = AtomicBoolean(false)

                    val readerThread = Thread {
                        try {
                            while (true) {
                                val readCount = reader.read(buffer)
                                if (readCount < 0) {
                                    break
                                }

                                val chunk = String(buffer, 0, readCount)
                                hasReceivedOutput.set(true)

                                val cleanChunk = chunk.replace(Regex("\u001B\\[[;\\d]*m"), "")
                                appendAssistantChunk(cleanChunk)
                            }
                        } catch (e: Exception) {
                            SwingUtilities.invokeLater {
                                appendAssistantMessage("\n[Error reading response: ${e.message}]")
                            }
                        } finally {
                            try {
                                reader.close()
                            } catch (_: Exception) {
                            }
                        }
                    }
                    readerThread.start()

                    val finished = process.waitFor(120, TimeUnit.SECONDS)
                    readerThread.join(5000)

                    if (process.isAlive) {
                        process.destroyForcibly()
                    }

                    if (!finished) {
                        process.destroyForcibly()
                        SwingUtilities.invokeLater {
                            finishAssistantMessage()
                            appendAssistantMessage("\n[Request timed out]")
                            setInputEnabled(true)
                            setStatus("Timeout")
                        }
                        return@executeOnPooledThread
                    }

                    val exitCode = process.exitValue()

                    if (exitCode == 0 && hasReceivedOutput.get()) {
                        hasPreviousSession.set(true)
                    }

                    SwingUtilities.invokeLater {
                        finishAssistantMessage()
                        setInputEnabled(true)
                        setStatus("Ready")
                        if (exitCode != 0) {
                            appendAssistantMessage("\n[Error: Process exited with code $exitCode]")
                            setStatus("Error")
                        }
                    }
                } catch (e: Exception) {
                    SwingUtilities.invokeLater {
                        finishAssistantMessage()
                        appendAssistantMessage("\n[Error: ${e.message}]")
                        setInputEnabled(true)
                        setStatus("Error")
                    }
                }
            }
        }

        sendButton.addActionListener { sendMessage() }
        inputField.addActionListener { sendMessage() }

        val contentFactory = ContentFactory.getInstance()
        val content = contentFactory.createContent(rootPanel, "", false)
        toolWindow.contentManager.addContent(content)

        SwingUtilities.invokeLater {
            chatArea.text = """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style type="text/css">
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'JetBrains Mono', 'Consolas', monospace;
                            font-size: 13px;
                            line-height: 1.6;
                            margin: 0;
                            padding: 0;
                            color: #1A1A1A;
                            background: #F5F5F5;
                        }
                    </style>
                </head>
                <body>
                    <div style="text-align: center; padding: 60px 20px;">
                        <div style="font-size: 24px; color: #4A90E2; margin-bottom: 12px; font-weight: 500;">💬</div>
                        <h2 style="color: #1A1A1A; margin-bottom: 8px; font-size: 18px; font-weight: 500;">Hi! I'm EcoMind</h2>
                        <p style="color: #4A4A4A; font-size: 14px;">How can I help you with your code today?</p>
                    </div>
                </body>
                </html>
            """.trimIndent()
        }
    }
}
