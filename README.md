# School Enterprise — Stage 1

Core school administration and finance. This is a **modular monolith**: one Spring Boot app, with each feature in its own package (auth, school, students, fees, …). Every module uses the same simple layers:

`controller` (HTTP) → `service` (business rules) → `repository` (database)

The React UI is plain JavaScript. Permissions are checked on the **server**. Hiding a menu item is not security.

## What you can do

- Login, logout, password reset, JWT sessions
- School profile, academic years, terms, classes, sections, departments, subjects
- Users, roles, permissions, and assignment scopes
- Students, guardians, enrollment, documents metadata, class history
- Staff and teacher assignments
- Fee heads, structures, invoices, payments, receipts, concessions, dues
- Admin dashboard and audit log

## Tech stack

| Layer | Choice |
| --- | --- |
| Language | Java 21 |
| Backend | Spring Boot 3.3, Spring MVC, Spring Security + JWT |
| Database | MySQL + Spring Data JPA + Flyway |
| API docs | Swagger UI at http://localhost:8080/swagger-ui.html |
| Tests | JUnit 5 + Mockito + Spring Boot Test |
| Frontend | React + JavaScript (Vite) |

## Folder map

```
school-enterprise/
  backend/     Java API (port 8080)
  frontend/    React screens (port 5173)
  postman/     API collection
```

Backend packages (the “modules”):

```
com.schoolenterprise
  auth          login / logout / password reset
  school        school, campus, year, term
  identity      users, roles, permissions, scopes
  academics     class, section, subject, department
  student       students, guardians, enrollment
  staff         staff, teacher assignment
  finance       fees, invoices, payments
  dashboard     counts and alerts
  audit         audit log
  common        security, errors, JWT
```

## Setup

1. Install **Java 21**, **Maven**, **Node.js 18+**, **MySQL 8**.
2. Create the database (optional — the JDBC URL can create it):

```sql
CREATE DATABASE school_enterprise;
```

3. Edit `backend/src/main/resources/application.properties` and set your MySQL password.

4. Start the API (Maven Wrapper works if `mvn` is not installed):

```bash
cd backend
mvnw.cmd spring-boot:run
```

If MySQL is not available, use the built-in H2 database:

```bash
cd backend
mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"
```

On first start the app creates:

- School: Demo Public School
- User: **admin** / **Admin@123**

5. Start the UI:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

Swagger: http://localhost:8080/swagger-ui.html

## Tests

```bash
cd backend
mvn test
```

## How outstanding fees are calculated

`outstanding = totalDue - totalPaid - concessionAmount`  
(never below zero)

Creating an invoice increases `totalDue`. A payment increases `totalPaid` and creates a receipt. A concession reduces the remaining balance.

## Default roles

| Role | Idea |
| --- | --- |
| ADMIN | Everything |
| PRINCIPAL | Broad school access |
| ACCOUNTANT | Fees (financial). Does not become a teacher automatically |
| CLASS_TEACHER | Students in assigned sections. **No fee access** unless you add it |
| SUBJECT_TEACHER | Only assigned subjects |

## Postman

Import `postman/School-Enterprise-Stage1.postman_collection.json`. Login first, copy `data.token` into the `token` variable.

## Unified Multi-Portal Platform & Quick Start

The platform unifies both the **School Administrator Portal** and the **Teacher Portal** under one repository.

### One-Command Unified Startup (All Services)

```bash
# Starts Spring Boot Backend (Port 8085), Admin Portal (Port 5173), and Teacher Portal (Port 5174)
npm start
```

Or for production build and single-port gateway:
```bash
node build.js    # Builds all 3 applications
node server.js   # Serves Admin at http://localhost:3000/ and Teacher at http://localhost:3000/teacher/
```

### Official Documentation & Handover
- 📘 [Knowledge Transfer (KT) & Handover Report](docs/KNOWLEDGE_TRANSFER_HANDOVER.md)
- 🎬 [Feature Presentation Runbook & Live Demo Script](docs/FEATURE_PRESENTATION_RUNBOOK.md)
- 📝 [Admin Portal UI/UX Audit & Plan](docs/ADMIN_PORTAL_AUDIT_PLAN.md)
