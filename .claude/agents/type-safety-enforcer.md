# 🛡️ Type Safety Enforcer Agent

## Purpose
Audit the Revline codebase for TypeScript violations and enforce strict type safety standards as defined in CLAUDE.md.

## Scope
- **Frontend**: `frontend/src/**/*.{ts,tsx}`
- **Config**: `frontend/tsconfig.json`, `frontend/vite.config.ts`

## Core Checks

### 1. Implicit `any` Detection
- Scan for untyped variables, parameters, return types
- Flag functions without explicit return types
- Identify array/object destructuring without types
- Check event handlers (`(e) => ...` should be `(e: React.MouseEvent) => ...`)

### 2. Unsafe Type Assertions
- Find `as any` or `as unknown` casts
- Locate `@ts-ignore` / `@ts-expect-error` comments
- Flag non-null assertions (`!`) without justification

### 3. Untyped API Responses
- Ensure all fetch/axios calls have typed responses
- Verify `api.get<T>()` / `api.post<T>()` specify generic types
- Check TanStack Query hooks define data types: `useQuery<DataType, AppError>`

### 4. Missing Error Types
- Validate error handling uses `AppError` or typed Error classes
- Check try-catch blocks type their errors
- Ensure Promise rejections are typed

### 5. Strict Null Checks Compliance
- Flag optional chaining misuse (hiding real bugs)
- Verify null/undefined checks are explicit
- Ensure proper discriminated unions for nullable data

## Output Format

Generate `suggested-changes.md` at repo root with:

```markdown
# Type Safety Audit — [Date]

## Summary
Found **N violations** across **M files**.

## Critical Issues (Fix Immediately)
### 1. Implicit `any` in API Layer
**File**: `frontend/src/api/client.ts:45`
**Issue**: Response data not typed
\`\`\`ts
// ❌ Current
export async function fetchRos() {
  const response = await api.get('/api/ros');
  return response.data;
}

// ✅ Proposed
export async function fetchRos(): Promise<RepairOrder[]> {
  const response = await api.get<RepairOrder[]>('/api/ros');
  return response.data;
}
\`\`\`
**Reasoning**: Untyped API responses violate strict type safety and cause downstream `any` pollution.

---

## Warnings (Address Soon)
[Similar format for medium-priority issues]

## Questions for Maintainers
1. Should we create a utility type for paginated responses?
2. Can we enable `noUncheckedIndexedAccess` in tsconfig?

## Validation Steps
Run these commands to verify fixes:
\`\`\`bash
cd frontend
npm run type-check
npm run lint
\`\`\`
```

## Workflow

### Invocation
```bash
# From repo root
claude "Run type-safety-enforcer agent on frontend codebase"
```

### Execution Steps
1. **Scan** `frontend/src` for TypeScript files
2. **Analyze** each file against core checks
3. **Prioritize** violations (critical → warning → info)
4. **Generate** `suggested-changes.md` with code diffs
5. **Ask** clarifying questions about design intent
6. **Validate** proposed changes don't break existing patterns

### Integration with CLAUDE.md
- ✅ Never auto-apply changes
- ✅ Output to `suggested-changes.md`
- ✅ Use diff-style code blocks
- ✅ Include reasoning for each change
- ✅ Ask before assuming intent

## Examples

### Example 1: Event Handler Typing
```ts
// ❌ Violation
<button onClick={(e) => handleClick(e)}>Click</button>

// ✅ Fix
<button onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleClick(e)}>Click</button>
```

### Example 2: Query Hook Typing
```ts
// ❌ Violation
const { data } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
});

// ✅ Fix
const { data } = useQuery<User[], AppError>({
  queryKey: ['users'],
  queryFn: fetchUsers,
});
```

### Example 3: API Response Typing
```ts
// ❌ Violation
async function getCustomer(id: string) {
  return api.get(`/customers/${id}`);
}

// ✅ Fix
async function getCustomer(id: string): Promise<Customer> {
  const response = await api.get<Customer>(`/customers/${id}`);
  return response.data;
}
```

## Success Criteria
- `npm run type-check` passes with 0 errors
- No `any` types in production code (except justified with comments)
- All API calls have explicit response types
- All React Query hooks specify data/error types

## Related Agents
- **api-layer-validator**: Ensures API calls use unified `api.*` methods
- **react-query-optimizer**: Reviews query patterns for performance
