
import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpExchange;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.*;

public class Main {

    // Expense class
    static class Expense {
        int id;
        String date;
        String category;
        String description;
        double amount;

        Expense(int id, String date, String category,
                String description, double amount) {

            this.id = id;
            this.date = date;
            this.category = category;
            this.description = description;
            this.amount = amount;
        }
    }

    // Store expenses in memory
    static ArrayList<Expense> expenses = new ArrayList<>();

    static double budget = 10000;
    static int nextId = 1;

    public static void main(String[] args) throws IOException {

        HttpServer server = HttpServer.create(
            new InetSocketAddress(8080), 0
        );

        server.createContext("/api/", Main::handleRequest);

        server.start();

        System.out.println("Expense Tracker Backend Started!");
        System.out.println("Server running at http://localhost:8080");
    }

    // Handle website requests
    static void handleRequest(HttpExchange exchange) throws IOException {

        exchange.getResponseHeaders().set(
            "Access-Control-Allow-Origin", "*"
        );

        exchange.getResponseHeaders().set(
            "Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS"
        );

        exchange.getResponseHeaders().set(
            "Access-Control-Allow-Headers", "Content-Type"
        );

        exchange.getResponseHeaders().set(
            "Content-Type", "application/json; charset=UTF-8"
        );

        String method = exchange.getRequestMethod();
        String path = exchange.getRequestURI().getPath();

        if (method.equals("OPTIONS")) {
            sendResponse(exchange, 204, "");
            return;
        }

        try {

            // Get all expenses
            if (path.equals("/api/expenses") && method.equals("GET")) {

                sendResponse(exchange, 200, getExpensesJSON());

            }

            // Add new expense
            else if (path.equals("/api/expenses") && method.equals("POST")) {

                Map<String, String> data =
                    readFormData(exchange);

                double amount = Double.parseDouble(data.get("amount"));

                if (amount <= 0) {
                    throw new IllegalArgumentException(
                        "Amount must be greater than zero."
                    );
                }

                String category = data.get("category");
                String description = data.get("description");
                String date = data.get("date");

                if (category == null || description == null
                        || date == null || description.trim().isEmpty()) {
                    throw new IllegalArgumentException(
                        "Please enter all expense details."
                    );
                }

                Expense expense = new Expense(
                    nextId++,
                    date,
                    category,
                    description,
                    amount
                );

                expenses.add(expense);

                sendResponse(exchange, 201,
                    "{\"message\":\"Expense added successfully\"}");
            }

            // Delete an expense
            else if (path.startsWith("/api/expenses/")
                    && method.equals("DELETE")) {

                int id = Integer.parseInt(
                    path.substring("/api/expenses/".length())
                );

                boolean removed = expenses.removeIf(
                    expense -> expense.id == id
                );

                if (removed) {
                    sendResponse(exchange, 200,
                        "{\"message\":\"Expense deleted\"}");
                } else {
                    sendResponse(exchange, 404,
                        "{\"error\":\"Expense not found\"}");
                }
            }

            // Get budget
            else if (path.equals("/api/budget") && method.equals("GET")) {

                sendResponse(exchange, 200,
                    "{\"budget\":" + budget + "}");
            }

            // Update budget
            else if (path.equals("/api/budget") && method.equals("POST")) {

                Map<String, String> data =
                    readFormData(exchange);

                double newBudget = Double.parseDouble(
                    data.get("budget")
                );

                if (newBudget <= 0) {
                    throw new IllegalArgumentException(
                        "Budget must be greater than zero."
                    );
                }

                budget = newBudget;

                sendResponse(exchange, 200,
                    "{\"message\":\"Budget updated successfully\"}");
            }

            else {
                sendResponse(exchange, 404,
                    "{\"error\":\"API endpoint not found\"}");
            }

        } catch (Exception e) {

            sendResponse(exchange, 400,
                "{\"error\":\"" + escapeJSON(e.getMessage()) + "\"}");
        }
    }

    // Read data sent by website
    static Map<String, String> readFormData(
            HttpExchange exchange) throws IOException {

        String body = new String(
            exchange.getRequestBody().readAllBytes(),
            StandardCharsets.UTF_8
        );

        Map<String, String> data = new HashMap<>();

        for (String pair : body.split("&")) {

            String[] parts = pair.split("=", 2);

            String key = URLDecoder.decode(
                parts[0], StandardCharsets.UTF_8
            );

            String value = parts.length > 1
                ? URLDecoder.decode(parts[1], StandardCharsets.UTF_8)
                : "";

            data.put(key, value);
        }

        return data;
    }

    // Convert expenses into JSON
    static String getExpensesJSON() {

        StringBuilder json = new StringBuilder("[");

        for (int i = 0; i < expenses.size(); i++) {

            Expense e = expenses.get(i);

            json.append("{")
                .append("\"id\":").append(e.id).append(",")
                .append("\"date\":\"").append(escapeJSON(e.date)).append("\",")
                .append("\"category\":\"").append(escapeJSON(e.category)).append("\",")
                .append("\"description\":\"").append(escapeJSON(e.description)).append("\",")
                .append("\"amount\":").append(e.amount)
                .append("}");

            if (i < expenses.size() - 1) {
                json.append(",");
            }
        }

        json.append("]");

        return json.toString();
    }

    // Protect special characters in JSON
    static String escapeJSON(String value) {

        if (value == null) {
            return "";
        }

        return value.replace("\\", "\\\\")
                    .replace("\"", "\\\"")
                    .replace("\n", "\\n")
                    .replace("\r", "\\r");
    }

    // Send response to website
    static void sendResponse(
            HttpExchange exchange, int status, String response)
            throws IOException {

        byte[] bytes = response.getBytes(StandardCharsets.UTF_8);

        if (status == 204) {
            exchange.sendResponseHeaders(status, -1);
        } else {
            exchange.sendResponseHeaders(status, bytes.length);
            exchange.getResponseBody().write(bytes);
        }

        exchange.close();
    }
}
