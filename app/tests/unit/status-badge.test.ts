// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import StatusBadge from '../../src/lib/components/StatusBadge.svelte';

afterEach(() => {
  cleanup();
});

function classNames(container: HTMLElement): string {
  return container.firstElementChild?.className ?? '';
}

describe('StatusBadge', () => {
  it('renders the status text inside a span', () => {
    const { container } = render(StatusBadge, { status: 'active' });
    const span = container.querySelector('span');
    expect(span).not.toBeNull();
    expect(span?.textContent?.trim()).toBe('active');
  });

  it('applies the success style class for active status', () => {
    const { container } = render(StatusBadge, { status: 'active' });
    const classes = classNames(container as HTMLElement);
    expect(classes).toContain('bg-success');
    expect(classes).toContain('text-success');
  });

  it('applies the destructive style class for suspended status', () => {
    const { container } = render(StatusBadge, { status: 'suspended' });
    const classes = classNames(container as HTMLElement);
    expect(classes).toContain('bg-destructive');
  });

  it('applies the warning style class for pending status', () => {
    const { container } = render(StatusBadge, { status: 'pending' });
    const classes = classNames(container as HTMLElement);
    expect(classes).toContain('bg-warning');
  });

  it('applies the info style class for trial / trialing status', () => {
    const { container: trial } = render(StatusBadge, { status: 'trial' });
    const { container: trialing } = render(StatusBadge, { status: 'trialing' });
    expect(classNames(trial as HTMLElement)).toContain('bg-info');
    expect(classNames(trialing as HTMLElement)).toContain('bg-info');
  });

  it('falls back to the pending style for unknown statuses', () => {
    const { container } = render(StatusBadge, { status: 'not-a-real-status' });
    const classes = classNames(container as HTMLElement);
    expect(classes).toContain('bg-warning');
  });

  it('uses the sm size class when size="sm"', () => {
    const { container } = render(StatusBadge, { status: 'active', size: 'sm' });
    expect(classNames(container as HTMLElement)).toContain('text-[10px]');
  });

  it('uses the lg size class when size="lg"', () => {
    const { container } = render(StatusBadge, { status: 'active', size: 'lg' });
    expect(classNames(container as HTMLElement)).toContain('text-sm');
  });

  it('uses the default size class by default', () => {
    const { container } = render(StatusBadge, { status: 'active' });
    expect(classNames(container as HTMLElement)).toContain('text-xs');
  });
});
