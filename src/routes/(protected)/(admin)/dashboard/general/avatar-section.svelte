<script lang="ts">
  import { enhance } from "$app/forms";
  import * as Avatar from "$lib/components/ui/avatar";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Slider } from "$lib/components/ui/slider/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { getInitials } from "$lib/utils";
  import { mergeProps } from "bits-ui";
  import { SvelteMap } from "svelte/reactivity";

  const { staff } = $props();

  const OUTPUT_SIZE = 400;

  let avatarPreview = $derived<string | null>(staff.staff.avatar ?? null);
  let avatarOriginalSrc = $state<string | null>(null);
  let pendingAvatarPreview = $state<string | null>(null);
  let avatarDialogOpen = $state(false);
  let isImageLoaded = $state(false);

  let deleteAvatarForm = $state<HTMLFormElement | undefined>();
  let updateAvatarForm = $state<HTMLFormElement | undefined>();

  function resizeImage(dataUrl: string, maxSize: number): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const context = canvas.getContext("2d");
        if (!context) {
          resolve(dataUrl);
          return;
        }
        context.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.src = dataUrl;
    });
  }

  function onFileSelected(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      resizeImage(dataUrl, 1200).then((resized) => {
        isImageLoaded = false;
        imageNaturalWidth = 0;
        imageNaturalHeight = 0;
        avatarOriginalSrc = resized;
        initialDisplayScale = 0;
        initialOffsetX = 0;
        initialOffsetY = 0;
        avatarDialogOpen = true;
      });
    };
    reader.readAsDataURL(file);
  }

  function openAvatarEdit() {
    avatarOriginalSrc = null;
    isImageLoaded = false;
    imageNaturalWidth = 0;
    imageNaturalHeight = 0;
    initialDisplayScale = 0;
    initialOffsetX = 0;
    initialOffsetY = 0;
    avatarDialogOpen = true;
  }

  // Crop state
  let containerSize = $state(0);
  const circleDiameter = $derived(containerSize * 0.6);

  let imgEl = $state<HTMLImageElement | undefined>();
  let imageNaturalWidth = $state(0);
  let imageNaturalHeight = $state(0);
  let displayScale = $state(0.5);
  let offsetX = $state(0);
  let offsetY = $state(0);
  let isDragging = $state(false);
  let dragStart = { x: 0, y: 0, ox: 0, oy: 0 };

  const activePointers = new SvelteMap<number, { x: number; y: number }>();
  let pinchStartDistance = 0;
  let pinchStartScale = 0;

  const minScale = $derived(
    imageNaturalWidth > 0 && imageNaturalHeight > 0
      ? circleDiameter / Math.min(imageNaturalWidth, imageNaturalHeight)
      : 1,
  );
  const maxScale = $derived(minScale * 4);
  const maxOffsetX = $derived((imageNaturalWidth * displayScale) / 2 - circleDiameter / 2);
  const maxOffsetY = $derived((imageNaturalHeight * displayScale) / 2 - circleDiameter / 2);

  let initialDisplayScale = 0;
  let initialOffsetX = 0;
  let initialOffsetY = 0;

  function restoreInitial() {
    if (!imgEl) return;
    imageNaturalWidth = imgEl.naturalWidth;
    imageNaturalHeight = imgEl.naturalHeight;
    isImageLoaded = true;
    displayScale = initialDisplayScale > 0 ? initialDisplayScale : minScale;
    const maxX = (imageNaturalWidth * displayScale) / 2 - circleDiameter / 2;
    const maxY = (imageNaturalHeight * displayScale) / 2 - circleDiameter / 2;
    offsetX = clamp(initialOffsetX, -maxX, maxX);
    offsetY = clamp(initialOffsetY, -maxY, maxY);
  }

  function clamp(v: number, min: number, max: number) {
    return Math.min(Math.max(v, min), max);
  }

  function applyZoom(newScale: number) {
    if (!imgEl) return;
    newScale = clamp(newScale, minScale, maxScale);
    const ratio = newScale / displayScale;
    displayScale = newScale;
    offsetX = clamp(offsetX * ratio, -maxOffsetX, maxOffsetX);
    offsetY = clamp(offsetY * ratio, -maxOffsetY, maxOffsetY);
  }

  function getPinchDistance(): number {
    const pts = Array.from(activePointers.values());
    return Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
  }

  function onPointerDown(e: PointerEvent) {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (activePointers.size === 1) {
      isDragging = true;
      dragStart = {
        x: e.clientX,
        y: e.clientY,
        ox: offsetX,
        oy: offsetY,
      };
    } else if (activePointers.size === 2) {
      isDragging = false;
      pinchStartDistance = getPinchDistance();
      pinchStartScale = displayScale;
    }
  }

  function onPointerMove(e: PointerEvent) {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.size >= 2) {
      if (pinchStartDistance > 0) {
        applyZoom(pinchStartScale * Math.pow(getPinchDistance() / pinchStartDistance, 0.01));
      }
    } else if (isDragging) {
      offsetX = clamp(dragStart.ox + (e.clientX - dragStart.x), -maxOffsetX, maxOffsetX);
      offsetY = clamp(dragStart.oy + (e.clientY - dragStart.y), -maxOffsetY, maxOffsetY);
    }
  }

  function onPointerUp(e: PointerEvent) {
    activePointers.delete(e.pointerId);
    if (activePointers.size === 0) {
      isDragging = false;
    } else if (activePointers.size === 1) {
      isDragging = true;
      const [remaining] = activePointers.values();
      dragStart = {
        x: remaining.x,
        y: remaining.y,
        ox: offsetX,
        oy: offsetY,
      };
    } else if (activePointers.size === 2) {
      pinchStartDistance = getPinchDistance();
      pinchStartScale = displayScale;
    }
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    applyZoom(displayScale * Math.pow(0.997, e.deltaY));
  }

  function getCroppedBase64(): string | null {
    if (!imgEl) return null;

    const imgDisplayLeft = containerSize / 2 - (imageNaturalWidth * displayScale) / 2 + offsetX;
    const imgDisplayTop = containerSize / 2 - (imageNaturalHeight * displayScale) / 2 + offsetY;
    const circleLeft = containerSize / 2 - circleDiameter / 2;
    const circleTop = containerSize / 2 - circleDiameter / 2;
    const srcX = (circleLeft - imgDisplayLeft) / displayScale;
    const srcY = (circleTop - imgDisplayTop) / displayScale;
    const srcSize = circleDiameter / displayScale;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(imgEl, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    for (const q of [0.85, 0.75, 0.65, 0.5]) {
      const url = canvas.toDataURL("image/jpeg", q);
      if (url.length <= 400_000) return url;
    }

    const small = document.createElement("canvas");
    small.width = 200;
    small.height = 200;
    const smallContext = small.getContext("2d");
    if (!smallContext) return null;
    smallContext.drawImage(canvas, 0, 0, 200, 200);
    return small.toDataURL("image/jpeg", 0.75);
  }

  function handleConfirm() {
    if (!imgEl || !updateAvatarForm || !avatarOriginalSrc) return;
    const base64 = getCroppedBase64();
    if (!base64) return;

    pendingAvatarPreview = base64;

    const els = updateAvatarForm.elements;
    (els.namedItem("avatarBase64") as HTMLInputElement).value = base64;
    (els.namedItem("avatarOriginal") as HTMLInputElement).value = avatarOriginalSrc;
    (els.namedItem("offsetX") as HTMLInputElement).value = String(offsetX);
    (els.namedItem("offsetY") as HTMLInputElement).value = String(offsetY);
    (els.namedItem("displayScale") as HTMLInputElement).value = String(displayScale);

    avatarDialogOpen = false;
    updateAvatarForm.requestSubmit();
  }
</script>

<!-- Avatar -->

<div class="flex flex-row justify-between">
  <Label for="avatar">Avatar</Label>
  <div class="flex items-center gap-3">
    <Tooltip.Root>
      <Tooltip.Trigger>
        {#snippet child({ props })}
          {@const mergedProps = mergeProps({ onclick: openAvatarEdit }, props)}
          <button
            {...mergedProps}
            type="button"
            aria-label="Modifica avatar"
            class="hover:bg-gray-2 hover:cursor-pointer"
          >
            <Avatar.Root class="relative">
              <Avatar.Fallback>{getInitials(staff.account.name)}</Avatar.Fallback>
              <Avatar.Image src={avatarPreview ?? undefined} alt="Avatar" />
              <div
                class="h-full w-full bg-transparent hover:bg-background/40 absolute rounded-full transition-all ease-in-out"
              ></div>
            </Avatar.Root>
          </button>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Content>Modifica avatar</Tooltip.Content>
    </Tooltip.Root>
  </div>

  <Dialog.Root bind:open={avatarDialogOpen}>
    <Dialog.Content class="flex flex-col items-center gap-4 sm:max-w-xl">
      <Dialog.Header class="w-full">
        <Dialog.Title>Modifica avatar</Dialog.Title>
        <Dialog.Description>
          {avatarOriginalSrc
            ? "Trascina per riposizionare. Scorri o pizzica per zoomare."
            : "Scegli una nuova immagine per modificare l'avatar attuale."}
        </Dialog.Description>
      </Dialog.Header>

      <div class="flex w-full">
        <Label
          for="picture"
          class={buttonVariants({ variant: "outline" })}
          tabindex={0}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") document.getElementById("picture")?.click();
          }}>Scegli immagine</Label
        >
        <Input class="hidden" id="picture" type="file" accept="image/*" onchange={onFileSelected} />
      </div>

      {#if avatarOriginalSrc}
        <!-- Crop container -->
        <div
          bind:clientWidth={containerSize}
          class="relative w-full select-none overflow-hidden rounded-lg bg-background"
          style="aspect-ratio: 1; touch-action: none; cursor: {isDragging ? 'grabbing' : 'grab'};"
          role="img"
          aria-label="Trascina per riposizionare l'immagine"
          onpointerdown={onPointerDown}
          onpointermove={onPointerMove}
          onpointerup={onPointerUp}
          onpointercancel={onPointerUp}
          onwheel={onWheel}
        >
          {#if containerSize > 0}
            <img
              bind:this={imgEl}
              src={avatarOriginalSrc}
              alt=""
              draggable="false"
              onload={restoreInitial}
              style="
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    width: {imageNaturalWidth * displayScale}px;
                    height: {imageNaturalHeight * displayScale}px;
                    max-width: none;
                    max-height: none;
                    transform: translate(calc(-50% + {offsetX}px), calc(-50% + {offsetY}px));
                    user-select: none;
                    pointer-events: none;
                  "
            />
            <div
              style="
                    position: absolute;
                    width: {circleDiameter}px;
                    height: {circleDiameter}px;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    border-radius: 50%;
                    box-shadow: 0 0 0 9999px rgba(0,0,0,0.55);
                    border: 2px solid rgba(255,255,255,0.6);
                    pointer-events: none;
                  "
            ></div>
          {/if}
        </div>

        <!-- Zoom slider -->
        {#if isImageLoaded}
          <div class="text-center min-w-80">
            <Slider
              type="single"
              value={displayScale}
              onValueChange={(v) => applyZoom(v)}
              step={0.01}
              aria-label="Zoom"
              min={minScale}
              max={maxScale}
            />
          </div>
          <div class="text-end">
            <Button variant="ghost" onclick={restoreInitial} disabled={!isImageLoaded}>Reset</Button
            >
          </div>
        {/if}
      {/if}

      <Dialog.Footer
        class="mt-4 flex w-full flex-row justify-between gap-3 sm:flex-row sm:justify-between"
      >
        {#if avatarPreview}
          <Button variant="destructive" onclick={() => deleteAvatarForm?.requestSubmit()}
            >Elimina</Button
          >
        {/if}
        <div class="flex gap-2">
          <Button variant="secondary" onclick={() => (avatarDialogOpen = false)}>Annulla</Button>
          <Button onclick={handleConfirm} disabled={!isImageLoaded}>Conferma</Button>
        </div>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>

  <form
    action="?/updateAvatar"
    method="POST"
    bind:this={updateAvatarForm}
    use:enhance={() =>
      ({ result }) => {
        if (result.type === "success" && pendingAvatarPreview) {
          avatarPreview = pendingAvatarPreview;
          avatarOriginalSrc = null;
          pendingAvatarPreview = null;
        }
      }}
    class="hidden"
  >
    <input type="hidden" name="avatarBase64" />
    <input type="hidden" name="avatarOriginal" />
    <input type="hidden" name="offsetX" />
    <input type="hidden" name="offsetY" />
    <input type="hidden" name="displayScale" />
  </form>

  <form
    action="?/deleteAvatar"
    method="POST"
    bind:this={deleteAvatarForm}
    use:enhance={() =>
      ({ result }) => {
        if (result.type === "success") {
          avatarPreview = null;
          avatarOriginalSrc = null;
          pendingAvatarPreview = null;
        }
      }}
    class="hidden"
  ></form>
</div>
