<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { cn } from "$lib/utils";

  const {
    pending,
    class: className,
  }: {
    pending: boolean;
    class?: string;
  } = $props();
</script>

<Badge variant="outline" class={cn("flex items-center text-xs gap-1.5", className)}>
  <span class={cn("size-2 rounded-full", pending ? "bg-amber-500" : "bg-success")}></span>
  {pending ? "In attesa" : "Confermata"}
</Badge>
