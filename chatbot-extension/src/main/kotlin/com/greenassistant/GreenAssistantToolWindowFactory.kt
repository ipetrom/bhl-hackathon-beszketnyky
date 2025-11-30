package com.greenassistant

import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory
import java.awt.BorderLayout
import javax.swing.*

class GreenAssistantToolWindowFactory : ToolWindowFactory {

    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val rootPanel = JPanel(BorderLayout())

        val historyArea = JTextArea()
        historyArea.isEditable = false

        val scrollPane = JScrollPane(historyArea)
        val inputField = JTextField()
        val sendButton = JButton("Send")

        val inputPanel = JPanel(BorderLayout())
        inputPanel.add(inputField, BorderLayout.CENTER)
        inputPanel.add(sendButton, BorderLayout.EAST)

        rootPanel.add(scrollPane, BorderLayout.CENTER)
        rootPanel.add(inputPanel, BorderLayout.SOUTH)

        fun sendMessage() {
            val text = inputField.text.trim()
            if (text.isEmpty()) return

            historyArea.append("> $text\n")
            inputField.text = ""
        }

        sendButton.addActionListener { sendMessage() }
        inputField.addActionListener { sendMessage() }

        val contentFactory = ContentFactory.getInstance()
        val content = contentFactory.createContent(rootPanel, "", false)
        toolWindow.contentManager.addContent(content)
    }
}
