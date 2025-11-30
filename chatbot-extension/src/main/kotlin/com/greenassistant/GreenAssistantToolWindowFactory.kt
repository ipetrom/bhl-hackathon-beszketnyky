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

        // Modern JetBrains color palette
        val jetbrainsBlue = Color(0x4A90E2)
        val jetbrainsBlueHover = Color(0x3B7FD9)
        val jetbrainsBlueLight = Color(0xE8F4FD)
        val jetbrainsBackground = Color(0xFAFAFA)
        val jetbrainsChatBackground = Color(0xFFFFFF)
        val jetbrainsBorder = Color(0xE1E4E8)
        val jetbrainsBorderLight = Color(0xF0F0F0)
        val jetbrainsText = Color(0x1E1E1E)
        val jetbrainsTextSecondary = Color(0x6E6E6E)
        val jetbrainsTextTertiary = Color(0x9E9E9E)
        val jetbrainsGreen = Color(0x4CAF50)
        val jetbrainsGreenLight = Color(0xE8F5E9)

        // Modern header with gradient-like effect
        val headerPanel = JPanel(BorderLayout()).apply {
            border = BorderFactory.createCompoundBorder(
                BorderFactory.createMatteBorder(0, 0, 1, 0, jetbrainsBorder),
                EmptyBorder(16, 20, 16, 20)
            )
            background = jetbrainsChatBackground
        }

        // Title with icon-like styling
        val titleLabel = JLabel("EcoMind").apply {
            foreground = jetbrainsText
            font = font.deriveFont(java.awt.Font.BOLD, 16f)
            border = EmptyBorder(0, 0, 2, 0)
        }

        val subtitleLabel = JLabel("Chat with EcoMind about this project").apply {
            foreground = jetbrainsTextSecondary
            font = font.deriveFont(12f)
        }

        val titleBox = JPanel().apply {
            layout = BoxLayout(this, BoxLayout.Y_AXIS)
            isOpaque = false
            border = EmptyBorder(0, 0, 0, 0)
            add(titleLabel)
            add(Box.createVerticalStrut(4))
            add(subtitleLabel)
        }

        // Modern status indicator with badge
        val statusBadge = JPanel().apply {
            layout = BoxLayout(this, BoxLayout.X_AXIS)
            isOpaque = true
            background = jetbrainsGreenLight
            border = BorderFactory.createCompoundBorder(
                BorderFactory.createEmptyBorder(6, 12, 6, 12),
                BorderFactory.createEmptyBorder(0, 0, 0, 0)
            )
            preferredSize = Dimension(80, 28)
        }

        val statusDot = JLabel("●").apply {
            foreground = jetbrainsGreen
            font = font.deriveFont(10f)
            border = EmptyBorder(0, 0, 0, 6)
        }

        val statusLabel = JLabel("Ready").apply {
            foreground = Color(0x2E7D32)
            font = font.deriveFont(java.awt.Font.BOLD, 11f)
        }

        statusBadge.add(statusDot)
        statusBadge.add(statusLabel)

        headerPanel.add(titleBox, BorderLayout.WEST)
        headerPanel.add(statusBadge, BorderLayout.EAST)

        val chatArea = JTextPane().apply {
            isEditable = false
            contentType = "text/html"
            background = jetbrainsChatBackground
            foreground = jetbrainsText // Set explicit foreground color
            border = EmptyBorder(20, 24, 20, 24)
        }

        val scrollPane = JScrollPane(chatArea).apply {
            border = null
            verticalScrollBarPolicy = JScrollPane.VERTICAL_SCROLLBAR_AS_NEEDED
            background = jetbrainsChatBackground
            // Modern scrollbar styling
            verticalScrollBar.apply {
                preferredSize = Dimension(8, 0)
                unitIncrement = 16
                blockIncrement = 80
            }
        }

        val inputPanel = JPanel(BorderLayout(12, 0)).apply {
            border = EmptyBorder(16, 20, 16, 20)
            background = jetbrainsChatBackground
        }

        // Modern input field with rounded corners
        val inputField = JTextField().apply {
            border = BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(jetbrainsBorder, 1),
                BorderFactory.createEmptyBorder(12, 16, 12, 16)
            )
            font = font.deriveFont(13f)
            background = jetbrainsChatBackground
            foreground = jetbrainsText
            toolTipText = "Type your message and press Enter or click Send"
            // Add focus listener for modern border effect
            addFocusListener(object : java.awt.event.FocusAdapter() {
                override fun focusGained(e: java.awt.event.FocusEvent) {
                    border = BorderFactory.createCompoundBorder(
                        BorderFactory.createLineBorder(jetbrainsBlue, 2),
                        BorderFactory.createEmptyBorder(11, 15, 11, 15)
                    )
                }
                override fun focusLost(e: java.awt.event.FocusEvent) {
                    border = BorderFactory.createCompoundBorder(
                        BorderFactory.createLineBorder(jetbrainsBorder, 1),
                        BorderFactory.createEmptyBorder(12, 16, 12, 16)
                    )
                }
            })
        }

        // Modern send button with better styling
        val sendButton = object : JButton("Send") {
            override fun paintComponent(g: java.awt.Graphics) {
                val g2 = g as java.awt.Graphics2D
                g2.setRenderingHint(java.awt.RenderingHints.KEY_ANTIALIASING, java.awt.RenderingHints.VALUE_ANTIALIAS_ON)
                
                if (isEnabled) {
                    // Subtle shadow
                    val shadowColor = Color(0, 0, 0, 25) // 10% opacity
                    g2.color = shadowColor
                    g2.fillRoundRect(0, 2, width, height, 8, 8)
                    
                    // Main button
                    g2.color = background
                    g2.fillRoundRect(0, 0, width, height - 2, 8, 8)
                } else {
                    g2.color = background
                    g2.fillRoundRect(0, 0, width, height, 8, 8)
                }
                
                super.paintComponent(g)
            }
        }.apply {
            preferredSize = Dimension(100, 44)
            font = font.deriveFont(java.awt.Font.BOLD, 13f)
            background = jetbrainsBlue
            foreground = Color.WHITE
            isOpaque = false
            border = BorderFactory.createEmptyBorder(0, 0, 0, 0)
            isFocusPainted = false
            cursor = java.awt.Cursor.getPredefinedCursor(java.awt.Cursor.HAND_CURSOR)
            addMouseListener(object : java.awt.event.MouseAdapter() {
                override fun mouseEntered(e: java.awt.event.MouseEvent) {
                    if (isEnabled) {
                        background = jetbrainsBlueHover
                        repaint()
                    }
                }
                override fun mouseExited(e: java.awt.event.MouseEvent) {
                    if (isEnabled) {
                        background = jetbrainsBlue
                        repaint()
                    }
                }
                override fun mousePressed(e: java.awt.event.MouseEvent) {
                    if (isEnabled) {
                        background = Color(0x2E6BC7)
                        repaint()
                    }
                }
                override fun mouseReleased(e: java.awt.event.MouseEvent) {
                    if (isEnabled) {
                        background = jetbrainsBlue
                        repaint()
                    }
                }
            })
        }

        inputPanel.add(inputField, BorderLayout.CENTER)
        inputPanel.add(sendButton, BorderLayout.EAST)

        val hintLabel = JLabel("Press Enter to send • Use the input below to talk about this project").apply {
            border = EmptyBorder(0, 20, 12, 20)
            foreground = jetbrainsTextTertiary
            font = font.deriveFont(11f)
            horizontalAlignment = SwingConstants.LEFT
            background = jetbrainsChatBackground
            isOpaque = true
        }

        val bottomPanel = JPanel(BorderLayout()).apply {
            background = jetbrainsChatBackground
            border = BorderFactory.createCompoundBorder(
                BorderFactory.createMatteBorder(1, 0, 0, 0, jetbrainsBorder),
                EmptyBorder(0, 0, 0, 0)
            )
            add(inputPanel, BorderLayout.CENTER)
            add(hintLabel, BorderLayout.SOUTH)
        }

        rootPanel.background = jetbrainsBackground
        rootPanel.add(headerPanel, BorderLayout.NORTH)
        rootPanel.add(scrollPane, BorderLayout.CENTER)
        rootPanel.add(bottomPanel, BorderLayout.SOUTH)

        val messages = mutableListOf<Pair<String, String>>()
        var currentAssistantContent = StringBuilder()

        fun setStatus(state: String) {
            SwingUtilities.invokeLater {
                statusLabel.text = state
                val (dotColor, bgColor, textColor) = when (state) {
                    "Ready" -> Triple(Color(0x4CAF50), Color(0xE8F5E9), Color(0x2E7D32))
                    "Thinking..." -> Triple(jetbrainsBlue, jetbrainsBlueLight, Color(0x1E5FA8))
                    "Error" -> Triple(Color(0xF44336), Color(0xFFEBEE), Color(0xC62828))
                    "Timeout" -> Triple(Color(0xFF9800), Color(0xFFF3E0), Color(0xE65100))
                    else -> Triple(jetbrainsTextSecondary, Color(0xF5F5F5), jetbrainsTextSecondary)
                }
                statusDot.foreground = dotColor
                statusBadge.background = bgColor
                statusLabel.foreground = textColor
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
                                <div style="margin-bottom: 20px; text-align: right;">
                                    <div style="display: inline-block; max-width: 75%; background: linear-gradient(135deg, #4A90E2 0%, #3B7FD9 100%); padding: 14px 20px; border-radius: 18px 18px 4px 18px; word-wrap: break-word; box-shadow: 0 2px 8px rgba(74, 144, 226, 0.25), 0 1px 2px rgba(0,0,0,0.1);">
                                        <span style="color: #FFFFFF !important; line-height: 1.5; font-weight: 400; display: block;">$escapedContent</span>
                                    </div>
                                </div>
                            """.trimIndent()
                            "assistant" -> """
                                <div style="margin-bottom: 20px; text-align: left;">
                                    <div style="display: inline-block; max-width: 75%; background: #FFFFFF; padding: 14px 20px; border-radius: 18px 18px 18px 4px; word-wrap: break-word; border: 1px solid #E1E4E8; box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.02);">
                                        <span style="color: #1E1E1E !important; line-height: 1.5; font-weight: 400; display: block;">$escapedContent</span>
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
                                <div style="margin-bottom: 20px; text-align: left;">
                                    <div style="display: inline-block; max-width: 75%; background: #FFFFFF; padding: 14px 20px; border-radius: 18px 18px 18px 4px; word-wrap: break-word; border: 1px solid #E1E4E8; box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.02);">
                                        <span style="color: #1E1E1E !important; line-height: 1.5; font-weight: 400; display: inline;">$escapedContent</span><span style="opacity: 0.7; color: #4A90E2 !important; font-weight: bold; margin-left: 2px; animation: blink 1s infinite;">▊</span>
                                    </div>
                                </div>
                            """.trimIndent()
                        } else ""
                    } else ""

                    val bodyContent = when {
                        messagesHtml.isEmpty() && streamingHtml.isEmpty() -> {
                            """
                                <div style="text-align: center; padding: 80px 20px;">
                                    <div style="font-size: 48px; margin-bottom: 20px; filter: drop-shadow(0 2px 4px rgba(74, 144, 226, 0.2));">🌱</div>
                                    <h2 style="color: #1E1E1E; margin-bottom: 12px; font-size: 20px; font-weight: 600; letter-spacing: -0.3px;">Hi! I'm EcoMind</h2>
                                    <p style="color: #6E6E6E; font-size: 14px; line-height: 1.6; max-width: 400px; margin: 0 auto;">How can I help you with your code today?</p>
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
                                @keyframes blink {
                                    0%, 50% { opacity: 1; }
                                    51%, 100% { opacity: 0.3; }
                                }
                                body {
                                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'JetBrains Sans', 'Inter', sans-serif;
                                    font-size: 14px;
                                    line-height: 1.6;
                                    margin: 0;
                                    padding: 0;
                                    color: #1E1E1E !important;
                                    background: #FFFFFF;
                                    -webkit-font-smoothing: antialiased;
                                    -moz-osx-font-smoothing: grayscale;
                                }
                                * {
                                    color: #1E1E1E !important;
                                }
                                p, div, span {
                                    color: #1E1E1E !important;
                                }
                                code {
                                    font-family: 'JetBrains Mono', 'Consolas', 'Monaco', monospace;
                                    background: #F5F5F5;
                                    padding: 3px 7px;
                                    border-radius: 4px;
                                    font-size: 12.5px;
                                    border: 1px solid #E1E4E8;
                                    color: #1E1E1E;
                                }
                                pre {
                                    background: #F8F9FA;
                                    padding: 16px;
                                    border-radius: 8px;
                                    overflow-x: auto;
                                    border: 1px solid #E1E4E8;
                                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                                    font-size: 12.5px;
                                    line-height: 1.5;
                                }
                                pre code {
                                    background: transparent;
                                    padding: 0;
                                    border: none;
                                }
                                a {
                                    color: #4A90E2;
                                    text-decoration: none;
                                }
                                a:hover {
                                    text-decoration: underline;
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
                    
                    // Force dark text color
                    chatArea.foreground = jetbrainsText
                    
                    // Set document style for HTML rendering
                    val doc = chatArea.styledDocument
                    val style = chatArea.addStyle("default", null)
                    javax.swing.text.StyleConstants.setForeground(style, jetbrainsText)

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
                        chatArea.foreground = jetbrainsText // Ensure dark text in plain text mode
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
                    sendButton.background = Color(0xE1E4E8)
                    sendButton.foreground = Color(0x9E9E9E)
                }
                sendButton.repaint()
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
                        @keyframes blink {
                            0%, 50% { opacity: 1; }
                            51%, 100% { opacity: 0.3; }
                        }
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'JetBrains Sans', 'Inter', sans-serif;
                            font-size: 14px;
                            line-height: 1.6;
                            margin: 0;
                            padding: 0;
                            color: #1E1E1E !important;
                            background: #FFFFFF;
                            -webkit-font-smoothing: antialiased;
                            -moz-osx-font-smoothing: grayscale;
                        }
                        * {
                            color: #1E1E1E !important;
                        }
                        p, div, span {
                            color: #1E1E1E !important;
                        }
                        code {
                            font-family: 'JetBrains Mono', 'Consolas', 'Monaco', monospace;
                            background: #F5F5F5;
                            padding: 3px 7px;
                            border-radius: 4px;
                            font-size: 12.5px;
                            border: 1px solid #E1E4E8;
                            color: #1E1E1E !important;
                        }
                        pre {
                            background: #F8F9FA;
                            padding: 16px;
                            border-radius: 8px;
                            overflow-x: auto;
                            border: 1px solid #E1E4E8;
                            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                        }
                        h2 {
                            color: #1E1E1E !important;
                        }
                        p {
                            color: #6E6E6E !important;
                        }
                    </style>
                </head>
                <body>
                    <div style="text-align: center; padding: 80px 20px;">
                        <div style="font-size: 48px; margin-bottom: 20px; filter: drop-shadow(0 2px 4px rgba(74, 144, 226, 0.2));">🌱</div>
                        <h2 style="color: #1E1E1E; margin-bottom: 12px; font-size: 20px; font-weight: 600; letter-spacing: -0.3px;">Hi! I'm EcoMind</h2>
                        <p style="color: #6E6E6E; font-size: 14px; line-height: 1.6; max-width: 400px; margin: 0 auto;">How can I help you with your code today?</p>
                    </div>
                </body>
                </html>
            """.trimIndent()
        }
    }
}
