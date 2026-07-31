<script lang="ts">
  import { goto } from "$app/navigation";
  import AuthLayout from "$lib/components/app/authlayout.svelte";
  import PasswordInput from "$lib/components/app/passwordinput.svelte";
  import { LoaderCircle } from "$lib/components/icons/index";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Form from "$lib/components/ui/form";
  import { Input } from "$lib/components/ui/input";
  import Separator from "$lib/components/ui/separator/separator.svelte";
  import { signupSchema } from "@schema";
  import { untrack } from "svelte";
  import { toast } from "svelte-sonner";
  import { superForm } from "sveltekit-superforms";
  import { zod4Client as zodClient } from "sveltekit-superforms/adapters";

  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();

  const sForm = superForm(
    untrack(() => data.form),
    {
      validators: zodClient(signupSchema),
      onUpdated({ form }) {
        if (form.message) {
          if (form.message.success) {
            toast.warning("Email di verifica", {
              description: form.message.text,
              duration: 4000,
            });
            goto("/");
          } else {
            toast.error(`C'è stato un errore`, {
              description: form.message.text,
            });
          }
        }
      },
    },
  );

  const { form: formData, enhance, delayed } = sForm;
</script>

<svelte:head>
  <meta name="description" content="Registrati al sito." />
</svelte:head>

<AuthLayout title="Benvenuto" subtitle="Crea il tuo account.">
  <form method="post" use:enhance>
    <div class="space-y-4">
      <Form.Field form={sForm} name="email">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label required>Email</Form.Label>
            <Input
              autocomplete="email"
              {...props}
              bind:value={$formData.email}
              placeholder="mariorossi@esempio.com"
            />
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>

      <Form.Field form={sForm} name="password">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label required>Password</Form.Label>
            <PasswordInput {...props} bind:value={$formData.password} />
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>

      <Form.Field form={sForm} name="confirmPassword">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label required>Conferma password</Form.Label>
            <PasswordInput {...props} bind:value={$formData.confirmPassword} />
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>

      <Separator />

      <Form.Field form={sForm} name="name">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label required>Nome</Form.Label>
            <Input
              {...props}
              bind:value={$formData.name}
              placeholder="Mario Rossi"
              autocomplete="name"
            />
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>

      <Form.Field form={sForm} name="phoneNumber">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Telefono</Form.Label>
            <Input {...props} bind:value={$formData.phoneNumber} placeholder="" />
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>
    </div>
    <div class="mt-8 flex justify-between">
      <Button variant="outline" href="/login" aria-label="Login">Accedi</Button>
      <Button disabled={$delayed} type="submit">
        {#if !$delayed}
          Register
        {:else}
          <LoaderCircle class="animate-spin" />
          Attendi
        {/if}
      </Button>
    </div>
  </form>
</AuthLayout>
