import { IAttachment } from './attachment.interface';

import { IApiResponse } from './api-response.interface';

import { IPermission } from './role.interface';

//==================================================
//==== LOGIN PAYLOAD
//==================================================

export interface IAuthUserStateModel {
  identity: string;

  password: string;
}

//==================================================
//==== SESSION
//==================================================

export interface IAuthSession {
  issued_at: number | null;

  expires_at: number | null;
}

//==================================================
//==== AUTH ADMIN USER
//==================================================

export interface IAuthAdminUser {
  id_admin_acct: string;

  name: string;

  alias: string;

  email_1: string;

  email_2: string | null;

  phone_1: string;

  phone_2: string | null;

  id_profile_photo: string | null;

  profile_photo: IAttachment | null;

  master_comp: {
    id_master_comp: string;

    comp_name: string;

    comp_alias: string;
  };

  office: {
    id_office: string;

    office_name: string;

    address?: string | null;
  };

  chair: {
    id_chair: string;

    chair_name: string;

    chair_description: string | null;
  };

  access: {
    id_access: string;

    access_name: string;

    permissions: string[];
  };

  is_all_access: 0 | 1;
}

//==================================================
//==== AUTH RESPONSE
//==================================================

export interface IAuthResponse {
  success: boolean;

  code: string;

  message: string;

  session: IAuthSession;

  data: IAuthAdminUser;
}

//==================================================
//==== LOGOUT RESPONSE
//==================================================

export type IAuthLogoutResponse = IApiResponse;

//==================================================
//==== LEGACY KARTIFY
//==================================================

export interface IAuthModel {
  email: string;

  token: string | number;

  access_token: string | null;

  permissions: IPermission[];
}

export interface IAuthUserForgotModel {
  email: string;
}

export interface IVerifyEmailOtpModel {
  email: string;

  token: number;
}

export interface IUpdatePasswordModel {
  password: string;

  password_confirmation: string;

  email: string;

  token: number;
}
