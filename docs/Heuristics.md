# Heuristics for Exploratory Testing Charters

## Overview

Heuristics are reusable templates and approaches that guide testers in crafting effective exploratory testing charters. They provide structure and inspiration for writing charters that are sufficiently directive but not overly restrictive.

## Data Model

### Heuristic
- `id` (UUID) - Unique identifier
- `name` (STRING) - Heuristic name
- `description` (TEXT) - Description and guidance
- `template` (STRING) - Template string for writing charters
- `elements` (JSON) - Key elements (risk, coverage, time, style)
- `examples` (JSON) - Example charters using this heuristic
- `personas` (Persona[]) - Actors that can use this heuristic
- `createdAt` (DATETIME)
- `updatedAt` (DATETIME)

### Persona
- `id` (UUID) - Unique identifier
- `heuristicId` (FK -> Heuristic) - Associated heuristic
- `name` (STRING) - Persona name (e.g., "Admin", "Power User")
- `description` (TEXT) - Persona description
- `characteristics` (TEXT[]) - Key characteristics

## Charter Template Heuristics

### 1. Mission-Based Template
**Template**: "My mission is to test **\<risk\>** for **\<coverage\>**"

**Elements**:
- **Risk**: The type of problem you're testing for
- **Coverage**: The area or function being tested
- **Time**: What can be achieved during the session

**Examples**:
- "My mission is to test customers with multiple policies for assessment calculations"
- "My mission is to test customers aren't sent multiple quote documents for assessment calculations processed automatically"

### 2. Exploration-Based Template
**Template**: "Explore **\<target\>** with **\<resources\>** to discover **\<information\>**"

**Elements**:
- **Target**: What to explore
- **Resources**: Tools, data, or context
- **Information**: What to discover

**Examples**:
- "Explore the checkout flow with multiple payment methods to discover edge cases"
- "Explore user authentication with expired tokens to discover session handling issues"

### 3. Fear-Based Template
**Template**: "I'm afraid that **\<risk\>**... Let's explore..."

**Examples**:
- "I'm afraid that customer transactions might not be accurately recorded when using the mobile banking feature. Let's explore different transaction scenarios..."
- "I'm afraid that the payment gateway might not handle unexpected errors gracefully. Let's simulate various error scenarios..."

### 4. Curiosity-Based Template
**Template**: "I'm curious about **\<aspect\>**... Let's experiment..."

**Examples**:
- "I'm curious about how the system handles unusual withdrawal patterns. Let's experiment with various amounts and timing..."
- "I'm curious about the real-time collaboration feature. Let's simulate multiple users working simultaneously..."

### 5. Question-Based Heuristic
**Questions**:
- "What am I testing?"
- "What could go wrong?"

**Coverage → Risk Mapping**:
| What am I testing? | What could go wrong? |
|-------------------|---------------------|
| Assessment Calculations | Customers with multiple policies |
| Assessment Calculations | Customers with outstanding premiums |
| Assessment Calculations | Customers with grandfathered benefits |

## Charter Elements

### 1. Risk
Types of problems to test for:
- **Functional**: Features not working as expected
- **Performance**: Slowdowns, timeouts
- **Security**: Unauthorized access, data leaks
- **Usability**: Confusing interfaces, poor UX
- **Data Integrity**: Incorrect calculations, data loss
- **Integration**: API failures, sync issues

### 2. Coverage
Areas to test:
- Specific features or modules
- User workflows
- Integration points
- Configuration options
- Edge cases and boundary conditions

### 3. Time
Session duration options:
- **Short**: 30-60 minutes
- **Normal**: 60-90 minutes
- **Long**: 90-120 minutes

### 4. Style
Testing approach:
- **Positive/Confirmatory**: Test if product does what it should
- **Negative/Exploratory**: Discover if problems manifest
- **Neutral**: Observe and learn
- **Mixed**: Combine approaches

## Personas

Personas represent different user types that might use a heuristic:

### Common Personas
- **Admin User**: Full system access, configuration capabilities
- **Regular User**: Standard user with typical permissions
- **Power User**: Advanced user who pushes boundaries
- **Guest User**: Unauthenticated access
- **New User**: First-time experience
- **Mobile User**: Accessing via mobile devices
- **API User**: Programmatic access

### Persona Characteristics
- Permission level
- Experience level
- Typical use patterns
- Known constraints or limitations

## Relationship Model

```
Project
  └── Test Plan
        └── Test Suite
              ├── Test Case (0..N)
              └── ET Charter (0..N)
                    └── ET Charter Heuristic (N..N)
                          └── Heuristic
                                └── Persona (1..N)
```

## Operations

### Heuristic
- [x] Create
- [x] Read/List
- [x] Edit/Update
- [x] Delete

### Persona
- [x] Create
- [x] Read/List
- [x] Edit/Update
- [x] Delete

### ET Charter - Heuristic Association
- [x] Link heuristic to charter
- [x] Unlink heuristic from charter
- [x] View associated heuristics on charter

## Implementation Notes

### Database
- Many-to-many relationship via `ETCharterHeuristic` junction table
- Heuristic has one-to-many with Persona

### API Endpoints
- `GET /heuristics` - List all heuristics
- `POST /heuristics` - Create heuristic
- `GET /heuristics/:id` - Get heuristic details
- `PATCH /heuristics/:id` - Update heuristic
- `DELETE /heuristics/:id` - Delete heuristic
- `GET /heuristics/:id/personas` - List personas for heuristic
- `POST /heuristics/:id/personas` - Add persona to heuristic
- `DELETE /heuristics/:id/personas/:personaId` - Remove persona

### UI Components
1. **HeuristicList**: Display and manage heuristics
2. **HeuristicPicker**: Select heuristics when creating/editing charter
3. **PersonaManager**: Manage personas within a heuristic
