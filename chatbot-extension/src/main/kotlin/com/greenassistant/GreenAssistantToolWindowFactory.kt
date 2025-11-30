package com.greenassistant

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory
import java.awt.BorderLayout
import java.io.File
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import javax.swing.*

class GreenAssistantToolWindowFactory : ToolWindowFactory {

    private val hasPreviousSession = AtomicBoolean(false)

    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val rootPanel = JPanel(BorderLayout())

        val historyArea = JTextArea().apply {
            isEditable = false
            lineWrap = true
            wrapStyleWord = true
        }
        val scrollPane = JScrollPane(historyArea)

        val inputField = JTextField()
        val sendButton = JButton("Send")

        val inputPanel = JPanel(BorderLayout()).apply {
            add(inputField, BorderLayout.CENTER)
            add(sendButton, BorderLayout.EAST)
        }

        val statusLabel = JLabel("Ready")

        val bottomPanel = JPanel(BorderLayout()).apply {
            add(inputPanel, BorderLayout.CENTER)
            add(statusLabel, BorderLayout.SOUTH)
        }

        rootPanel.add(scrollPane, BorderLayout.CENTER)
        rootPanel.add(bottomPanel, BorderLayout.SOUTH)

        fun appendLine(text: String) {
            historyArea.append(text + "\n")
            historyArea.caretPosition = historyArea.document.length
        }

        fun setInputEnabled(enabled: Boolean) {
            inputField.isEnabled = enabled
            sendButton.isEnabled = enabled
        }

        fun setStatus(text: String) {
            statusLabel.text = text
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

            appendLine("You: $text")
            inputField.text = ""
            setInputEnabled(false)
            setStatus("Talking to Claude...")

            SwingUtilities.invokeLater {
                historyArea.append("Claude: ")
            }

            ApplicationManager.getApplication().executeOnPooledThread {
                try {
                    val claudeCommand = findClaudeExecutable()

                    SwingUtilities.invokeLater {
                        appendLine("\n[Debug] Executable found: $claudeCommand")
                        appendLine("[Debug] PATH: ${System.getenv("PATH")}")
                        appendLine("[Debug] CLAUDE_CLI_PATH: ${System.getenv("CLAUDE_CLI_PATH")}")
                    }

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

                    SwingUtilities.invokeLater {
                        appendLine("[Debug] Command: ${cmd.joinToString(" ")}")
                    }

                    val pb = ProcessBuilder(cmd)

                    val projectDir = project.basePath
                    if (projectDir != null) {
                        pb.directory(File(projectDir))
                        SwingUtilities.invokeLater {
                            appendLine("[Debug] Working Dir: $projectDir")
                        }
                    } else {
                        SwingUtilities.invokeLater {
                            appendLine("[Debug] Working Dir: null (using default)")
                        }
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
                            val pathKey = if (System.getProperty("os.name").lowercase().contains("windows")) "Path" else "PATH"
                            val currentPath = env[pathKey] ?: env["PATH"] ?: ""
                            val localBinAbsolute = localBinPath.absolutePath

                            if (!currentPath.contains(localBinAbsolute)) {
                                val pathSeparator = if (System.getProperty("os.name").lowercase().contains("windows")) ";" else ":"
                                env[pathKey] = "$currentPath$pathSeparator$localBinAbsolute"
                                SwingUtilities.invokeLater {
                                    appendLine("[Debug] Added .local/bin to PATH: $localBinAbsolute")
                                }
                            }
                        }
                    }

                    SwingUtilities.invokeLater {
                        appendLine("[Debug] Starting process...")
                    }

                    val process = pb.start()

                    SwingUtilities.invokeLater {
                        appendLine("[Debug] Process started. PID: ${process.pid()}")
                    }

                    process.outputStream.close()

                    val reader = process.inputStream.bufferedReader()
                    val buffer = CharArray(1024)

                    val hasReceivedOutput = AtomicBoolean(false)

                    val readerThread = Thread {
                        try {
                            while (true) {
                                val readCount = reader.read(buffer)
                                if (readCount < 0) {
                                    SwingUtilities.invokeLater {
                                        appendLine("\n[Debug] Stream closed (EOF).")
                                    }
                                    break
                                }

                                val chunk = String(buffer, 0, readCount)

                                if (hasReceivedOutput.compareAndSet(false, true)) {
                                    SwingUtilities.invokeLater {
                                        appendLine("[Debug] First output received: ${readCount} chars")
                                    }
                                }

                                val cleanChunk = chunk.replace(Regex("\u001B\\[[;\\d]*m"), "")

                                SwingUtilities.invokeLater {
                                    historyArea.append(cleanChunk)
                                    historyArea.caretPosition = historyArea.document.length
                                }
                            }
                        } catch (e: Exception) {
                            SwingUtilities.invokeLater {
                                appendLine("\n[Debug] Exception in reader thread: ${e.message}")
                                appendLine("[Debug] Exception type: ${e.javaClass.simpleName}")
                            }
                        } finally {
                            try {
                                reader.close()
                            } catch (e: Exception) {
                            }
                        }
                    }
                    readerThread.start()

                    val finished = process.waitFor(120, TimeUnit.SECONDS)

                    readerThread.join(5000)

                    if (process.isAlive) {
                        SwingUtilities.invokeLater {
                            appendLine("\n[Debug] Process is still alive after waitFor!")
                        }
                        process.destroyForcibly()
                    }

                    if (!finished) {
                        process.destroyForcibly()
                        SwingUtilities.invokeLater {
                            appendLine("\n[Timed out waiting for response]")
                            if (!hasReceivedOutput.get()) {
                                appendLine("[Debug] No output was received before timeout")
                                appendLine("[Debug] This might indicate:")
                                appendLine("[Debug]   - Claude CLI is waiting for input")
                                appendLine("[Debug]   - Claude CLI is buffering output")
                                appendLine("[Debug]   - Network/API connection issue")
                            }
                            setInputEnabled(true)
                            setStatus("Timeout")
                        }
                        return@executeOnPooledThread
                    }

                    val exitCode = process.exitValue()
                    SwingUtilities.invokeLater {
                        appendLine("\n[Debug] Process exited with code: $exitCode")
                        if (exitCode != 0) {
                            appendLine("[Debug] Process exited with non-zero code - there may have been an error")
                            appendLine("[Debug] Check if Claude CLI is properly configured and authenticated")
                        }
                        if (!hasReceivedOutput.get() && exitCode == 0) {
                            appendLine("[Debug] Process exited successfully but no output was received")
                            appendLine("[Debug] This might indicate output buffering or a silent failure")
                        }
                    }

                    if (exitCode == 0 && hasReceivedOutput.get()) {
                        hasPreviousSession.set(true)
                    }

                    SwingUtilities.invokeLater {
                        appendLine("\n")
                        setInputEnabled(true)
                        setStatus(if (exitCode == 0) "Ready" else "Error (exit code: $exitCode)")
                    }
                } catch (e: Exception) {
                    SwingUtilities.invokeLater {
                        appendLine(
                            "\n[Error calling Claude: ${e.message}]\n" +
                                    "Stack trace: ${e.stackTraceToString()}"
                        )
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

        appendLine("GreenAssistant is ready. Ask Claude about your code,")
        appendLine("he will answer here in text (no built-in console).\n")
    }
}
