# Dependency Management & Peer Dependencies

## Issue: react-konva v19 Runtime Error

### What Happened

On January 5, 2026, we discovered a critical runtime error after deploying Stage 2:

```
Error: react-konva version 19 is only compatible with React 19.
Make sure to have the last version of react-konva and react or
downgrade react-konva to version 18.
```

**Root Cause**:

- `react-konva` was installed at v19.2.1 which requires React 19
- Our project uses React 18.3.1
- The version incompatibility was NOT caught during:
  - Installation (pnpm allowed it despite peer dependency mismatch)
  - Testing (we mocked react-konva, bypassing runtime checks)
  - TypeScript compilation (no type errors)
  - Dev server startup (error only appeared in browser)

### Why Tests Didn't Catch It

1. **Global Mocks**: We created `__mocks__/react-konva.tsx` that replaced the real package
   - Tests imported the mock, not the actual library
   - Mock worked with React 18, real package didn't

2. **Jest Configuration**: `moduleNameMapper` in `jest.config.ts` routed all imports to mocks

   ```typescript
   moduleNameMapper: {
     '^react-konva$': '<rootDir>/__mocks__/react-konva.tsx',
   }
   ```

3. **No Runtime Validation**: Tests never executed the actual react-konva code
   - Component tests passed because they used mock components
   - Browser runtime was the first time real react-konva was loaded

### Resolution

**Immediate Fix**:

```bash
pnpm remove react-konva
pnpm add react-konva@^18.2.10
```

Downgraded to react-konva v18.2.14 which is compatible with React 18.

## Safeguards Implemented

### 1. Peer Dependency Checker Script

**File**: `scripts/check-peer-deps.js`

Validates all peer dependencies before:

- Commits (pre-commit hook)
- Builds (CI/CD pipeline)
- Development (optional manual check)

**Usage**:

```bash
# Manual check
pnpm check:deps

# Run all checks (type-check + peer deps + lint)
pnpm check:all
```

**Behavior**:

- **Local Development**: Warns but allows commit (developer can investigate)
- **CI Environment**: **Fails build** if peer dependency issues exist
- Detects issues with: react-konva, Apollo packages, and any future dependencies

### 2. Updated Pre-Commit Hook

**File**: `.husky/pre-commit`

```bash
pnpm check:deps && pnpm lint && pnpm test:unit
```

Now runs dependency check **before** every commit.

### 3. New npm Scripts

Added to `package.json`:

```json
{
  "check:deps": "node scripts/check-peer-deps.js",
  "check:all": "pnpm type-check && pnpm check:deps && pnpm lint"
}
```

### 4. CI/CD Integration (Recommended)

Add to your CI workflow (GitHub Actions, GitLab CI, etc.):

```yaml
# .github/workflows/ci.yml
- name: Check Peer Dependencies
  run: |
    export CI=true
    pnpm check:deps
```

Setting `CI=true` makes the check **fail the build** on warnings.

## Best Practices Going Forward

### When Adding New Dependencies

1. **Always check peer dependencies**:

   ```bash
   pnpm add <package>
   pnpm check:deps
   ```

2. **Read installation warnings carefully**:

   ```
   WARN  Issues with peer dependencies found
   └─┬ package-name
     └── ✕ unmet peer react@^19: found 18.3.1
   ```

3. **For React ecosystem packages**:
   - Check package README for supported React versions
   - Look at package.json `peerDependencies` on npm
   - If in doubt, use `@latest-18` or `@18.x.x` tags

4. **Test in browser immediately**:
   - Don't trust passing tests alone (mocks can hide issues)
   - Run `pnpm dev` and load the page
   - Check browser console for errors

### When Updating Dependencies

1. **Use interactive mode**:

   ```bash
   pnpm update --interactive --latest
   ```

   Review peer dependency warnings before confirming

2. **Test thoroughly**:

   ```bash
   pnpm check:all       # Type check + deps + lint
   pnpm test:all        # Unit + E2E tests
   pnpm dev             # Manual browser test
   ```

3. **Update related packages together**:
   - React + react-dom + @types/react should be same major version
   - react-konva should match React major version
   - Next.js + eslint-config-next should be same major version

## Known Peer Dependency Warnings

As of January 5, 2026, the following warnings exist but are **non-critical**:

```
@apollo/experimental-nextjs-app-support 0.14.0
├── ✕ unmet peer react@^19: found 18.3.1
├── ✕ unmet peer next@^15.2.3: found 14.2.33
```

**Why they're non-critical**:

- Apollo packages are forward-compatible
- They work with React 18 despite requesting React 19
- Next.js 14 support is stable despite package requesting Next 15
- No runtime errors observed

**When to fix**:

- When upgrading to React 19 (future)
- When Apollo releases React 18 compatible versions
- If runtime errors appear related to Apollo

## Mock Strategy Review

### Current Approach (Correct)

- Mock **external libraries** that can't run in Jest (canvas, Konva)
- Mock **network calls** (Apollo GraphQL)
- Keep **business logic unmocked** (geometry, validation)

### Red Flags to Watch For

❌ **Don't mock** version-sensitive packages without runtime validation
❌ **Don't trust** passing tests if key integrations are mocked
❌ **Don't skip** browser testing after adding UI libraries

✅ **Do mock** judiciously (only what's necessary)
✅ **Do test** real integrations in E2E tests or browser
✅ **Do validate** peer dependencies before deploying

## Checklist for New Dependencies

- [ ] Check peer dependencies: `pnpm check:deps`
- [ ] Verify React version compatibility (if React package)
- [ ] Run unit tests: `pnpm test:unit`
- [ ] Start dev server: `pnpm dev`
- [ ] Load page in browser and check console
- [ ] Run E2E tests: `pnpm test:e2e` (if applicable)
- [ ] Check build succeeds: `pnpm build`
- [ ] Document any peer dependency warnings (this file)

## Reference Links

- [pnpm Peer Dependencies](https://pnpm.io/how-peers-are-resolved)
- [React Konva Compatibility](https://github.com/konvajs/react-konva#react-versions)
- [Semantic Versioning](https://semver.org/)

## Lessons Learned

1. **Mocks hide problems**: Tests passed because they never used the real library
2. **Peer dependencies matter**: Major version mismatches often break at runtime
3. **Warnings are clues**: pnpm showed warnings during install, but they were ignored
4. **Browser is truth**: If it doesn't work in the browser, it doesn't work
5. **Automate checks**: Pre-commit hooks catch issues before they reach production

---

**Last Updated**: January 5, 2026  
**Issue Resolution**: react-konva downgraded from 19.2.1 → 18.2.14  
**Safeguards Added**: Peer dependency checker + pre-commit hook + CI integration
