import { ISidebar } from '../interface/sidebar.interface';
import { hasPermissionAccess } from './permission.util';

//==================================================
//==== CHECK PERMISSION
//==================================================

export const hasSidebarPermission = (
  item: ISidebar,

  permissions: string[],

  isAllAccess: boolean,
): boolean => {
  return hasPermissionAccess(
    item.permission,

    permissions,

    isAllAccess,

    item.permissionMode ?? 'all',
  );
};

//==================================================
//==== FILTER SIDEBAR
//==================================================

export const filterSidebarByPermission = (
  menus: ISidebar[],
  permissions: string[],
  isAllAccess: boolean,
): ISidebar[] => {
  return menus
    .map((item) => {
      //==================================================
      //==== FILTER CHILDREN
      //==================================================

      const children = item.children?.length
        ? filterSidebarByPermission(item.children, permissions, isAllAccess)
        : undefined;

      //==================================================
      //==== PARENT WITH CHILDREN
      //==================================================

      if (item.children?.length) {
        if (!hasSidebarPermission(item, permissions, isAllAccess)) {
          return null;
        }

        if (!children?.length) {
          return null;
        }

        return {
          ...item,

          children,
        };
      }

      //==================================================
      //==== NORMAL ITEM
      //==================================================

      if (!hasSidebarPermission(item, permissions, isAllAccess)) {
        return null;
      }

      return {
        ...item,
      };
    })
    .filter((item): item is ISidebar => item !== null);
};
