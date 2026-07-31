<script lang="ts">
  import EphemeralPage from "$lib/components/app/ephemeral-page.svelte";
  import Passwordinput from "$lib/components/app/passwordinput.svelte";
  import { CircleAlert, LoaderCircle } from "$lib/components/icons";
  import * as Alert from "$lib/components/ui/alert";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Form from "$lib/components/ui/form";
  import { changePasswordSchema } from "@schema";
  import { untrack } from "svelte";
  import { superForm } from "sveltekit-superforms";
  import { zod4Client as zodClient } from "sveltekit-superforms/adapters";

  import type { PageData } from "./$types";

  const { data }: { data: PageData } = $props();
  const sForm = superForm(
    untrack(() => data.changePasswordForm),
    {
      validators: zodClient(changePasswordSchema),
    },
  );
  const { form: formData, enhance, delayed, message } = sForm;

  const title = $derived(
    data.status === "ready"
      ? "Scegli una nuova password"
      : data.status === "expired"
        ? "Richiesta scaduta"
        : "Link non valido",
  );
  const description = $derived(
    data.status === "ready"
      ? "Inserisci e conferma la nuova password del tuo account."
      : data.status === "expired"
        ? "La richiesta di aggiornamento è scaduta. Richiedi un nuovo link per continuare."
        : "Il link non è valido. Richiedi un nuovo link per continuare.",
  );
</script>

<svelte:head>
  <title>Reimposta password</title>
  <meta name="description" content="Scegli una nuova password per il tuo account." />
</svelte:head>

<EphemeralPage {title} {description}>
  {#if data.status === "ready"}
    {#if $message?.success === false}
      <Alert.Root variant="destructive" class="flex items-center gap-2">
        <CircleAlert class="size-4" />
        <Alert.Description>{$message.text}</Alert.Description>
      </Alert.Root>
    {/if}

    <form method="post" use:enhance class="space-y-4">
      <Form.Field form={sForm} name="newPassword">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Nuova password</Form.Label>
            <Passwordinput
              {...props}
              bind:value={$formData.newPassword}
              onblur={() => void sForm.validate("newPassword")}
            />
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>

      <Form.Field form={sForm} name="confirmPassword">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Conferma password</Form.Label>
            <Passwordinput
              {...props}
              bind:value={$formData.confirmPassword}
              onblur={() => void sForm.validate("confirmPassword")}
            />
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>

      <div class="flex justify-end">
        <Button disabled={$delayed} type="submit">
          {#if $delayed}<LoaderCircle class="animate-spin" />Attendi{:else}Cambia password{/if}
        </Button>
      </div>
    </form>
  {:else}
    <Button href="/login">Richiedi un nuovo link</Button>
  {/if}
</EphemeralPage>
