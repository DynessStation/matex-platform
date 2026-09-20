import { HttpContextToken } from "@angular/common/http";

//==================================================
//==== SKIP GLOBAL LOADER
//==================================================

export const SKIP_GLOBAL_LOADER = new HttpContextToken<boolean>(() => false);
