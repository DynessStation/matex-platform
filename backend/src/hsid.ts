import Hashids from 'hashids';

// hashids 2 throws when an id contains characters outside its alphabet (for example a
// tampered URL). Every caller treats an empty result as an invalid id and answers 400/404,
// so return [] instead of letting the request fail with a 500.
class SafeHashids extends Hashids {
  override decode(id: string): ReturnType<Hashids['decode']> {
    try {
      return super.decode(id);
    } catch {
      return [];
    }
  }
}

const idAttachment = new SafeHashids('key_attachment123', 8);

const idAdmin = new SafeHashids('key_adminAcct123', 8);

const idClient = new SafeHashids('key_clientAcct123', 8);

const idCategoryProduct = new SafeHashids('key_categoryProduct123', 8);

const idProduct = new SafeHashids('key_product123', 8);

const idMasterCompany = new SafeHashids('key_masterCompany123', 8);

const idOffice = new SafeHashids('key_office123', 8);

const idChair = new SafeHashids('key_chair123', 8);

const idAdminAccess = new SafeHashids('key_adminAccess123', 8);

const idAdminPermission = new SafeHashids('key_adminPermission123', 8);

const idAuditLog = new SafeHashids('key_auditLog123', 8);

const idWebNavigation = new SafeHashids('key_webNavigation123', 8);

const idWebNavigationItem = new SafeHashids('key_webNavigationItem123', 8);

const idFaq = new SafeHashids('key_faq123', 8);

const idPublicContactChannel = new SafeHashids('key_publicContactChannel123', 8);

const idContactInquiryTopic = new SafeHashids('key_contactInquiryTopic123', 8);

const idArticle = new SafeHashids('key_article123', 8);

const idProductCategory = new SafeHashids('key_productCategory123', 8);

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
  idWebNavigation,
  idWebNavigationItem,
  idFaq,
  idPublicContactChannel,
  idContactInquiryTopic,
  idArticle,
  idProductCategory,
};
