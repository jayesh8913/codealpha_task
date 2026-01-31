package CodeAlpha_StockSimulationPlatform;
import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import javax.swing.table.JTableHeader;
import java.awt.*;
import java.util.*;

/* =========================
   MAIN APPLICATION
========================= */
public class StockTradingPlatformGUI extends JFrame {

    private StockMarket market;
    private User user;
    private JTable marketTable, portfolioTable;
    private DefaultTableModel marketModel, portfolioModel;
    private JComboBox<String> stockSelector;
    private JTextField quantityField;
    private JLabel balanceLabel;
    private GraphPanel graphPanel;
    private javax.swing.Timer timer;

    private final Color BG = new Color(18, 18, 18);
    private final Color PANEL = new Color(30, 30, 30);
    private final Color ACCENT = new Color(41, 121, 255);

    public StockTradingPlatformGUI() {
        market = new StockMarket();
        user = new User("Trader", 100000);

        setTitle("Stock Trading Platform");
        setSize(1000, 600);
        setLocationRelativeTo(null);
        setDefaultCloseOperation(EXIT_ON_CLOSE);
        setLayout(new BorderLayout());
        getContentPane().setBackground(BG);

        add(createHeader(), BorderLayout.NORTH);
        add(createTabs(), BorderLayout.CENTER);
        add(createTradePanel(), BorderLayout.SOUTH);

        startMarketSimulation();
    }

    /* =========================
       HEADER
    ========================= */
    private JPanel createHeader() {
        JPanel panel = new JPanel(new BorderLayout());
        panel.setBackground(PANEL);
        panel.setBorder(BorderFactory.createEmptyBorder(10, 15, 10, 15));

        JLabel title = new JLabel("Stock Trading Platform");
        title.setForeground(ACCENT);
        title.setFont(new Font("Segoe UI", Font.BOLD, 22));

        balanceLabel = new JLabel("Balance: ₹" + user.getBalance());
        balanceLabel.setForeground(Color.GREEN);
        balanceLabel.setFont(new Font("Segoe UI", Font.BOLD, 16));

        panel.add(title, BorderLayout.WEST);
        panel.add(balanceLabel, BorderLayout.EAST);
        return panel;
    }

    /* =========================
       TABS
    ========================= */
    private JTabbedPane createTabs() {
        JTabbedPane tabs = new JTabbedPane();
        tabs.setBackground(BG);
        tabs.setForeground(Color.WHITE);
        tabs.add("Market", createMarketPanel());
        tabs.add("Portfolio", createPortfolioPanel());
        return tabs;
    }

    /* =========================
       MARKET PANEL
    ========================= */
    private JPanel createMarketPanel() {
        JPanel panel = new JPanel(new BorderLayout());
        panel.setBackground(BG);

        marketModel = new DefaultTableModel(new String[]{"Stock", "Price (₹)"}, 0);
        marketTable = styledTable(marketModel);

        refreshMarketTable();

        graphPanel = new GraphPanel();
        graphPanel.setBackground(PANEL);

        JSplitPane split = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT,
                new JScrollPane(marketTable), graphPanel);
        split.setDividerLocation(400);
        split.setBorder(null);

        marketTable.getSelectionModel().addListSelectionListener(e -> {
            int row = marketTable.getSelectedRow();
            if (row >= 0) {
                graphPanel.setStock(market.getStock(
                        (String) marketModel.getValueAt(row, 0)));
            }
        });

