import { ISidebar } from '../interface/sidebar.interface';

//==================================================
//==== SIDEBAR MENU
//==================================================

export const menu: ISidebar[] = [
  //==================================================
  //==== DASHBOARD
  //==================================================

  {
    id: 1,

    title: 'dashboard',

    path: '/dashboard',

    active: false,

    icon: 'ri-home-line',

    type: 'sub',

    level: 1,
  },

  //==================================================
  //==== ADMINISTRATION
  //==================================================

  {
    id: 2,

    title: 'administration',

    active: false,

    icon: 'ri-admin-line',

    type: 'sub',

    level: 1,

    children: [
      {
        parent_id: 2,

        title: 'admin_accounts',

        path: '/admin-account',

        type: 'link',

        level: 2,

        permission: 'admin_account.view',
      },

      {
        parent_id: 2,

        title: 'access_profiles',

        path: '/admin-access',

        type: 'link',

        level: 2,

        permission: 'admin_access.view',
      },

      {
        parent_id: 2,

        title: 'admin_permissions',

        path: '/admin-permission',

        type: 'link',

        level: 2,

        permission: 'admin_permission.view',
      },

      //==================================================
      //==== ACTIVITY LOG
      //==================================================

      {
        parent_id: 2,

        title: 'activity_log',

        path: '/activity-log',

        type: 'link',

        level: 2,

        permission: 'audit_log.view',
      },

      {
        parent_id: 2,

        title: 'positions',

        path: '/chair',

        type: 'link',

        level: 2,

        permission: 'chair.view',
      },

      {
        parent_id: 2,

        title: 'offices',

        path: '/office',

        type: 'link',

        level: 2,

        permission: 'office.view',
      },
    ],
  },

  //==================================================
  //==== CONTENT
  //==================================================

  {
    id: 4,

    title: 'content',

    active: false,

    icon: 'ri-file-text-line',

    type: 'sub',

    level: 1,

    children: [
      {
        parent_id: 4,

        title: 'pages',

        path: '/cms-page',

        type: 'link',

        level: 2,

        permission: 'cms_page.view',
      },
    ],
  },

  //==================================================
  //==== MEDIA
  //==================================================

  {
    id: 3,

    title: 'media',

    path: '/media',

    active: false,

    icon: 'ri-image-line',

    type: 'sub',

    level: 1,

    permission: 'attachment.view',
  },
];
