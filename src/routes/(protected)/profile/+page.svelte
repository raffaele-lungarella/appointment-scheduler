<script lang="ts">
  import { enhance } from "$app/forms";
  import { goto, invalidateAll } from "$app/navigation";
  import EditButton from "$lib/components/app/editbutton.svelte";
  import PageHeader from "$lib/components/app/pageheader.svelte";
  import Passwordinput from "$lib/components/app/passwordinput.svelte";
  import { CircleAlert, CircleCheckBig, KeyRound, Pencil, Save } from "$lib/components/icons";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import Button from "$lib/components/ui/button/button.svelte";
  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Form from "$lib/components/ui/form/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Separator } from "$lib/components/ui/separator";
  import { profileChangeEmailSchema, profileChangePasswordSchema } from "@schema";
  import type { SubmitFunction } from "@sveltejs/kit";
  import { untrack } from "svelte";
  import { toast } from "svelte-sonner";
  import { superForm } from "sveltekit-superforms";
  import { zod4Client as zodClient } from "sveltekit-superforms/adapters";

  import AvatarSection from "../(admin)/dashboard/general/avatar-section.svelte";
  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();

  const infoBackup = $derived({
    name: data.user.account.name,
    phoneNumber: data.user.account.phoneNumber,
  });

  let isOpen = $state(false);

  const deleteAccount: SubmitFunction = () => {
    return async ({ result }) => {
      if (result.type === "success" || result.type === "redirect") {
        toast.success("Account eliminato");
        await invalidateAll();
        goto("/");
      } else {
        toast.error(`Impossibile eliminare l'account. Riprova più tardi.`);
      }
      isOpen = false;
    };
  };

  const changeEmailSForm = superForm(
    untrack(() => data.changeEmailForm),
    {
      validators: zodClient(profileChangeEmailSchema),
      onUpdated({ form }) {
        if (!form.message) return;

        if (form.message.success) {
          toast.warning("Email inviata", { description: form.message.text });
          changeEmailDialog = false;
        } else {
          toast.error("Impossibile cambiare la mail.", { description: form.message.text });
        }
      },
    },
  );
  const {
    form: changeEmailData,
    enhance: changeEmailEnhance,
    delayed: changeEmailDelayed,
  } = changeEmailSForm;

  const changePasswordSForm = superForm(
    untrack(() => data.changePasswordForm),
    {
      validators: zodClient(profileChangePasswordSchema),
    },
  );
  const {
    form: changePasswordData,
    enhance: changePasswordEnhance,
    delayed: changePasswordDelayed,
    message: changePasswordMessage,
  } = changePasswordSForm;

  let isEditingInfo = $state(false);

  const toggleInfoUpdate = () => {
    // If no change is made restore previous values
    if (!isEditingInfo) {
      data.user = { ...data.user, ...infoBackup };
    }
  };

  let changeEmailDialog = $state(false);
  let changePasswordDialog = $state(false);
</script>

