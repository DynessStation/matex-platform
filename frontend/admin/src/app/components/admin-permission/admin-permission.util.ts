import {
  IAdminPermission,
  IAdminPermissionGroup,
} from '../../shared/interface/admin-permission.interface';

// Pure rules of the Hak Akses page.

export interface VisibleGroup extends IAdminPermissionGroup {
  /** The permissions that match the search. */
  shown: IAdminPermission[];
}

const contains = (value: string | null, term: string) =>
  String(value ?? '')
    .toLowerCase()
    .includes(term);

/** The groups the two searches leave, each with the permissions that match. */
export function visibleGroups(
  groups: IAdminPermissionGroup[],
  searchGroup: string,
  searchPermission: string,
): VisibleGroup[] {
  const groupTerm = searchGroup.trim().toLowerCase();
  const term = searchPermission.trim().toLowerCase();
  return groups
    .filter((group) => contains(group.name, groupTerm))
    .map((group) => ({
      ...group,
      shown: group.permissions.filter(
        (item) =>
          contains(item.permission_key, term) ||
          contains(item.permission_name, term) ||
          contains(item.permission_description, term),
      ),
    }))
    .filter((group) => !term || group.shown.length > 0);
}

/** The part of a key before its last dot: "admin_access" of "admin_access.view". */
export function keyPrefix(key: string): string {
  return key.slice(0, key.lastIndexOf('.'));
}

/** The part after its last dot: "view" of "admin_access.view". */
export function keyAction(key: string): string {
  return key.slice(key.lastIndexOf('.') + 1);
}

/** Starts a group's keys can have: what it already uses, or its name written as a key. */
export function groupPrefixes(group: IAdminPermissionGroup | null): string[] {
  if (!group) return [];
  const used = [
    ...new Set(group.permissions.map((item) => keyPrefix(item.permission_key))),
  ];
  if (used.length) return used;
  const fromName = group.name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return fromName ? [fromName] : [];
}

/** Inactive and on no profile: the server allows deleting only these. */
export function isDeletable(item: IAdminPermission): boolean {
  return item.permission_status === 0 && item.access_count === 0;
}
