// Permission ids of an access profile: validation with dependencies, key lookups, and audit diffs.
import keyhsid from '../../../hsid';

export type PermissionResolveResult =
  | {
      success: true;
      ids: number[];
    }
  | {
      success: false;
      status: number;
      code: string;
      message: string;
    };

// Resolve permissions

export const resolvePermissionIds = async (
  executor: any,
  value: unknown,
): Promise<PermissionResolveResult> => {
  // Array required

  if (!Array.isArray(value)) {
    return {
      success: false,
      status: 400,
      code: 'ADMIN_ACCESS_PERMISSIONS_ARRAY_INVALID',
      message: 'Permissions must be an array',
    };
  }

  // Empty is allowed

  if (value.length === 0) {
    return {
      success: true,
      ids: [],
    };
  }

  // Validate raw values

  const encodedPermissions: string[] = [];

  for (const item of value) {
    if (typeof item !== 'string' || !item.trim()) {
      return {
        success: false,
        status: 400,
        code: 'ADMIN_ACCESS_PERMISSION_ID_INVALID',
        message: 'Invalid permission identifier',
      };
    }

    encodedPermissions.push(item.trim());
  }

  // Unique

  const uniqueEncoded = [...new Set(encodedPermissions)];

  // Decode

  const permissionIds: number[] = [];

  for (const encoded of uniqueEncoded) {
    const decoded = keyhsid.idAdminPermission.decode(encoded)[0];

    const idPermission = Number(decoded);

    if (!decoded || !Number.isInteger(idPermission) || idPermission <= 0) {
      return {
        success: false,
        status: 400,
        code: 'ADMIN_ACCESS_PERMISSION_ID_INVALID',
        message: 'Invalid permission identifier',
      };
    }

    permissionIds.push(idPermission);
  }

  // Unique numeric IDS

  const uniqueIds = [...new Set(permissionIds)];

  // Validate active permissions

  const placeholders = uniqueIds.map(() => '?').join(', ');

  const [permissionRows] = await executor.query(
    `
    SELECT
      id_admin_permission,
      permission_key

    FROM admin_permission

    WHERE id_admin_permission IN (
      ${placeholders}
    )
      AND permission_status = 1
  `,
    uniqueIds,
  );

  const permissions = permissionRows as any[];

  if (permissions.length !== uniqueIds.length) {
    return {
      success: false,
      status: 400,
      code: 'ADMIN_ACCESS_PERMISSION_NOT_AVAILABLE',
      message: 'One or more permissions are not available',
    };
  }

  // Permission dependencies

  const permissionKeys = new Set(permissions.map((item) => String(item.permission_key)));

  const dependencies: Record<string, string[]> = {
    'attachment.create': ['attachment.view'],
    'attachment.delete': ['attachment.view'],
  };

  for (const [permissionKey, requiredKeys] of Object.entries(dependencies)) {
    if (!permissionKeys.has(permissionKey)) {
      continue;
    }

    for (const requiredKey of requiredKeys) {
      if (permissionKeys.has(requiredKey)) {
        continue;
      }

      return {
        success: false,
        status: 400,
        code: 'ADMIN_ACCESS_PERMISSION_DEPENDENCY_REQUIRED',
        message: `${requiredKey} is required when assigning ${permissionKey}`,
      };
    }
  }

  return {
    success: true,
    ids: uniqueIds,
  };
};

// Get permission keys by IDS

export const getPermissionKeysByIds = async (executor: any, ids: number[]): Promise<string[]> => {
  if (!ids.length) {
    return [];
  }

  const placeholders = ids.map(() => '?').join(', ');

  const [rows] = await executor.query(
    `
        SELECT
          permission_key

        FROM admin_permission

        WHERE id_admin_permission IN (
          ${placeholders}
        )

        ORDER BY
          permission_key ASC
      `,
    ids,
  );

  return (rows as any[]).map((item) => String(item.permission_key));
};

// Get access permission keys

export const getAccessPermissionKeys = async (
  executor: any,
  idAccess: number,
): Promise<string[]> => {
  const [rows] = await executor.query(
    `
        SELECT
          ap.permission_key

        FROM admin_access_permission aap

        INNER JOIN admin_permission ap
          ON aap.id_admin_permission =
            ap.id_admin_permission

        WHERE aap.id_admin_access = ?

        ORDER BY
          ap.permission_key ASC
      `,
    [idAccess],
  );

  return (rows as any[]).map((item) => String(item.permission_key));
};

// Permission diff

export const getPermissionDiff = (before: string[], after: string[]) => {
  const beforeSet = new Set(before);

  const afterSet = new Set(after);

  const added = after.filter((permission) => !beforeSet.has(permission));

  const removed = before.filter((permission) => !afterSet.has(permission));

  return {
    added,
    removed,
    changed: added.length > 0 || removed.length > 0,
  };
};
