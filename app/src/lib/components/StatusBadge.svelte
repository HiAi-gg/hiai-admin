<script lang="ts">
  let {
    status,
    size = 'default'
  }: {
    status: string;
    size?: 'sm' | 'default' | 'lg';
  } = $props();

  const statusStyles: Record<string, string> = {
    active: 'bg-success/10 text-success border-success/20',
    suspended: 'bg-destructive/10 text-destructive border-destructive/20',
    pending: 'bg-warning/10 text-warning border-warning/20',
    trial: 'bg-info/10 text-info border-info/20',
    canceled: 'bg-muted text-muted-foreground border-border',
    past_due: 'bg-warning/10 text-warning border-warning/20',
    trialing: 'bg-info/10 text-info border-info/20',
    connected: 'bg-success/10 text-success border-success/20',
    disconnected: 'bg-muted text-muted-foreground border-border',
    error: 'bg-destructive/10 text-destructive border-destructive/20',
    paid: 'bg-success/10 text-success border-success/20',
    open: 'bg-warning/10 text-warning border-warning/20',
    void: 'bg-muted text-muted-foreground border-border'
  };

  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    default: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm'
  };

  let style = $derived(statusStyles[status] || statusStyles.pending);
  let sizeStyle = $derived(sizeStyles[size]);
</script>

<span class="inline-flex items-center rounded-full border font-medium {style} {sizeStyle}">
  {status}
</span>
