package CodeAlpha_StudentGradeTracker;
import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.util.ArrayList;

class Student {
    String name;
    int marks;

    Student(String name, int marks) {
        this.name = name;
        this.marks = marks;
    }
}

public class StudentGradeTracker extends JFrame {

    private JTextField nameField, marksField;
    private JLabel avgLabel, highLabel, lowLabel;
    private DefaultTableModel tableModel;
    private ArrayList<Student> students;

    public StudentGradeTracker() {
        students = new ArrayList<>();
        setTitle("🎓 Student Grade Tracker");
        setSize(750, 500);
        setLocationRelativeTo(null);
        setDefaultCloseOperation(EXIT_ON_CLOSE);
        setLayout(new BorderLayout(10, 10));

        add(createInputPanel(), BorderLayout.WEST);
        add(createTablePanel(), BorderLayout.CENTER);
        add(createStatsPanel(), BorderLayout.SOUTH);

        setVisible(true);
    }

    private JPanel createInputPanel() {
        JPanel panel = new JPanel();
        panel.setPreferredSize(new Dimension(250, 0));
        panel.setBackground(new Color(245, 248, 255));
        panel.setLayout(new GridBagLayout());

        GridBagConstraints gbc = new GridBagConstraints();
        gbc.insets = new Insets(8, 8, 8, 8);
        gbc.fill = GridBagConstraints.HORIZONTAL;

        JLabel title = new JLabel("Add Student");
        title.setFont(new Font("Segoe UI", Font.BOLD, 18));
        title.setHorizontalAlignment(SwingConstants.CENTER);

        JLabel nameLabel = new JLabel("Student Name:");
        JLabel marksLabel = new JLabel("Marks:");

        nameField = new JTextField();
        marksField = new JTextField();

        JButton addBtn = new JButton("Add Student");
        addBtn.setBackground(new Color(66, 133, 244));
        addBtn.setForeground(Color.WHITE);
        addBtn.setFocusPainted(false);

        addBtn.addActionListener(e -> addStudent());

        gbc.gridx = 0; gbc.gridy = 0;
        panel.add(title, gbc);

        gbc.gridy++;
        panel.add(nameLabel, gbc);

        gbc.gridy++;
        panel.add(nameField, gbc);

        gbc.gridy++;
        panel.add(marksLabel, gbc);

        gbc.gridy++;
        panel.add(marksField, gbc);

        gbc.gridy++;
        panel.add(addBtn, gbc);

        return panel;
    }

    private JScrollPane createTablePanel() {
        String[] columns = {"Student Name", "Marks"};
        tableModel = new DefaultTableModel(columns, 0);
        JTable table = new JTable(tableModel);
        table.setRowHeight(22);
        table.setFont(new Font("Segoe UI", Font.PLAIN, 14));
        table.getTableHeader().setFont(new Font("Segoe UI", Font.BOLD, 14));

        return new JScrollPane(table);
    }

    private JPanel createStatsPanel() {
        JPanel panel = new JPanel(new GridLayout(1, 3, 10, 10));
        panel.setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));
        panel.setBackground(Color.WHITE);

        avgLabel = createStatLabel("Average: 0");
        highLabel = createStatLabel("Highest: 0");
        lowLabel = createStatLabel("Lowest: 0");

        panel.add(avgLabel);
        panel.add(highLabel);
        panel.add(lowLabel);

        return panel;
    }

    private JLabel createStatLabel(String text) {
        JLabel label = new JLabel(text, SwingConstants.CENTER);
        label.setFont(new Font("Segoe UI", Font.BOLD, 14));
        label.setBorder(BorderFactory.createLineBorder(Color.LIGHT_GRAY));
        return label;
    }

    private void addStudent() {
        String name = nameField.getText().trim();
        String marksText = marksField.getText().trim();

        if (name.isEmpty() || marksText.isEmpty()) {
            JOptionPane.showMessageDialog(this, "Please enter all fields");
            return;
        }

        int marks;
        try {
            marks = Integer.parseInt(marksText);
            if (marks < 0 || marks > 100) {
                JOptionPane.showMessageDialog(this, "Marks should be between 0 and 100");
                return;
            }
        } catch (NumberFormatException e) {
            JOptionPane.showMessageDialog(this, "Invalid marks input");
            return;
        }

        Student student = new Student(name, marks);
        students.add(student);
        tableModel.addRow(new Object[]{name, marks});

        updateStatistics();

        nameField.setText("");
        marksField.setText("");
    }

    private void updateStatistics() {
        if (students.isEmpty()) return;

        int total = 0;
        int highest = Integer.MIN_VALUE;
        int lowest = Integer.MAX_VALUE;

        for (Student s : students) {
            total += s.marks;
            highest = Math.max(highest, s.marks);
            lowest = Math.min(lowest, s.marks);
        }

        double average = (double) total / students.size();

        avgLabel.setText("Average: " + String.format("%.2f", average));
        highLabel.setText("Highest: " + highest);
        lowLabel.setText("Lowest: " + lowest);
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(StudentGradeTracker::new);
    }
}
