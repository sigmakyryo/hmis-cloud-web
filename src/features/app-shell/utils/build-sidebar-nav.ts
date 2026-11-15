import type { AppIconName } from "@/components/icons/app-icon";
import {
  canAccessReports,
  filterNavigation,
  getModuleIcon,
  getModuleLabel,
  groupNavigationByModule,
  isMostSpecificNavItemActive,
  isNavItemActive,
  isOhFamilyModule,
  isReportsNavActive,
  OH_FAMILY_MODULES,
  OH_NAV_TITLE,
  sortModules,
  type NavigationItem,
} from "@/features/app-shell/constants/navigation-config";
import { ROUTES } from "@/constants/routes";
import {
  ohFamilyModuleAllowed,
  ohNavHrefAllowed,
  type OhWorkspaceArea,
} from "@/features/occupational-health/lib/oh-workspace-layout";

export type SidebarNavSection = "workspace" | "admin";

export type SidebarNavItem = {
  title: string;
  url: string;
  icon?: AppIconName;
  isActive?: boolean;
  section?: SidebarNavSection;
  showUnreadDot?: boolean;
  /** Render as a single link; `items` still feed the command palette. */
  flat?: boolean;
  items?: Array<{
    title: string;
    url: string;
    isActive?: boolean;
  }>;
};

function mostSpecificNavMatch(pathname: string, items: NavigationItem[]) {
  return items
    .filter((item) => isNavItemActive(pathname, item.href))
    .reduce<NavigationItem | undefined>(
      (best, item) => (!best || item.href.length > best.href.length ? item : best),
      undefined,
    );
}

/** One flat entry that opens the OH home page, standing in for every OH-family module. */
function buildOhNavItem(
  modules: Record<string, NavigationItem[]>,
  allItems: NavigationItem[],
  pathname: string,
  included?: readonly OhWorkspaceArea[],
): SidebarNavItem | null {
  const entries = OH_FAMILY_MODULES.flatMap((moduleName) =>
    (modules[moduleName] ?? []).map((item) => ({ moduleName, item })),
  ).filter(
    ({ moduleName, item }) =>
      ohFamilyModuleAllowed(moduleName, included) && ohNavHrefAllowed(item.href, included),
  );
  if (entries.length === 0) {
    return null;
  }

  const hrefs = entries.map(({ item }) => item.href);
  const match = mostSpecificNavMatch(pathname, allItems);
  const isActive =
    isNavItemActive(pathname, ROUTES.occupationalHealthHome) ||
    (match !== undefined && hrefs.includes(match.href));

  return {
    title: OH_NAV_TITLE,
    url: ROUTES.occupationalHealthHome,
    icon: getModuleIcon("OccupationalHealth"),
    section: "workspace",
    flat: true,
    isActive,
    items: entries.map(({ moduleName, item }) => ({
      title:
        moduleName === "OccupationalHealth"
          ? item.name
          : `${getModuleLabel(moduleName)} · ${item.name}`,
      url: item.href,
      isActive: isMostSpecificNavItemActive(pathname, item.href, hrefs),
    })),
  };
}

