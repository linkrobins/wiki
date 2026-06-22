import { extend } from 'flarum/common/extend';
import IndexSidebar from 'flarum/forum/components/IndexSidebar';
import UserControls from 'flarum/forum/utils/UserControls';
import LinkButton from 'flarum/common/components/LinkButton';
import Button from 'flarum/common/components/Button';

import WikiCategory from './common/models/WikiCategory';
import WikiTicket from './common/models/WikiTicket';
import WikiReply from './common/models/WikiReply';

import WikiIndexPage from './forum/components/WikiIndexPage';
import WikiComposePage from './forum/components/WikiComposePage';
import WikiShowPage from './forum/components/WikiShowPage';
import { NewWikiReplyNotification, NewWikiTicketNotification, installWikiNotificationGrouping } from './forum/components/notifications';

import { tr } from './forum/utils/translate';
import { basePath, BASE_PATH, readForumAttribute, showError } from './forum/utils/helpers';

app.initializers.add('linkrobins-wiki', () => {
  // Register the store models so app.store.find()/createRecord() return typed,
  // cached, relationship-aware records for our resources.
  app.store.models['linkrobins-wiki-categories'] = WikiCategory;
  app.store.models['linkrobins-wiki-tickets'] = WikiTicket;
  app.store.models['linkrobins-wiki-replies'] = WikiReply;

  app.routes['linkrobins-wiki.index'] = { path: BASE_PATH, component: WikiIndexPage };
  app.routes['linkrobins-wiki.compose'] = { path: BASE_PATH + '/new', component: WikiComposePage };
  app.routes['linkrobins-wiki.filtered'] = { path: BASE_PATH + '/status/:status', component: WikiIndexPage };
  app.routes['linkrobins-wiki.show'] = { path: BASE_PATH + '/:id', component: WikiShowPage };

  if (app.notificationComponents) {
    app.notificationComponents['linkrobinsWikiNewReply'] = NewWikiReplyNotification;
    app.notificationComponents['linkrobinsWikiNewTicket'] = NewWikiTicketNotification;
  }

  // Group wiki notifications under a translatable "Wiki" heading in the
  // notifications dropdown, instead of the generic forum-title group.
  installWikiNotificationGrouping();

  // NotificationGrid lives in a lazily-loaded chunk, so it isn't in the
  // registry at init time -- a direct import resolves to undefined. Use the
  // string-path form of extend(), which defers resolution until the module
  // actually loads.
  extend('flarum/forum/components/NotificationGrid' as any, 'notificationTypes', (items: any) => {
    items.add('linkrobinsWikiNewReply', {
      name: 'linkrobinsWikiNewReply',
      icon: 'fas fa-life-ring',
      label: tr('settings.notify_new_reply_label', 'Someone replies to your wiki ticket'),
    });
    items.add('linkrobinsWikiNewTicket', {
      name: 'linkrobinsWikiNewTicket',
      icon: 'fas fa-ticket-alt',
      label: tr('settings.notify_new_ticket_label', 'A new wiki ticket is opened'),
    });
  });

  // Appeal-ban toggle in the user's moderation-controls dropdown (the same menu
  // as Suspend). Shown only to users with the manage_appeal_bans permission.
  // UserControls is a plain object (not a component class), so we extend the
  // object itself -- extending `.prototype` would silently no-op.
  extend(UserControls, 'moderationControls', (items: any, user: any) => {
    if (!readForumAttribute('canManageWikiAppealBans')) return;
    if (!user || typeof user.attribute !== 'function') return;
    const banned = !!user.attribute('wikiAppealBanned');
    items.add(
      'linkrobinsWikiAppealBan',
      m(
        Button,
        {
          icon: banned ? 'fas fa-unlock' : 'fas fa-ban',
          onclick: () => {
            user
              .save({ wikiAppealBanned: !banned })
              .then(() => {
                m.redraw();
              })
              .catch(() => {
                showError(tr('user_controls.toggle_failed', 'Could not update the appeal-ban status.'));
              });
          },
        },
        banned
          ? tr('user_controls.allow_appeals', 'Allow wiki appeals')
          : tr('user_controls.disallow_appeals', 'Disallow wiki appeals')
      )
    );
  });

  // Global "Wiki" link in the index sidebar nav (shown on every page).
  extend(IndexSidebar.prototype, 'navItems', (items: any) => {
    if (!app.session || !app.session.user) return;
    items.add(
      'linkrobins-wiki',
      m(LinkButton, { href: basePath() + BASE_PATH, icon: 'fas fa-life-ring' }, tr('nav', 'Wiki')),
      30
    );
  });
});
