'use client';

import React, { useState } from 'react';
import * as htmlToImage from 'html-to-image';

type PickedTarget = {
  selector: string;
  rect: { x: number; y: number; width: number; height: number };
  screenshotDataUrl?: string;
};

/**
 * Generates a stable CSS selector for a given element.
 * Priority: data-ai-id > id > simplified path
 */
function getBestSelector(el: Element): string {
  // 1. Prefer stable data attribute
  const withData = (el.closest('[data-ai-id]') as HTMLElement) || null;
  if (withData) return `[data-ai-id="${withData.dataset.aiId}"]`;

  // 2. Use element ID if available
  const id = (el as HTMLElement).id;
  if (id) return `#${id}`;

  // 3. Build simplified path (max 4 levels)
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && parts.length < 4) {
    const name = node.tagName.toLowerCase();
    const cls = (node as HTMLElement).className?.split?.(' ')[0] || '';
    parts.unshift(`${name}${cls ? '.' + cls : ''}`);
    node = node.parentElement;
  }
  return parts.join(' > ');
}

export default function AiInlineRequest() {
  const [selector, setSelector] = useState<string>('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<PickedTarget | null>(null);

  /**
   * Activates element picker mode - next click will select target
   */
  async function selectElementOnce() {
    return new Promise<PickedTarget>((resolve) => {
      function onClick(e: MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        document.removeEventListener('click', onClick, true);

        const el = e.target as HTMLElement;
        const rect = el.getBoundingClientRect();
        const selector = getBestSelector(el);

        resolve({
          selector,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        });
      }
      // Use capture phase to intercept before other handlers
      document.addEventListener('click', onClick, true);
    });
  }

  async function handlePick() {
    const target = await selectElementOnce();

    // Attempt to capture screenshot of selected element
    try {
      const node = document.querySelector(target.selector) as HTMLElement | null;
      if (node) {
        const dataUrl = await htmlToImage.toPng(node, {
          cacheBust: true,
          pixelRatio: 2, // Retina quality
        });
        target.screenshotDataUrl = dataUrl;
      }
    } catch (err) {
      console.warn('Screenshot capture failed (non-fatal):', err);
    }

    setPicked(target);
    setSelector(target.selector);
  }

  async function submit() {
    if (!selector || !desc) return;
    setBusy(true);

    try {
      // Detect if viewing a PR preview (check URL params or Vercel preview env)
      const urlParams = new URLSearchParams(window.location.search);
      const prNumber = urlParams.get('pr') || urlParams.get('pull') || null;

      const res = await fetch('/api/ai-change-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: window.location.href,
          selector,
          description: desc,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
          screenshotDataUrl: picked?.screenshotDataUrl,
          prNumber: prNumber ? parseInt(prNumber, 10) : undefined,
        }),
      });

      const json = await res.json();

      if (json.ok) {
        alert(
          `✅ Issue created successfully!\n\n${json.issueUrl}\n\nA coding agent will be notified.`
        );
        // Reset form
        setDesc('');
        setPicked(null);
        setSelector('');
      } else {
        alert(`❌ Error: ${json.error}`);
      }
    } catch (err) {
      alert(`❌ Network error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 999999,
        background: 'white',
        border: '2px solid #3b82f6',
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 10px 40px rgba(59, 130, 246, 0.3)',
        width: 340,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: 15,
          marginBottom: 12,
          color: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 20 }}>✨</span>
        Inline AI Editor
      </div>

      <button
        onClick={handlePick}
        disabled={busy}
        style={{
          padding: '8px 14px',
          borderRadius: 8,
          border: picked ? '2px solid #22c55e' : '2px solid #e2e8f0',
          background: picked ? '#f0fdf4' : 'white',
          cursor: busy ? 'not-allowed' : 'pointer',
          fontWeight: 600,
          fontSize: 13,
          width: '100%',
          transition: 'all 0.2s',
        }}
      >
        {picked ? '✓ Element Selected' : '🎯 Pick Element'}
      </button>

      {selector && (
        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            color: '#64748b',
            background: '#f8fafc',
            padding: 8,
            borderRadius: 6,
            fontFamily: 'monospace',
            wordBreak: 'break-all',
          }}
        >
          <strong>Selector:</strong> {selector}
        </div>
      )}

      <textarea
        placeholder="Describe what you want changed (e.g., 'Make the heading larger and bold' or 'Change button color to blue')..."
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        disabled={busy}
        style={{
          marginTop: 12,
          width: '100%',
          height: 100,
          padding: 10,
          borderRadius: 8,
          border: '2px solid #e2e8f0',
          fontSize: 13,
          fontFamily: 'inherit',
          resize: 'vertical',
          outline: 'none',
        }}
        onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
        onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
      />

      <button
        onClick={submit}
        disabled={busy || !desc || !selector}
        style={{
          marginTop: 12,
          width: '100%',
          padding: '10px 14px',
          borderRadius: 8,
          background: busy || !desc || !selector ? '#94a3b8' : '#3b82f6',
          color: 'white',
          border: 'none',
          fontWeight: 600,
          fontSize: 14,
          cursor: busy || !desc || !selector ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {busy ? '⏳ Creating Issue...' : '🚀 Create AI Change Request'}
      </button>

      <div
        style={{
          marginTop: 10,
          fontSize: 11,
          color: '#94a3b8',
          lineHeight: 1.4,
        }}
      >
        💡 <strong>Tip:</strong> Add{' '}
        <code
          style={{
            background: '#f1f5f9',
            padding: '2px 4px',
            borderRadius: 3,
          }}
        >
          data-ai-id
        </code>{' '}
        attributes to components you edit frequently.
      </div>
    </div>
  );
}