<div class="mx-auto w-full max-w-2xl">
  <PageHeader title="Profilo" />

  <div class="flex flex-col">
    <Card.Root class="mb-6">
      <Card.Content>
        <div class="space-y-4">
          {#if data.user.role === "staff"}
            <AvatarSection staff={data.user} />
            <Separator />
          {/if}
          <form action="?/updateInfo" method="post" class="space-y-4">
            <div class="flex flex-row justify-between">
              <Label for="name">Nome</Label>
              <Input
                class="max-w-50"
                name="name"
                value={data.user.account.name}
                placeholder="Mario Rossi"
                disabled={!isEditingInfo}
              />
            </div>

            <Separator />

            <div class="flex flex-row justify-between">
              <Label for="phone">Telefono</Label>
              <Input
                class="max-w-50"
                name="phone"
                value={data.user.account.phoneNumber}
                placeholder=""
                disabled={!isEditingInfo}
              />
            </div>

            <Separator />

            <div class="text-end">
              <EditButton bind:pressed={isEditingInfo} onclick={toggleInfoUpdate} />
              <Button class="ml-2" type="submit" disabled={!isEditingInfo}><Save />Salva</Button>
            </div>
          </form>
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Content class="space-y-5">
        <div class="flex flex-row justify-between">
          <Label for="email">Email</Label>
          <div class="align-middle items-center flex gap-4">
            {data.user.account.email}
            <Button
              onclick={() => (changeEmailDialog = !changeEmailDialog)}
              variant="outline"
              size="icon"><Pencil /></Button
            >
          </div>
        </div>
        <Separator />

        <div class="flex flex-row justify-between">
          <Label for="password">Password</Label>
          <div class="align-middle items-center flex gap-4">
            <Button
              onclick={() => (changePasswordDialog = !changePasswordDialog)}
              variant="outline"
            >
              Cambia password <KeyRound />
            </Button>
          </div>
        </div>
      </Card.Content>
    </Card.Root>

    <h2 class="px-2 mt-10 typo-subheading mb-6">Elimina account</h2>
    <Card.Root class="border-destructive">
      <Card.Content class="flex gap-4">
        <p class="text-muted-foreground typo-body-sm">
          Tutte le informazioni relative al tuo profilo saranno eliminate, l'azione non è
          reversibile.
        </p>
        <Button onclick={() => (isOpen = true)} variant="destructive">Elimina</Button>
      </Card.Content>
    </Card.Root>
  </div>
</div>

<AlertDialog.Root bind:open={isOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Sei sicuro?</AlertDialog.Title>
      <AlertDialog.Description>
        Tutte le tue prenotazioni, passate e future verrano eliminate
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Annulla</AlertDialog.Cancel>
      <form action="?/deleteAccount" method="post" use:enhance={deleteAccount}>
        <AlertDialog.Action class="{buttonVariants({ variant: 'destructive' })} w-full">
          Elimina account
        </AlertDialog.Action>
      </form>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<Dialog.Root bind:open={changeEmailDialog}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Cambia email</Dialog.Title>
      <Dialog.Description>
        Inserisci la nuova mail, ti verrà inviata una mail di conferma.
      </Dialog.Description>
    </Dialog.Header>
    <form class="space-y-4" action="?/changeEmail" method="post" use:changeEmailEnhance>
      <Form.Field form={changeEmailSForm} name="email">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Email</Form.Label>
            <Input
              {...props}
              type="email"
              placeholder="mariorossi@example.com"
              bind:value={$changeEmailData.email}
            />
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>
      <Dialog.Footer>
        <Button variant="secondary" type="button" onclick={() => (changeEmailDialog = false)}>
          Annulla
        </Button>
        <Button type="submit" disabled={$changeEmailDelayed}>Cambia</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={changePasswordDialog}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Cambia password</Dialog.Title>
    </Dialog.Header>
    {#if $changePasswordMessage?.success}
      <div class="flex flex-col gap-4">
        <Alert.Root variant="default" class="flex items-center gap-2">
          <CircleCheckBig class="size-4" />
          <Alert.Description>{$changePasswordMessage.text}</Alert.Description>
        </Alert.Root>
        <Dialog.Footer>
          <Button onclick={() => (changePasswordDialog = false)}>Chiudi</Button>
        </Dialog.Footer>
      </div>
    {:else}
      <form action="?/changePassword" method="post" use:changePasswordEnhance class="space-y-4">
        {#if $changePasswordMessage?.success === false}
          <Alert.Root variant="destructive" class="flex items-center gap-2">
            <CircleAlert class="size-4" />
            <Alert.Description>{$changePasswordMessage.text}</Alert.Description>
          </Alert.Root>
        {/if}

        <Form.Field form={changePasswordSForm} name="oldPassword">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>Password attuale</Form.Label>
              <Passwordinput {...props} bind:value={$changePasswordData.oldPassword} />
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        </Form.Field>

        <Form.Field form={changePasswordSForm} name="newPassword">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>Nuova password</Form.Label>
              <Passwordinput {...props} bind:value={$changePasswordData.newPassword} />
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        </Form.Field>

        <Form.Field form={changePasswordSForm} name="confirmPassword">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>Conferma password</Form.Label>
              <Passwordinput {...props} bind:value={$changePasswordData.confirmPassword} />
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        </Form.Field>

        <Dialog.Footer>
          <Button variant="secondary" type="button" onclick={() => (changePasswordDialog = false)}>
            Annulla
          </Button>
          <Button type="submit" disabled={$changePasswordDelayed}>Cambia</Button>
        </Dialog.Footer>
      </form>
    {/if}
  </Dialog.Content>
</Dialog.Root>
