import hashids from "hashids";

const idAttachment = new hashids("key_attachment123", 8);

const idAdmin = new hashids("key_adminAcct123", 8);

const idClient = new hashids("key_clientAcct123", 8);

const idCategoryProduct = new hashids("key_categoryProduct123", 8);

const idProduct = new hashids("key_product123", 8);

const idMasterCompany = new hashids("key_masterCompany123", 8);

const idOffice = new hashids("key_office123", 8);

const idChair = new hashids("key_chair123", 8);

const idAdminAccess = new hashids("key_adminAccess123", 8);

const idAdminPermission = new hashids("key_adminPermission123", 8);

const idAuditLog = new hashids("key_auditLog123", 8);

export default {
  idAttachment,
  idAdmin,
  idClient,
  idCategoryProduct,
  idProduct,
  idMasterCompany,
  idOffice,
  idChair,
  idAdminAccess,
  idAdminPermission,
  idAuditLog,
};
