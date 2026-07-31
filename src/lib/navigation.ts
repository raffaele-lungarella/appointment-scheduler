import {
  Calendar,
  CirclePlus,
  CircleUser,
  Euro,
  Library,
  LogOut,
  Settings,
} from "$lib/components/icons/index";
import type { UserDTO } from "$lib/dto";
import type { Component } from "@lucide/svelte";

export const ROUTES = {
  home: "/",
  prices: "/prices",
  book: "/book",
  dashboard: "/dashboard",
  profile: "/profile",
  myReservations: "/profile/myreservations",
  login: "/login",
  signup: "/signup",
  logout: "/profile?/logout",
  showcase: "/showcase",
  settings: "/dashboard/general",
} as const;

type Route = (typeof ROUTES)[keyof typeof ROUTES];
type NavigationVisibility = "public" | "logged-out" | "logged-in" | "admin" | "dev";
type NavigationAction = "link" | "logout";

export type NavigationItem = {
  title: string;
  url: Route;
  icon: typeof Component;
  visibility: NavigationVisibility;
  action?: NavigationAction;
};

const navigation = [
  { title: "Prenota", url: ROUTES.book, icon: Calendar, visibility: "public" },
  { title: "Catalogo", url: ROUTES.prices, icon: Euro, visibility: "public" },
  {
    title: "Accedi",
    url: ROUTES.login,
    icon: CircleUser,
    visibility: "logged-out",
  },
  {
    title: "Registrati",
    url: ROUTES.signup,
    icon: CirclePlus,
    visibility: "logged-out",
  },
  {
    title: "Profilo",
    url: ROUTES.profile,
    icon: CircleUser,
    visibility: "logged-in",
  },
  {
    title: "Prenotazioni",
    url: ROUTES.myReservations,
    icon: Library,
    visibility: "logged-in",
  },
  {
    title: "Agenda",
    url: ROUTES.dashboard,
    icon: Calendar,
    visibility: "admin",
  },
  {
    title: "Impostazioni",
    url: ROUTES.settings,
    icon: Settings,
    visibility: "admin",
  },
  {
    title: "Logout",
    url: ROUTES.logout,
    icon: LogOut,
    visibility: "logged-in",
    action: "logout",
  },
] as const satisfies readonly NavigationItem[];

export function getNavigationItems(user: UserDTO | null): NavigationItem[] {
  return navigation.filter((item) => {
    switch (item.visibility) {
      case "public":
        return true;
      case "logged-out":
        return user === null;
      case "logged-in":
        return user !== null;
      case "admin":
        return user?.role === "staff";
    }
  });
}

export const reservationDetailRoute = (id: string) => `/reservations/${id}`;

export const isNavigationItemActive = (pathname: string, url: string) => pathname === url;
