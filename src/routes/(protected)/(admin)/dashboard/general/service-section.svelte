<script lang="ts">
  import { enhance } from "$app/forms";
  import {
    CircleAlert,
    CirclePlus,
    LoaderCircle,
    Pencil,
    Save,
    Trash,
  } from "$lib/components/icons/index";
  import * as Alert from "$lib/components/ui/alert";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Form from "$lib/components/ui/form";
  import { Input } from "$lib/components/ui/input";
  import * as InputGroup from "$lib/components/ui/input-group";
  import { Switch } from "$lib/components/ui/switch";
  import { Textarea } from "$lib/components/ui/textarea";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import type { OfferingDTO } from "$lib/dto";
  import { offeringSchema, updateOfferingSchema } from "@schema";
  import { untrack } from "svelte";
  import { toast } from "svelte-sonner";
  import { superForm } from "sveltekit-superforms";
  import { zod4Client as zodClient } from "sveltekit-superforms/adapters";

  import { getDataContext } from "./context";

  const context = getDataContext();
  const offerings = $derived(context.data.offerings);
  const addOfferingFormData = $derived(context.data.addOfferingForm);
  const updateOfferingFormData = $derived(context.data.updateOfferingForm);

  let addDialogOpen = $state(false);
  let editDialogOpen = $state(false);

  const addForm = superForm(
    untrack(() => addOfferingFormData),
    {
      validators: zodClient(offeringSchema),
      onResult({ result }) {
        if (result.type === "success") {
          addDialogOpen = false;
          toast.success("Servizio aggiunto.");
        } else if (result.type === "failure") {
          toast.error("Controlla i dati inseriti.");
        }
      },
    },
  );
  const { form: addData, enhance: addEnhance, delayed: addDelayed } = addForm;

  const editForm = superForm(
    untrack(() => updateOfferingFormData),
    {
      validators: zodClient(updateOfferingSchema),
      onResult({ result }) {
        if (result.type === "success") {
          editDialogOpen = false;
          toast.success("Servizio aggiornato.");
        } else if (result.type === "failure") {
          toast.error("Controlla i dati inseriti.");
        }
      },
    },
  );
  const { form: editData, enhance: editEnhance, delayed: editDelayed } = editForm;

  const openEdit = (offering: OfferingDTO) => {
    $editData = {
      id: offering.id,
      name: offering.name,
      description: offering.description ?? "",
      duration: offering.duration,
      price: offering.price,
      active: offering.active,
    };
    editDialogOpen = true;
  };
</script>

