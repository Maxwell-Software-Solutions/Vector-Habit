# PR Preview Feedback Setup

This document explains how to configure your deployment preview URLs to automatically link feedback to pull requests.

## Overview

When users create feedback on a PR preview deployment, the system can automatically:

- Tag issues with `pr-preview-feedback` label
- Link the issue to the correct PR
- Post a comment on the PR with the feedback
- Include screenshot and context

## URL Format

Add the PR number as a query parameter when sharing preview links:

```
https://your-preview-url.vercel.app/?pr=123
```

## Automatic Configuration (Recommended)

### Vercel Deployment Comments

Configure your repository to automatically add PR parameters to Vercel preview URLs:

1. **GitHub Actions Workflow** (create `.github/workflows/add-pr-to-preview.yml`):

```yaml
name: Add PR Number to Preview URL

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  update-preview-url:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write

    steps:
      - name: Wait for Vercel deployment
        run: sleep 30

      - name: Comment with feedback-enabled preview URL
        uses: actions/github-script@v7
        with:
          script: |
            const prNumber = context.payload.pull_request.number;
            const previewUrl = `https://vercel-spine-git-${context.payload.pull_request.head.ref.replace(/\//g, '-')}-maxwell-software-solutions.vercel.app`;

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: prNumber,
              body: `### 🔍 Preview with Feedback Tool
              
              Test this PR and provide inline feedback:
              
              **Preview URL:** ${previewUrl}?pr=${prNumber}
              
              🤖 _The Inline AI Editor is enabled - click elements to provide feedback!_`
            });
```

### Vercel Integration (Alternative)

Configure your Vercel deployment to automatically append PR numbers:

1. Add to `next.config.js`:

```javascript
module.exports = {
  async redirects() {
    return [
      // Auto-detect Vercel PR deployments and add ?pr= parameter
      {
        source: '/:path*',
        has: [
          {
            type: 'header',
            key: 'x-vercel-deployment-url',
          },
        ],
        destination: '/:path*?pr=' + process.env.VERCEL_GIT_PULL_REQUEST_ID,
        permanent: false,
      },
    ];
  },
};
```

## Manual Usage

When sharing PR previews for review:

1. **Copy the Vercel preview URL** from the PR checks
2. **Add `?pr=X`** to the URL where X is the PR number
3. **Share the modified URL** with reviewers

Example:

```
Original: https://vercel-spine-abc123.vercel.app
Modified: https://vercel-spine-abc123.vercel.app/?pr=42
```

## Testing

To verify the PR linking works:

1. Open a PR preview with `?pr=123` parameter
2. Use the Inline AI Editor to create feedback
3. Check that:
   - Issue has `pr-preview-feedback` label
   - Issue body contains `Related PR: #123`
   - PR #123 has a comment with the feedback
   - Issue has a comment linking back to the PR

## Workflow Details

The `link-pr-preview-issues.yml` workflow automatically:

1. **Triggers** when an issue with `pr-preview-feedback` label is created
2. **Extracts** PR number from issue body (`Related PR: #123`)
3. **Comments** on the PR with:
   - Issue title and summary
   - Screenshot (if available)
   - Element selector
   - Link to full issue
4. **Comments** on the issue with:
   - Link back to the PR
   - Options for addressing feedback
5. **Adds** a 🔗 reaction to show linking succeeded

## Troubleshooting

### Issue not linking to PR

**Symptom**: Issue created but no PR comment

**Check**:

- URL had `?pr=123` parameter
- PR #123 exists and is open
- Workflow has proper permissions

### Preview URL doesn't have widget

**Check**:

- `NEXT_PUBLIC_INLINE_AI=1` is set in Vercel environment
- Preview deployment rebuilt after setting variable
- Not in production environment

### Wrong PR linked

**Symptom**: Feedback posted to wrong PR

**Fix**:

- Verify the `?pr=` parameter in the URL
- Use the correct preview deployment URL for each PR
