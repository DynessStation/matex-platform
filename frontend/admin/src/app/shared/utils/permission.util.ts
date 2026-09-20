//==================================================
//==== TYPES
//==================================================

export type PermissionMode = 'any' | 'all';

export type RequiredPermission = string | string[] | undefined;

//==================================================
//==== HAS PERMISSION ACCESS
//==================================================

export const hasPermissionAccess = (
  requiredPermission: RequiredPermission,

  permissions: string[],

  isAllAccess: boolean,

  mode: PermissionMode = 'all',
): boolean => {
  //==================================================
  //==== FULL ACCESS
  //==================================================

  if (isAllAccess) {
    return true;
  }

  //==================================================
  //==== NO PERMISSION REQUIRED
  //==================================================

  if (!requiredPermission) {
    return true;
  }

  //==================================================
  //==== NORMALIZE
  //==================================================

  const required = Array.isArray(requiredPermission)
    ? requiredPermission
    : [requiredPermission];

  if (!required.length) {
    return true;
  }

  //==================================================
  //==== CHECK
  //==================================================

  if (mode === 'any') {
    return required.some((permission) => permissions.includes(permission));
  }

  return required.every((permission) => permissions.includes(permission));
};
