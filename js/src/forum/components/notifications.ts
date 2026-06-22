import Notification from 'flarum/forum/components/Notification';
import { override } from 'flarum/common/extend';
import NotificationList from 'flarum/forum/components/NotificationList';
import HeaderListGroup from 'flarum/forum/components/HeaderListGroup';
import NotificationType from 'flarum/forum/components/NotificationType';
import Discussion from 'flarum/common/models/Discussion';
import Link from 'flarum/common/components/Link';
import listItems from 'flarum/common/helpers/listItems';
import { tr } from '../utils/translate';
import { basePath, BASE_PATH } from '../utils/helpers';

const WIKI_NOTIFICATION_TYPES = ['linkrobinsWikiNewReply', 'linkrobinsWikiNewTicket'];

/**
 * Core's NotificationList groups notifications by discussion, and lumps anything
 * not tied to a discussion (like our wiki tickets) into one neutral group
 * labelled with the forum title (e.g. "Flarum"). There's no per-type hook, so we
 * reimplement `content` to route wiki notifications into their own group with
 * a translatable "Wiki" heading, while leaving all other grouping untouched.
 */
export function installWikiNotificationGrouping() {
  override(NotificationList.prototype, 'content', function (this: any, _orig: any, state: any) {
    if (state.isLoading() || !state.hasItems()) return null;

    return state.getPages().map((page: any) => {
      const groups: any[] = [];
      const byKey: Record<string, any> = {};

      page.items.forEach((notification: any) => {
        const subject = notification.subject();
        if (typeof subject === 'undefined') return;

        const contentType = notification.contentType && notification.contentType();
        const isWiki = WIKI_NOTIFICATION_TYPES.indexOf(contentType) !== -1;

        // Mirror core's discussion resolution for non-wiki notifications.
        let discussion = null;
        if (!isWiki) {
          if (subject instanceof Discussion) discussion = subject;
          else if (subject && subject.discussion) discussion = subject.discussion();
        }

        const key = isWiki ? 'linkrobins-wiki' : discussion ? 'd' + discussion.id() : 'neutral';

        byKey[key] = byKey[key] || { discussion, wiki: isWiki, notifications: [] };
        byKey[key].notifications.push(notification);
        if (groups.indexOf(byKey[key]) === -1) groups.push(byKey[key]);
      });

      return groups.map((group) => {
        let label;
        if (group.wiki) {
          label = tr('nav', 'Wiki');
        } else if (group.discussion) {
          const badges = group.discussion.badges().toArray();
          label = m(
            Link,
            { href: app.route.discussion(group.discussion) },
            [
              badges && badges.length ? m('ul', { className: 'HeaderListGroup-badges badges' }, listItems(badges)) : null,
              m('span', null, group.discussion.title()),
            ]
          );
        } else {
          label = app.forum.attribute('title');
        }

        return m(
          HeaderListGroup,
          { label },
          group.notifications.map((notification: any) => m(NotificationType, { notification }))
        );
      });
    });
  });
}

export class NewWikiReplyNotification extends Notification {
  // No Font Awesome glyph for wiki notifications -- just the sender avatar.
  icon() {
    return '';
  }
  href() {
    const subj = this.attrs && this.attrs.notification ? this.attrs.notification.subject() : null;
    const bp = basePath();
    if (subj && subj.id) {
      return bp + BASE_PATH + '/' + subj.id();
    }
    return bp + BASE_PATH;
  }
  content() {
    const n = this.attrs && this.attrs.notification;
    const from = n && n.fromUser && n.fromUser();
    if (from && from.displayName) {
      return tr('notifications.reply_from', '{name} replied to your ticket', { name: from.displayName() });
    }
    return tr('notifications.reply_generic', 'Wiki replied to your ticket');
  }
  excerpt() {
    const subj = this.attrs && this.attrs.notification ? this.attrs.notification.subject() : null;
    if (subj && subj.attribute) {
      const s = subj.attribute('subject');
      if (s) return s;
    }
    return '';
  }
}

export class NewWikiTicketNotification extends Notification {
  // No Font Awesome glyph for wiki notifications -- just the sender avatar.
  icon() {
    return '';
  }
  href() {
    const subj = this.attrs && this.attrs.notification ? this.attrs.notification.subject() : null;
    const bp = basePath();
    if (subj && subj.id) {
      return bp + BASE_PATH + '/' + subj.id();
    }
    return bp + BASE_PATH;
  }
  content() {
    const n = this.attrs && this.attrs.notification;
    const data = n && n.content && n.content();
    const isAppeal = !!(data && data.isAppeal);
    const from = n && n.fromUser && n.fromUser();
    const who = from && from.displayName ? from.displayName() : tr('notifications.someone', 'A user');
    return isAppeal
      ? tr('notifications.new_appeal', '{name} opened a new appeal', { name: who })
      : tr('notifications.new_ticket', '{name} opened a new wiki ticket', { name: who });
  }
  excerpt() {
    const subj = this.attrs && this.attrs.notification ? this.attrs.notification.subject() : null;
    if (subj && subj.attribute) {
      const s = subj.attribute('subject');
      if (s) return s;
    }
    return '';
  }
}