{#if offerings.length === 0}
  <Alert.Root variant="destructive" class="mb-4">
    <CircleAlert class="size-4" />
    <Alert.Title>Nessun servizio configurato</Alert.Title>
    <Alert.Description>
      Gli utenti non possono effettuare prenotazioni senza servizi disponibili. Aggiungi almeno un
      servizio.
    </Alert.Description>
  </Alert.Root>
{/if}

<div class="mb-4 flex flex-col gap-1">
  {#each offerings as offering (offering.id)}
    <div
      class="group hover:bg-gray-4/80 bg-gray-3 flex items-center justify-between rounded-xl border px-4 py-3 transition-colors border-border"
    >
      <div class="flex items-center gap-3">
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger>
              {#snippet child({ props })}
                <span
                  {...props}
                  class={["size-2 rounded-full", offering.active ? "bg-success" : "bg-gray-400"]}
                ></span>
              {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content>
              {offering.active ? "Disponibile" : "Non disponibile"}
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
        <span class="typo-label">{offering.name}</span>
      </div>

      <div class="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button size="icon" variant="ghost" class="size-8" onclick={() => openEdit(offering)}>
          <Pencil class="size-4" />
        </Button>

        <form
          action="?/deleteOffering"
          method="post"
          use:enhance={() => {
            return async ({ result, update }) => {
              await update();
              if (result.type === "success") {
                toast.success("Servizio eliminato.");
              } else {
                toast.error("Impossibile eliminare il servizio.");
              }
            };
          }}
        >
          <input type="hidden" name="id" value={offering.id} />
          <Button
            size="icon"
            variant="ghost"
            class="text-destructive hover:text-destructive size-8"
            type="submit"
          >
            <Trash class="size-4" />
          </Button>
        </form>
      </div>
    </div>
  {/each}
</div>

<Button onclick={() => (addDialogOpen = true)}>
  <CirclePlus />
  Aggiungi servizio
</Button>

<!-- Add dialog -->
<Dialog.Root bind:open={addDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Aggiungi servizio</Dialog.Title>
    </Dialog.Header>
    <form action="?/addOffering" method="post" class="flex flex-col gap-4 pt-2" use:addEnhance>
      <Form.Field form={addForm} name="name">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label required>Nome</Form.Label>
            <Input {...props} bind:value={$addData.name} placeholder="Taglio di capelli" />
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>

      <Form.Field form={addForm} name="description">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Descrizione</Form.Label>
            <Textarea {...props} bind:value={$addData.description} placeholder="..." />
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>

      <div class="grid grid-cols-2 gap-4">
        <Form.Field form={addForm} name="duration">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label required>Durata</Form.Label>
              <InputGroup.Root>
                <InputGroup.Input
                  {...props}
                  type="number"
                  step="any"
                  min="0"
                  bind:value={$addData.duration}
                  placeholder="30"
                />
                <InputGroup.Addon align="inline-end">min</InputGroup.Addon>
              </InputGroup.Root>
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        </Form.Field>

        <Form.Field form={addForm} name="price">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label required>Prezzo</Form.Label>
              <InputGroup.Root>
                <InputGroup.Addon align="inline-start">€</InputGroup.Addon>
                <InputGroup.Input
                  {...props}
                  type="number"
                  step="any"
                  min="0"
                  bind:value={$addData.price}
                  placeholder="20"
                />
              </InputGroup.Root>
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        </Form.Field>
      </div>

      <Form.Field form={addForm} name="active">
        <Form.Control>
          {#snippet children({ props })}
            <div class="flex items-center gap-2">
              <Switch {...props} bind:checked={$addData.active} />
              <Form.Label class="mb-0">Visibile</Form.Label>
            </div>
          {/snippet}
        </Form.Control>
        <Form.Description>Determina se il servizio è prenotabile dagli utenti.</Form.Description>
      </Form.Field>

      <Dialog.Footer>
        <Button type="button" variant="secondary" onclick={() => (addDialogOpen = false)}>
          Annulla
        </Button>
        <Button type="submit" disabled={$addDelayed}>
          {#if $addDelayed}
            <LoaderCircle class="size-4 animate-spin" />
          {:else}
            <Save class="size-4" />
          {/if}
          Salva
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<!-- Edit dialog -->
<Dialog.Root
  bind:open={editDialogOpen}
  onOpenChange={(v) => {
    if (!v) editDialogOpen = false;
  }}
>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Modifica servizio</Dialog.Title>
    </Dialog.Header>
    <form action="?/updateOffering" method="post" class="flex flex-col gap-4 pt-2" use:editEnhance>
      <input type="hidden" name="id" value={$editData.id} />

      <Form.Field form={editForm} name="name">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label required>Nome</Form.Label>
            <Input {...props} bind:value={$editData.name} />
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>

      <Form.Field form={editForm} name="description">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Descrizione</Form.Label>
            <Textarea {...props} bind:value={$editData.description} />
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>

      <div class="grid grid-cols-2 gap-4">
        <Form.Field form={editForm} name="duration">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label required>Durata</Form.Label>
              <InputGroup.Root>
                <InputGroup.Input
                  {...props}
                  type="number"
                  step="any"
                  min="0"
                  bind:value={$editData.duration}
                />
                <InputGroup.Addon align="inline-end">min</InputGroup.Addon>
              </InputGroup.Root>
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        </Form.Field>

        <Form.Field form={editForm} name="price">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label required>Prezzo</Form.Label>
              <InputGroup.Root>
                <InputGroup.Addon align="inline-start">€</InputGroup.Addon>
                <InputGroup.Input
                  {...props}
                  type="number"
                  step="any"
                  min="0"
                  bind:value={$editData.price}
                />
              </InputGroup.Root>
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        </Form.Field>
      </div>

      <Form.Field form={editForm} name="active">
        <Form.Control>
          {#snippet children({ props })}
            <div class="flex items-center gap-2">
              <Switch {...props} bind:checked={$editData.active} />
              <Form.Label class="mb-0">Disponibile</Form.Label>
            </div>
          {/snippet}
        </Form.Control>
      </Form.Field>

      <Dialog.Footer>
        <Button type="button" variant="secondary" onclick={() => (editDialogOpen = false)}>
          Annulla
        </Button>
        <Button type="submit" disabled={$editDelayed}>
          {#if $editDelayed}
            <LoaderCircle class="size-4 animate-spin" />
          {:else}
            <Save class="size-4" />
          {/if}
          Aggiorna
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
