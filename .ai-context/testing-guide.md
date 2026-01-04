# Testing Guide

## Unified Test Command

```powershell
# Run all tests sequentially
pnpm test:all
```

This runs:
1. Jest unit tests with coverage (must be ≥95%)
2. Playwright E2E tests with visual feedback
3. Lighthouse CI performance tests (must score ≥90)

## Unit Testing with Jest

### Run Tests

```powershell
pnpm test:unit           # Run with coverage, CI mode
pnpm test:unit:watch     # Watch mode for development
pnpm test:unit:coverage  # Generate detailed coverage report
```

### Coverage Requirements

**All thresholds set to 95%:**
- Statements: 95%
- Branches: 95%
- Functions: 95%
- Lines: 95%

Build will **FAIL** if coverage drops below 95%.

### Writing Tests

```typescript
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders without crashing', () => {
    render(<MyComponent />);
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  // Add comprehensive tests to meet 95% coverage
});
```

## E2E Testing with Playwright

### Run Tests

```powershell
pnpm test:e2e         # Headless mode
pnpm test:e2e:headed  # Headed mode (see browser)
pnpm test:e2e:ui      # UI mode (interactive)
```

### Visual Artifacts

Playwright captures:
- Screenshots on failure
- Videos on failure
- Traces for debugging

Artifacts uploaded to CI for AI review.

## Performance Testing with Lighthouse CI

### Run Tests

```powershell
pnpm test:perf
```

### Performance Budgets

All scores must be ≥90:
- Performance: 90+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 90+

Core Web Vitals:
- FCP < 2s
- LCP < 2.5s
- CLS < 0.1
- TBT < 300ms

## CI Integration

All tests run in GitHub Actions:
1. Jest coverage reports uploaded
2. Playwright artifacts uploaded
3. Lighthouse reports uploaded
4. Build fails if any test suite fails
