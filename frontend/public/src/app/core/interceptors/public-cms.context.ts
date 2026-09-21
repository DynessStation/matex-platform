import { HttpContextToken } from '@angular/common/http';

export const PUBLIC_CMS_REQUEST = new HttpContextToken<boolean>(() => false);
