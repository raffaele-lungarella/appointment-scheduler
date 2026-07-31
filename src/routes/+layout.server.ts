import { BannerService } from "@service/banner.service";

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
  const banner = (await BannerService.get().get()) ?? null;

  const title = "Home -";

  return { user: locals.user, title, banner };
};
