<script lang="ts">
    import { toggleMode } from 'mode-watcher';
    import { Button } from '$lib/components/ui/button';
    import { Sun, Moon } from 'lucide-svelte';
</script>

<Button
    onclick={toggleMode}
    variant="ghost" 
    size="icon"
    class="
        relative h-7 w-7 
        group
        border border-border/30
        hover:scale-110 
        hover:border-border/60
        active:scale-95
        focus:outline-none focus:ring-0
        transition-all duration-300 ease-out
        bg-transparent
        hover:bg-transparent
    "
    aria-label="Toggle theme"
>
    <Sun
        class="
            h-3.5 w-3.5 
            text-foreground
            rotate-0 scale-100 
            transition-all duration-500 ease-out
            dark:-rotate-180 dark:scale-0 dark:opacity-0
            group-hover:rotate-12 group-hover:scale-110
            group-active:scale-90
        "
    />
    <Moon
        class="
            absolute h-3.5 w-3.5 
            text-orange-400 dark:text-orange-500
            rotate-180 scale-0 opacity-0
            transition-all duration-500 ease-out
            dark:rotate-0 dark:scale-100 dark:opacity-100
            group-hover:-rotate-12 group-hover:scale-110
            group-active:scale-90
        "
    />
    <span class="sr-only">Toggle theme</span>
</Button>
