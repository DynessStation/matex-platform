import db = require('./db');
const { pool } = db;

const checkAdminAcct = async (
    idAdminAcct: any,
    idMasterComp: any,
    idOffice: any
) => {
    const q = `
        SELECT
            aa.id_admin_acct,
            aa.id_master_comp,
            aa.id_office,
            aa.id_chair,
            aa.id_access,
            aa.is_all_access,
            aa.name,
            aa.email_1
        FROM admin_acct aa
        WHERE aa.id_admin_acct = ?
        AND aa.id_master_comp = ?
        AND aa.id_office = ?
        AND aa.admin_acct_status = 1
        LIMIT 1
    `;

    const [rows] = await pool.query(q, [
        idAdminAcct,
        idMasterComp,
        idOffice
    ]);

    return (rows as any[])[0] || null;
};

const getAdminPermissions = async (
  idAdminAccess: number,
): Promise<string[]> => {
  const query = `
    SELECT
      ap.permission_key

    FROM admin_access_permission aap

    INNER JOIN admin_permission ap
      ON aap.id_admin_permission = ap.id_admin_permission

    WHERE aap.id_admin_access = ?
      AND ap.permission_status = 1

    ORDER BY ap.id_admin_permission ASC
  `;

  const [rows] = await pool.query(
    query,
    [idAdminAccess],
  );

  return (rows as any[]).map(
    item => item.permission_key,
  );
};

export default { checkAdminAcct, getAdminPermissions };