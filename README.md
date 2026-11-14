# Entreprise-Information-System (CourierFlow)

Courier Management System (Sprint 1 Frontend Prototype) developed for the Enterprise Information Systems course (FEUP — Group 01).

## Project Structure

```text
├── assets/                                  # Static assets, icons and images
├── css/                                     # Stylesheets
│   ├── adminstyle.css                       # Staff & Admin governance and analytics styling
│   ├── client.css                           # Client portal styling
│   ├── courier.css                          # Courier workspace & shared dashboard layout
│   ├── login.css                            # Login page styling
│   ├── register.css                         # Registration page styling
│   ├── style.css                            # Global layout and base styling
│   ├── teams.css                            # Teams page styling
│   └── vehicles.css                         # Fleet & vehicles page styling
├── js/                                      # Client-side scripts
│   ├── main.js                              # Authentication, navigation, shared utilities & seed data
│   ├── client.js                            # Client portal (products, order creation, active & completed orders)
│   ├── courier.js                           # Courier workspace (Initiated -> In Progress -> Completed/Cancelled, e-POD)
│   ├── vehicles.js                          # Shared fleet pool & vehicle registration
│   ├── staff.js                             # Staff panel (courier & vehicle approvals, document expiry alerts)
│   └── admin.js                             # Admin panel (staff approvals, profile & system-wide analytics)
├── ER diagram (first draft).drawio.png      # Entity-Relationship (ER) diagram
├── index.html                               # Public landing page
├── login.html                               # User login
├── register.html                            # User registration (Client and Courier)
├── client.html                              # Client workspace
├── courier.html                             # Courier workspace
├── vehicles.html                            # Fleet & Vehicles workspace (Courier)
├── staff.html                               # Staff workspace
├── admin.html                               # Admin workspace
└── teams.html                               # Project Team (Group 01) page
```

## Demo Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Client** | `client@client.demo` | `Client123!` |
| **Courier** | `courier@courier.demo` | `Courier123!` |
| **Staff** | `staff@staff.demo` | `Staff123!` |
| **Admin** | `admin@admin.demo` | `Admin123!` |

## Running the Application

Open `index.html` in any modern web browser or serve the directory using a local HTTP server (e.g., `python3 -m http.server 8000` or VS Code Live Server).
