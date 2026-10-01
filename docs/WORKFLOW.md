# Taik Development Workflow

## Overview

All work is **GitHub issue-centric**. Communication happens on issues with short HackSquad messages for coordination.

## Roles & Decision Authority

| Role | Responsibility |
|------|----------------|
| **CEO** | Requirements, final approval |
| **Chief** | Architecture decisions, detailed implementation plans, final merge |
| **Architect** | Technical design, detailed specs |
| **Implementer** | Feasibility validation, execution |
| **Reviewer** | Code review, quality gates |

**Key principle:** Chief + Architect provide **detailed implementation plans**, not high-level directions. Implementers should not have to guess.

## Standard Workflow

### Phase 1: Requirements (CEO ↔ Chief)

1. **Create GitHub issue** with initial requirements
2. **Iterate on issue** - clarify scope, constraints, acceptance criteria
3. Issue becomes the **single source of truth**

### Phase 2: Planning (Chief + Architect)

4. Chief/Architect analyze codebase and design solution
5. Write **detailed implementation plan** on the issue:
   - Specific files to create/modify
   - Code structure and interfaces
   - Step-by-step implementation sequence
   - Edge cases and error handling

### Phase 3: Validation (Implementer Review)

6. Send plan to Implementer via HackSquad
7. Implementer reviews for **feasibility**:
   - Technical blockers?
   - Missing dependencies?
   - Unrealistic assumptions?
8. Implementer provides feedback → Chief adjusts if needed
9. **Chief makes final decisions** on any disagreements

### Phase 4: Implementation

10. Implementer executes the plan
11. Creates PR linked to issue
12. Reviewer approves → Lead merges to feature branch
13. Chief reviews → merges to main

## Team Structures

### Small Features: Tribe Core Team

```
CEO
 ↓
Chief ←→ Architect
 ↓
Implementer ←→ Reviewer
```

Use when: Single feature, limited scope, sequential work.

### Large Features: Squads

```
CEO
 ↓
Chief (coordinates all squads)
 ↓
┌─────────────┬─────────────┐
Squad-A      Squad-B      Squad-C
(Lead)       (Lead)       (Lead)
 ↓            ↓            ↓
Impl+Rev     Impl+Rev     Impl+Rev
```

Use when: Multiple parallel workstreams, complex features.

**Squad communication:**
- Chief ↔ Squad Leads (not directly to squad implementers)
- Squad Lead ↔ Squad Implementer (same pattern as Chief ↔ Implementer)
- Chief makes final decisions across squads

## Communication Protocol

| Channel | Use For |
|---------|---------|
| **GitHub Issue** | Requirements, design discussions, decisions (permanent record) |
| **HackSquad inbox** | Coordination, status updates, quick questions |
| **PR comments** | Code-specific feedback |

**Message format:** Keep HackSquad messages short. Reference issue numbers for context.

## Issue Template

```markdown
## Problem / Goal
[What we're solving]

## Requirements
- [ ] Requirement 1
- [ ] Requirement 2

## Implementation Plan
<!-- Added by Chief/Architect after discussion -->

## Validation Notes
<!-- Added by Implementer after review -->

## Status
- [ ] Requirements finalized
- [ ] Plan approved
- [ ] Implementation complete
- [ ] Merged to main
```