export function buildSidebarNavItems(
  userGroups: string[],
  pathname: string,
  isTenantAdmin = false,
  isPlatformAdmin = false,
  enabledModules: string[] = [],
  includedAreas?: readonly OhWorkspaceArea[],
): SidebarNavItem[] {
  const filtered = isPlatformAdmin
    ? []
    : filterNavigation(userGroups, { isTenantAdmin, enabledModules });
  const modules = groupNavigationByModule(filtered);
  const items: SidebarNavItem[] = [];

  if (!isPlatformAdmin) {
    items.push({
      title: "Overview",
      url: ROUTES.overview,
      icon: "home",
      section: "workspace",
      isActive: pathname === ROUTES.overview,
    });
  }

  let ohNavAdded = false;
  for (const moduleName of sortModules(Object.keys(modules))) {
    if (isOhFamilyModule(moduleName)) {
      if (!ohNavAdded) {
        ohNavAdded = true;
        const ohItem = buildOhNavItem(modules, filtered, pathname, includedAreas);
        if (ohItem) {
          items.push(ohItem);
        }
      }
      continue;
    }

    const moduleItems = modules[moduleName] ?? [];
    if (moduleItems.length === 0) {
      continue;
    }

    const siblingHrefs = moduleItems.map((navItem) => navItem.href);
    const activeModuleItem = moduleItems.find((navItem) =>
      isMostSpecificNavItemActive(pathname, navItem.href, siblingHrefs),
    );

    items.push({
      title: getModuleLabel(moduleName),
      url: activeModuleItem?.href ?? moduleItems[0].href,
      icon: getModuleIcon(moduleName),
      section: "workspace",
      isActive: moduleItems.some((navItem) =>
        isNavItemActive(pathname, navItem.href),
      ),
      items: moduleItems.map((navItem) => ({
        title: navItem.name,
        url: navItem.href,
        isActive: isMostSpecificNavItemActive(
          pathname,
          navItem.href,
          siblingHrefs,
        ),
      })),
    });
  }

  for (const navItem of modules.General ?? []) {
    items.push({
      title: navItem.name,
      url: navItem.href,
      icon: navItem.icon,
      section: "workspace",
      isActive: isNavItemActive(pathname, navItem.href),
    });
  }

  if (isPlatformAdmin) {
    items.push({
      title: "Tenant operations",
      url: ROUTES.platformAdmin,
      icon: "shield",
      section: "admin",
      isActive:
        pathname === ROUTES.platformAdmin ||
        pathname.startsWith(`${ROUTES.platformAdminTenants}`),
      items: [
        {
          title: "Overview",
          url: ROUTES.platformAdmin,
          isActive: pathname === ROUTES.platformAdmin,
        },
        {
          title: "Tenants",
          url: ROUTES.platformAdminTenants,
          isActive:
            isNavItemActive(pathname, ROUTES.platformAdminTenants) ||
            pathname.startsWith(`${ROUTES.platformAdminTenants}/`),
        },
      ],
    });

    items.push({
      title: "Finance",
      url: ROUTES.platformAdminFinance,
      icon: "wallet",
      section: "admin",
      isActive: pathname.startsWith(ROUTES.platformAdminFinance),
      items: [
        {
          title: "Revenue & costs",
          url: ROUTES.platformAdminFinance,
          isActive:
            pathname === ROUTES.platformAdminFinance ||
            pathname.startsWith(`${ROUTES.platformAdminFinance}/`),
        },
      ],
    });

    items.push({
      title: "Platform",
      url: ROUTES.platformAdminBackups,
      icon: "hardDrive",
      section: "admin",
      isActive:
        pathname.startsWith(`${ROUTES.platformAdmin}/backups`) ||
        pathname.startsWith(ROUTES.platformAdminPayerRegistry),
      items: [
        {
          title: "Backups",
          url: ROUTES.platformAdminBackups,
          isActive:
            pathname === ROUTES.platformAdminBackups ||
            pathname.startsWith(`${ROUTES.platformAdminBackups}/`),
        },
        {
          title: "Payer registry",
          url: ROUTES.platformAdminPayerRegistry,
          isActive:
            isNavItemActive(pathname, ROUTES.platformAdminPayerRegistry) ||
            pathname.startsWith(`${ROUTES.platformAdminPayerRegistry}/`),
        },
      ],
    });

    items.push({
      title: "Content",
      url: ROUTES.platformAdminBlog,
      icon: "file",
      section: "admin",
      isActive: pathname.startsWith(ROUTES.platformAdminBlog),
      items: [
        {
          title: "Blog",
          url: ROUTES.platformAdminBlog,
          isActive:
            pathname === ROUTES.platformAdminBlog ||
            pathname.startsWith(`${ROUTES.platformAdminBlog}/`),
        },
      ],
    });

    items.push({
      title: "Resources",
      url: ROUTES.platformAdminResourcesSales,
      icon: "book",
      section: "admin",
      isActive: pathname.startsWith(`${ROUTES.platformAdmin}/resources`),
      items: [
        {
          title: "Sales",
          url: ROUTES.platformAdminResourcesSales,
          isActive:
            isNavItemActive(pathname, ROUTES.platformAdminResourcesSales) ||
            pathname.startsWith(`${ROUTES.platformAdminResourcesSales}/`),
        },
      ],
    });
  }

  if (!isPlatformAdmin && canAccessReports(userGroups)) {
    items.push({
      title: "Reports",
      url: ROUTES.reportsExports,
      icon: "analytics",
      section: "admin",
      isActive: isReportsNavActive(pathname),
      items: [
        {
          title: "Today's appointments",
          url: ROUTES.reportsAppointmentsToday,
          isActive: isNavItemActive(pathname, ROUTES.reportsAppointmentsToday),
        },
        {
          title: "Reports",
          url: ROUTES.reportsExports,
          isActive: pathname === ROUTES.reportsExports,
        },
        {
          title: "Export history",
          url: ROUTES.reportsExportHistory,
          isActive: isNavItemActive(pathname, ROUTES.reportsExportHistory),
        },
      ],
    });
  }

  return items;
}
