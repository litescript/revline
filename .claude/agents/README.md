# 🤖 Revline Claude Agents

Custom agents for maintaining code quality and consistency in the Revline project.

## Available Agents

### 🛡️ type-safety-enforcer
**Purpose**: Audit TypeScript strict mode compliance
**File**: `.claude/agents/type-safety-enforcer.md`
**Run**: `claude "Run type-safety-enforcer agent on frontend"`

**Checks**:
- Implicit `any` usage
- Untyped API responses
- Missing error types
- Unsafe type assertions
- Strict null check compliance

---

### 🌐 api-layer-validator
**Purpose**: Ensure unified API layer usage
**File**: `.claude/agents/api-layer-validator.md`
**Run**: `claude "Run api-layer-validator agent on frontend"`

**Checks**:
- Direct fetch() violations
- Unified `api.get`/`api.post` patterns
- React Query integration
- Error handling consistency
- Auth flow compliance

---

## How to Use Agents

### Option 1: Direct Invocation
```bash
# From repo root
claude "Run [agent-name] agent on [scope]"
```

### Option 2: Copy-Paste Agent Definition
```bash
# Open agent file
cat .claude/agents/type-safety-enforcer.md

# Copy contents and paste into Claude chat with:
"Follow the agent definition above and audit the frontend codebase"
```

### Option 3: Programmatic (Future)
```bash
# Once Claude Code supports custom agents
claude-agent run type-safety-enforcer --scope=frontend
```

---

## Agent Workflow

All agents follow the CLAUDE.md workflow:

1. **Analyze** codebase against defined checks
2. **Generate** `suggested-changes.md` at repo root
3. **Include** diffs, reasoning, and questions
4. **Wait** for human review (never auto-commit)

### Expected Output Format
```markdown
# [Agent Name] Audit — [Date]

## Summary
Found X violations across Y files.

## Critical Issues (Fix Immediately)
[Code diffs with reasoning]

## Warnings (Address Soon)
[Lower priority items]

## Questions for Maintainers
[Clarifications needed]

## Validation Steps
[Commands to verify fixes]
```

---

## Creating New Agents

### Template Structure
```markdown
# 🎯 [Agent Name]

## Purpose
[One sentence description]

## Scope
[Files/directories to analyze]

## Core Checks
[List of things to audit]

## Output Format
[Template for suggested-changes.md]

## Workflow
[How the agent should operate]

## Examples
[Code samples showing violations → fixes]

## Success Criteria
[How to know the agent worked]

## Related Agents
[Links to complementary agents]
```

### Naming Convention
- Use kebab-case: `feature-scaffolder.md`
- Be descriptive: `react-query-optimizer.md` not `rq-opt.md`
- Focus on action: `type-safety-enforcer` not `type-checker`

---

## Integration with CLAUDE.md

All agents must follow these principles:

✅ **Never modify code directly**
✅ **Always output to `suggested-changes.md`**
✅ **Use diff-style code blocks**
✅ **Include reasoning for every change**
✅ **Ask clarifying questions**
✅ **Respect TypeScript strict mode**
✅ **Enforce unified API patterns**

---

## Quality Gates

Before accepting agent-generated suggestions:

```bash
# Frontend checks
cd frontend
npm run type-check  # Must pass ✅
npm run lint        # Must pass ✅
npm run test        # Must pass ✅

# Backend checks (if applicable)
cd api
pytest              # Must pass ✅

# Integration check
docker compose -f infra/docker-compose.yml up
# Must run cleanly on ports 5173/8000 ✅
```

---

## Roadmap

### Phase 1 (Current)
- [x] type-safety-enforcer
- [x] api-layer-validator

### Phase 2 (Next)
- [ ] feature-scaffolder
- [ ] sprint-reviewer

### Phase 3 (Future)
- [ ] auth-flow-auditor
- [ ] react-query-optimizer
- [ ] docker-compose-health

---

## Contributing

When creating new agents:
1. Follow the template structure
2. Include concrete examples
3. Define success criteria
4. Test on real codebase
5. Document in this README

---

## Questions?

Ask **atlas** or **peter** for guidance on:
- Agent scope and priorities
- Code patterns to enforce
- Output format preferences
