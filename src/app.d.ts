// See https://svelte.dev/docs/kit/types#app.d.ts

import type { SessionDTO, UserDTO } from "$lib/dto";

declare global {
  namespace App {
    interface Locals {
      user: UserDTO | null;
      session: SessionDTO | null;
    }
  }
}

export {};
