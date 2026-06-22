import IndexSidebar from 'flarum/forum/components/IndexSidebar';
import LinkButton from 'flarum/common/components/LinkButton';
import Button from 'flarum/common/components/Button';
import SelectDropdown from 'flarum/common/components/SelectDropdown';
import Separator from 'flarum/common/components/Separator';
import ItemList from 'flarum/common/utils/ItemList';
import { tr } from '../utils/translate';
import { basePath, BASE_PATH, safeNavigate } from '../utils/helpers';
import { canCreateWikiTicket, canHandleWikiTickets } from '../utils/permissions';
import { FILTER_OPTIONS, filterLabel, filterHrefFor } from '../utils/status';

export default class WikiIndexSidebar extends IndexSidebar {
  items() {
    const items = new ItemList();

    // "New ticket" primary button -- mirrors the blog's "Compose" button.
    if (canCreateWikiTicket()) {
      const newHref = basePath() + BASE_PATH + '/new';
      items.add(
        'newTicket',
        m(
          Button,
          {
            icon: 'fas fa-plus',
            className: 'Button Button--primary LinkRobinsWiki-newTicketButton',
            itemClassName: 'App-primaryControl',
            'aria-label': tr('index.new_ticket', 'New ticket'),
            title: tr('index.new_ticket_tooltip', 'Open a new wiki ticket'),
            onclick: (e: any) => {
              safeNavigate(newHref, e);
            },
          },
          tr('index.new_ticket', 'New ticket')
        ),
        110
      );
    }

    items.add(
      'nav',
      m(
        SelectDropdown,
        {
          buttonClassName: 'Button',
          className: 'App-titleControl',
          defaultLabel: tr('nav', 'Wiki'),
        },
        this.navItems().toArray()
      ),
      90
    );

    return items;
  }

  navItems() {
    let items;
    try {
      items = super.navItems();
    } catch (e) {
      console.warn('[linkrobins/wiki] super.navItems() threw, falling back:', e);
      items = new ItemList();
    }
    if (!items) return new ItemList();

    // The Tags extension injects a tag list (the "Tags" link, a separator, one
    // item per tag, and a "More" link) into IndexSidebar.navItems via extend().
    // Because we subclass IndexSidebar, super.navItems() inherits all of those.
    // Strip the per-tag clutter (the individual tags, the "More" link and the
    // separator that precedes them) but KEEP the top-level "Tags" link so users
    // still have a way back to the tags page from the wiki sidebar.
    try {
      const all = (items as any)._items || {};
      Object.keys(all).forEach((key) => {
        if (key === 'moreTags' || key === 'separator' || /^tag\d+$/.test(key)) {
          if (typeof items.remove === 'function') items.remove(key);
        }
      });
    } catch (e) {}

    const canHandle = canHandleWikiTickets();
    const currentFilter =
      this.attrs && Object.prototype.hasOwnProperty.call(this.attrs, 'activeFilter')
        ? this.attrs.activeFilter
        : 'mine'; // may be null (= nothing active)

    items.add('linkrobinsWikiSeparator', m(Separator), -11);

    FILTER_OPTIONS.forEach((opt, i) => {
      if (opt.staffOnly && !canHandle) return;
      items.add(
        'wiki-filter-' + opt.id,
        m(
          LinkButton,
          {
            href: filterHrefFor(opt.id),
            icon: opt.icon,
            active: currentFilter === opt.id,
          },
          filterLabel(opt)
        ),
        -12 - i
      );
    });

    return items;
  }
}
