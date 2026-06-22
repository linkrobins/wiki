import WikiCategory from './common/models/WikiCategory';
import WikiAdminPage from './admin/components/WikiAdminPage';
import { tx } from './admin/utils';

app.initializers.add('linkrobins-wiki', () => {
  app.store.models['linkrobins-wiki-categories'] = WikiCategory;

  if (!app.registry || typeof app.registry.for !== 'function') {
    console.warn('[linkrobins/wiki] app.registry not available');
    return;
  }
  app.registry.for('linkrobins-wiki').registerPage(WikiAdminPage);

  try {
    if (typeof app.registry.registerPermission === 'function') {
      app.registry.registerPermission(
        {
          permission: 'linkrobins-wiki.handle_tickets',
          icon: 'fas fa-life-ring',
          label: tx('linkrobins-wiki.admin.permissions.handle_tickets'),
        },
        'moderate',
        95
      );
      app.registry.registerPermission(
        {
          permission: 'linkrobins-wiki.manage_appeal_bans',
          icon: 'fas fa-ban',
          label: tx('linkrobins-wiki.admin.permissions.manage_appeal_bans'),
        },
        'moderate',
        94
      );
      app.registry.registerPermission(
        {
          permission: 'linkrobins-wiki.force_delete_tickets',
          icon: 'fas fa-trash',
          label: tx('linkrobins-wiki.admin.permissions.force_delete_tickets'),
        },
        'moderate',
        93
      );
    }
  } catch (e) {
    console.warn('[linkrobins/wiki] could not register permission:', e);
  }
});
