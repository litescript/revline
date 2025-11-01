# 🌐 API Layer Validator Agent

## Purpose
Ensure all network communication in Revline uses the unified API layer (`api.get`/`api.post`) and follows consistent error handling patterns.

## Scope
- **Frontend**: `frontend/src/**/*.{ts,tsx}`
- **API Client**: `frontend/src/api/client.ts`
- **Hooks**: `frontend/src/hooks/**/*.ts`
- **Features**: `frontend/src/features/**/*.tsx`

## Core Checks

### 1. Direct Fetch Violations
- Scan for raw `fetch()`, `axios()`, or `XMLHttpRequest` usage
- Flag any HTTP calls not going through `api.*` methods
- Check dynamic imports that might bypass the API layer

### 2. Unified API Pattern Compliance
- Verify all API calls use `api.get<T>()`, `api.post<T>()`, etc.
- Ensure generic types are specified for responses
- Check that `AppError` is the expected error type

### 3. React Query Integration
- All queries use `AppQueryProvider` context
- Query hooks properly configured with global error handling
- Mutations use consistent `onError` patterns
- No duplicate query key definitions

### 4. Error Handling Consistency
- All API errors return `AppError` type
- HTTP status codes handled consistently
- Toast notifications triggered for user-facing errors
- Network errors (timeout, offline) handled gracefully

### 5. Authentication Flow
- Protected routes use `AuthProvider` context
- Token refresh handled by interceptors
- 401/403 responses trigger logout flow
- No manual JWT handling outside auth layer

## Output Format

Generate `suggested-changes.md` at repo root with:

```markdown
# API Layer Audit — [Date]

## Summary
Found **N violations** across **M files**.

## Critical Issues (Fix Immediately)

### 1. Direct fetch() Bypassing API Layer
**File**: `frontend/src/features/customers/CustomerList.tsx:23`
**Issue**: Raw fetch call bypasses unified error handling
\`\`\`diff
--- frontend/src/features/customers/CustomerList.tsx
+++ frontend/src/features/customers/CustomerList.tsx
@@ -20,8 +20,8 @@

 async function loadCustomers() {
-  const response = await fetch('/api/customers');
-  return response.json();
+  const response = await api.get<Customer[]>('/api/customers');
+  return response.data;
 }
\`\`\`
**Reasoning**: Direct fetch bypasses auth interceptors, error handling, and toast notifications. Using `api.get` ensures consistency and proper error propagation.

---

### 2. Missing Error Type in Query Hook
**File**: `frontend/src/hooks/useCustomers.ts:10`
**Issue**: Query doesn't specify `AppError` as error type
\`\`\`diff
--- frontend/src/hooks/useCustomers.ts
+++ frontend/src/hooks/useCustomers.ts
@@ -7,7 +7,7 @@

-export function useCustomers() {
-  return useQuery({
+export function useCustomers(): UseQueryResult<Customer[], AppError> {
+  return useQuery<Customer[], AppError>({
     queryKey: ['customers'],
     queryFn: fetchCustomers,
   });
\`\`\`
**Reasoning**: Specifying `AppError` ensures type safety in error handling and allows proper error discrimination in components.

---

## Warnings (Address Soon)
[Similar format for medium-priority issues]

## Suggested Improvements
### Global Error Interceptor Enhancement
Consider adding retry logic for transient errors:
\`\`\`ts
// frontend/src/api/client.ts
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 429) {
      // Rate limited - retry after delay
      return retryWithBackoff(error.config);
    }
    return Promise.reject(new AppError(error));
  }
);
\`\`\`

## Questions for Maintainers
1. Should we add a request deduplication layer for rapid duplicate calls?
2. Do we need offline queue support for failed mutations?
3. Should we log all API errors to a monitoring service?

## Validation Steps
\`\`\`bash
cd frontend
npm run type-check  # Should pass with no errors
npm run lint        # Should pass
npm run dev         # Test API calls in browser
\`\`\`
```

## Workflow

### Invocation
```bash
# From repo root
claude "Run api-layer-validator agent on frontend"
```

### Execution Steps
1. **Scan** for all HTTP calls in `frontend/src`
2. **Identify** violations of unified API pattern
3. **Check** React Query integration points
4. **Audit** error handling consistency
5. **Generate** `suggested-changes.md` with diffs
6. **Propose** architectural improvements
7. **Ask** about team preferences for edge cases

### Integration with CLAUDE.md
- ✅ Never auto-commit changes
- ✅ Output to `suggested-changes.md`
- ✅ Use unified diff format
- ✅ Provide reasoning for each change
- ✅ Ask clarifying questions

## Examples

### Example 1: Converting Direct Fetch
```ts
// ❌ Violation
async function deleteRo(id: string) {
  const response = await fetch(`/api/ros/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Delete failed');
}

// ✅ Fix
async function deleteRo(id: string): Promise<void> {
  await api.delete(`/api/ros/${id}`);
  // Error handling automatic via interceptor
}
```

### Example 2: Proper Query Setup
```ts
// ❌ Violation
const { data, error } = useQuery({
  queryKey: ['ros', roId],
  queryFn: () => fetch(`/api/ros/${roId}`).then(r => r.json()),
});

// ✅ Fix
const { data, error } = useQuery<RepairOrder, AppError>({
  queryKey: ['ros', roId],
  queryFn: () => api.get<RepairOrder>(`/api/ros/${roId}`).then(r => r.data),
});
```

### Example 3: Consistent Error Handling
```ts
// ❌ Violation
const mutation = useMutation({
  mutationFn: createRo,
  onError: (err) => {
    alert('Something went wrong');
  },
});

// ✅ Fix
const mutation = useMutation<RepairOrder, AppError, CreateRoInput>({
  mutationFn: createRo,
  onError: (error) => {
    // Global error handler shows toast automatically
    // Only add custom logic if needed
    if (error.code === 'DUPLICATE_RO') {
      navigate(`/ros/${error.details.existingId}`);
    }
  },
});
```

## Common Patterns to Enforce

### 1. API Client Structure
```ts
// frontend/src/api/client.ts
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
});

// Type-safe wrapper
export async function apiGet<T>(url: string): Promise<T> {
  const response = await api.get<T>(url);
  return response.data;
}
```

### 2. Query Hook Template
```ts
export function useResource(id: string): UseQueryResult<Resource, AppError> {
  return useQuery<Resource, AppError>({
    queryKey: ['resource', id],
    queryFn: async () => {
      const response = await api.get<Resource>(`/api/resources/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}
```

### 3. Mutation Hook Template
```ts
export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation<Resource, AppError, CreateResourceInput>({
    mutationFn: async (input) => {
      const response = await api.post<Resource>('/api/resources', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}
```

## Success Criteria
- Zero raw `fetch()` calls in production code
- All API methods specify generic types
- All query hooks define `<DataType, AppError>`
- Consistent error handling across all features
- `npm run type-check` passes with 0 errors

## Related Agents
- **type-safety-enforcer**: Ensures API response types are correct
- **auth-flow-auditor**: Validates token handling in API layer
- **react-query-optimizer**: Reviews query patterns for performance
