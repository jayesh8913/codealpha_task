import javax.swing.*;
import java.awt.*;
import java.io.*;
import java.util.*;

public class ChatbotGUI extends JFrame {

    private JTextArea chatArea;
    private JTextField inputField;
    private JButton sendButton;

    // Knowledge base loaded from file
    private Map<String, String> knowledgeBase = new HashMap<>();

    public ChatbotGUI() {
        setTitle("Java AI Chatbot");
        setSize(500, 500);
        setDefaultCloseOperation(EXIT_ON_CLOSE);

        chatArea = new JTextArea();
        chatArea.setEditable(false);
        chatArea.setLineWrap(true);

        JScrollPane scrollPane = new JScrollPane(chatArea);

        inputField = new JTextField();
        sendButton = new JButton("Send");

        JPanel bottomPanel = new JPanel(new BorderLayout());
        bottomPanel.add(inputField, BorderLayout.CENTER);
        bottomPanel.add(sendButton, BorderLayout.EAST);

        add(scrollPane, BorderLayout.CENTER);
        add(bottomPanel, BorderLayout.SOUTH);

        // Load training data
        loadTrainingData();

        // Actions
        sendButton.addActionListener(e -> sendMessage());
        inputField.addActionListener(e -> sendMessage());
    }

    private void sendMessage() {
        String userInput = inputField.getText().trim();
        if (userInput.isEmpty()) return;

        chatArea.append("You: " + userInput + "\n");
        chatArea.append("Bot: " + getResponse(userInput) + "\n\n");

        inputField.setText("");
    }

    // Get response using trained data
    private String getResponse(String input) {
        input = input.toLowerCase();

        // Match trained questions
        for (String question : knowledgeBase.keySet()) {
            if (input.contains(question)) {
                return knowledgeBase.get(question);
            }
        }

        return intelligentFallback();
    }

    // Load training file
    private void loadTrainingData() {
        try (BufferedReader br = new BufferedReader(new FileReader("training_data.txt"))) {
            String line;
            while ((line = br.readLine()) != null) {
                String[] parts = line.split("=", 2);
                if (parts.length == 2) {
                    knowledgeBase.put(parts[0].trim().toLowerCase(), parts[1].trim());
                }
            }
        } catch (IOException e) {
            chatArea.append("Bot: Training data file not found.\n");
        }
    }

    // Intelligent fallback replies
    private String intelligentFallback() {
        String[] replies = {
            "Hmm 🤔 I am still learning. Can you rephrase?",
            "I didn't understand that yet.",
            "Interesting! Tell me more.",
            "Sorry, I don't have training for that yet."
        };
        return replies[new Random().nextInt(replies.length)];
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> new ChatbotGUI().setVisible(true));
    }
}