        panel.add(split, BorderLayout.CENTER);
        return panel;
    }

    /* =========================
       PORTFOLIO PANEL
    ========================= */
    private JPanel createPortfolioPanel() {
        JPanel panel = new JPanel(new BorderLayout());
        panel.setBackground(BG);

        portfolioModel = new DefaultTableModel(
                new String[]{"Stock", "Quantity", "Value (₹)"}, 0);
        portfolioTable = styledTable(portfolioModel);

        panel.add(new JScrollPane(portfolioTable), BorderLayout.CENTER);
        return panel;
    }

    /* =========================
       BUY / SELL PANEL
    ========================= */
    private JPanel createTradePanel() {
        JPanel panel = new JPanel();
        panel.setBackground(PANEL);
        panel.setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));

        stockSelector = new JComboBox<>();
        for (Stock s : market.getStocks()) stockSelector.addItem(s.getName());

        quantityField = new JTextField(5);

        JButton buyBtn = styledButton("Buy", new Color(46, 125, 50));
        JButton sellBtn = styledButton("Sell", new Color(198, 40, 40));

        buyBtn.addActionListener(e -> buyStock());
        sellBtn.addActionListener(e -> sellStock());

        panel.add(new JLabel("Stock:"));
        panel.add(stockSelector);
        panel.add(new JLabel("Qty:"));
        panel.add(quantityField);
        panel.add(buyBtn);
        panel.add(sellBtn);

        return panel;
    }

    /* =========================
       UI HELPERS
    ========================= */
    private JTable styledTable(DefaultTableModel model) {
        JTable table = new JTable(model);
        table.setBackground(PANEL);
        table.setForeground(Color.WHITE);
        table.setGridColor(Color.DARK_GRAY);
        table.setFont(new Font("Segoe UI", Font.PLAIN, 14));

        JTableHeader h = table.getTableHeader();
        h.setBackground(new Color(45, 45, 45));
        h.setForeground(ACCENT);
        h.setFont(new Font("Segoe UI", Font.BOLD, 14));

        return table;
    }

    private JButton styledButton(String text, Color color) {
        JButton btn = new JButton(text);
        btn.setBackground(color);
        btn.setForeground(Color.WHITE);
        btn.setFont(new Font("Segoe UI", Font.BOLD, 14));
        btn.setFocusPainted(false);
        return btn;
    }

    /* =========================
       LOGIC
    ========================= */
    private void buyStock() {
        try {
            Stock s = market.getStock((String) stockSelector.getSelectedItem());
            int qty = Integer.parseInt(quantityField.getText());
            if (user.buyStock(s, qty)) refreshAll();
        } catch (Exception ignored) {}
    }

    private void sellStock() {
        try {
            Stock s = market.getStock((String) stockSelector.getSelectedItem());
            int qty = Integer.parseInt(quantityField.getText());
            if (user.sellStock(s, qty)) refreshAll();
        } catch (Exception ignored) {}
    }

    private void refreshMarketTable() {
        marketModel.setRowCount(0);
        for (Stock s : market.getStocks())
            marketModel.addRow(new Object[]{s.getName(), s.getPrice()});
    }

    private void refreshPortfolio() {
        portfolioModel.setRowCount(0);
        for (Map.Entry<Stock, Integer> e : user.getPortfolio().entrySet()) {
            portfolioModel.addRow(new Object[]{
                    e.getKey().getName(),
                    e.getValue(),
                    e.getKey().getPrice() * e.getValue()
            });
        }
    }

    private void refreshAll() {
        refreshMarketTable();
        refreshPortfolio();
        balanceLabel.setText("Balance: ₹" + user.getBalance());
    }

    private void startMarketSimulation() {
        timer = new javax.swing.Timer(2000, e -> {
            market.updatePrices();
            graphPanel.repaint();
            refreshAll();
        });
        timer.start();
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> new StockTradingPlatformGUI().setVisible(true));
    }
}

/* =========================
   BACKEND CLASSES (UNCHANGED)
========================= */

class Stock {
    private String name;
    private double price;
    private ArrayList<Double> history = new ArrayList<>();

    public Stock(String name, double price) {
        this.name = name;
        this.price = price;
        history.add(price);
    }

    public void updatePrice() {
        price += Math.random() * 6 - 3;
        if (price < 1) price = 1;
        history.add(price);
        if (history.size() > 50) history.remove(0);
    }

    public String getName() { return name; }
    public double getPrice() { return price; }
    public ArrayList<Double> getHistory() { return history; }
}

class StockMarket {
    private ArrayList<Stock> stocks = new ArrayList<>();
    public StockMarket() {
        stocks.add(new Stock("TCS", 3500));
        stocks.add(new Stock("INFY", 1500));
        stocks.add(new Stock("RELIANCE", 2800));
    }
    public void updatePrices() { for (Stock s : stocks) s.updatePrice(); }
    public ArrayList<Stock> getStocks() { return stocks; }
    public Stock getStock(String name) {
        for (Stock s : stocks) if (s.getName().equals(name)) return s;
        return null;
    }
}

class User {
    private double balance;
    private HashMap<Stock, Integer> portfolio = new HashMap<>();
    public User(String name, double balance) { this.balance = balance; }
    public boolean buyStock(Stock s, int qty) {
        double cost = s.getPrice() * qty;
        if (balance >= cost) {
            balance -= cost;
            portfolio.put(s, portfolio.getOrDefault(s, 0) + qty);
            return true;
        }
        return false;
    }
    public boolean sellStock(Stock s, int qty) {
        int owned = portfolio.getOrDefault(s, 0);
        if (owned >= qty) {
            balance += s.getPrice() * qty;
            portfolio.put(s, owned - qty);
            if (portfolio.get(s) == 0) portfolio.remove(s);
            return true;
        }
        return false;
    }
    public double getBalance() { return balance; }
    public Map<Stock, Integer> getPortfolio() { return portfolio; }
}

class GraphPanel extends JPanel {
    private Stock stock;
    public void setStock(Stock s) { stock = s; repaint(); }

    protected void paintComponent(Graphics g) {
        super.paintComponent(g);
        if (stock == null) return;

        Graphics2D g2 = (Graphics2D) g;
        g2.setColor(Color.CYAN);
        g2.drawString("Live Price Graph: " + stock.getName(), 10, 20);

        var data = stock.getHistory();
        if (data.size() < 2) return;

        double max = Collections.max(data);
        double min = Collections.min(data);

        int w = getWidth() - 40;
        int h = getHeight() - 60;

        for (int i = 0; i < data.size() - 1; i++) {
            int x1 = 20 + i * w / data.size();
            int x2 = 20 + (i + 1) * w / data.size();
            int y1 = 40 + (int)((max - data.get(i)) / (max - min) * h);
            int y2 = 40 + (int)((max - data.get(i + 1)) / (max - min) * h);
            g2.setColor(Color.GREEN);
            g2.drawLine(x1, y1, x2, y2);
        }
    }
}
