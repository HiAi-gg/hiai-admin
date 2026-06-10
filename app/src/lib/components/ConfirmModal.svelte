<script lang="ts">
let {
  open = false,
  title = 'Confirm Action',
  message = 'Are you sure?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  requireReason = false,
  onConfirm,
  onCancel,
}: {
  open?: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  requireReason?: boolean;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
} = $props();

let reason = $state('');

function handleConfirm() {
  onConfirm(requireReason ? reason : undefined);
  reason = '';
}

function handleCancel() {
  onCancel();
  reason = '';
}
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="fixed inset-0 bg-background/80 backdrop-blur-sm" onclick={handleCancel}></div>

    <div class="relative z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
      <h2 class="text-lg font-semibold">{title}</h2>
      <p class="mt-2 text-sm text-muted-foreground">{message}</p>

      {#if requireReason}
        <div class="mt-4">
          <label for="reason" class="text-sm font-medium">Reason</label>
          <textarea
            id="reason"
            bind:value={reason}
            rows={3}
            class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Provide a reason..."
          ></textarea>
        </div>
      {/if}

      <div class="mt-6 flex justify-end gap-3">
        <button
          onclick={handleCancel}
          class="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          {cancelLabel}
        </button>
        <button
          onclick={handleConfirm}
          disabled={requireReason && !reason.trim()}
          class="inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          class:bg-primary={variant === 'default'}
          class:bg-destructive={variant === 'destructive'}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
{/if}
