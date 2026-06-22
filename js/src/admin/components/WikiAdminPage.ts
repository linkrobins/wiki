import ExtensionPage from 'flarum/admin/components/ExtensionPage';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import Button from 'flarum/common/components/Button';
import Form from 'flarum/common/components/Form';
import FormSectionGroup from 'flarum/admin/components/FormSectionGroup';
import FormSection from 'flarum/admin/components/FormSection';
import CategoryEditorModal from './CategoryEditorModal';
import AppealBannedUsersModal from './AppealBannedUsersModal';
import { tx, loadCategoriesList } from '../utils';

function settingsGet(key: string, fallback: string): any {
  try {
    const v = app.data && app.data.settings && app.data.settings[key];
    return v === undefined || v === null || v === '' ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

export default class WikiAdminPage extends ExtensionPage {
  categories: any[] = [];
  loadingCats = true;
  catError: any = null;

  oninit(vnode: any) {
    super.oninit(vnode);
    this.categories = [];
    this.loadingCats = true;
    this.catError = null;
    this._loadCategories();
  }

  _loadCategories() {
    this.loadingCats = true;
    m.redraw();
    loadCategoriesList()
      .then((cats: any[]) => {
        this.categories = cats || [];
        this.loadingCats = false;
        m.redraw();
      })
      .catch((err: any) => {
        this.catError = err;
        this.loadingCats = false;
        console.error('[linkrobins/wiki] categories load failed:', err);
        m.redraw();
      });
  }

  // Render the page using Flarum's standard ExtensionPage scaffolding: a
  // FormSectionGroup of stacked, labelled FormSections -- the same layout the
  // core Tags extension admin page uses.
  content() {
    return m(
      'div',
      { className: 'ExtensionPage-settings LinkRobinsWikiAdmin' },
      m(
        'div',
        { className: 'container' },
        m(FormSectionGroup, null, [
          m(FormSection, { label: tx('linkrobins-wiki.admin.categories.heading') }, this._renderCategoriesSection()),
          m(FormSection, { label: tx('linkrobins-wiki.admin.rate_limits.heading') }, this._renderSettingsSection()),
          m(FormSection, { label: tx('linkrobins-wiki.admin.appeal_bans.heading_alt') }, this._renderAppealBansSection()),
        ])
      )
    );
  }

  _renderCategoriesSection() {
    return [
      m('p', { className: 'helpText' }, tx('linkrobins-wiki.admin.categories.intro')),
      this.catError
        ? m('div', { className: 'Alert Alert--danger' }, tx('linkrobins-wiki.admin.category_editor.error_load'))
        : null,
      this.loadingCats
        ? m(LoadingIndicator)
        : this.categories.length === 0
        ? m('div', { className: 'LinkRobinsWikiAdmin-empty' }, tx('linkrobins-wiki.admin.categories.empty'))
        : m('div', { className: 'LinkRobinsWikiAdmin-tableWrap' }, m('table', { className: 'LinkRobinsWikiAdmin-catTable' }, [
            m(
              'thead',
              null,
              m('tr', null, [
                m('th', null, tx('linkrobins-wiki.admin.categories.column_name')),
                m('th', null, tx('linkrobins-wiki.admin.categories.column_tickets')),
                m('th', null, ''),
              ])
            ),
            m(
              'tbody',
              null,
              this.categories.map((c: any) =>
                m('tr', { key: 'cat-' + c.id() }, [
                  m('td', null, [
                    c.icon() ? m('i', { className: c.icon(), style: c.color() ? 'color: ' + c.color() : '' }) : null,
                    ' ',
                    m('strong', null, c.name()),
                  ]),
                  m('td', null, c.ticketCount() || 0),
                  m(
                    'td',
                    { className: 'LinkRobinsWikiAdmin-actions' },
                    m(
                      Button,
                      {
                        className: 'Button',
                        icon: 'fas fa-pencil-alt',
                        title: tx('linkrobins-wiki.admin.categories.edit_button'),
                        onclick: () => this._openEditor(c),
                      },
                      tx('linkrobins-wiki.admin.categories.edit_button')
                    )
                  ),
                ])
              )
            ),
          ])),
      m(
        Button,
        {
          className: 'Button',
          icon: 'fas fa-plus',
          onclick: () => this._openEditor(null),
        },
        tx('linkrobins-wiki.admin.categories.new_button')
      ),
    ];
  }

  _openEditor(category: any) {
    if (!app.modal) return;
    app.modal.show(CategoryEditorModal, {
      category,
      onSaved: () => {
        this._loadCategories();
      },
    });
  }

  // --- Settings section ---

  _renderSettingsSection() {
    const fields = [
      {
        key: 'linkrobins-wiki.appeal_limit_per_window',
        labelKey: 'linkrobins-wiki.admin.rate_limits.max_appeals_per_window',
        helpKey: 'linkrobins-wiki.admin.rate_limits.max_appeals_per_window_help',
        min: 1,
        defaultValue: '3',
      },
      {
        key: 'linkrobins-wiki.appeal_window_days',
        labelKey: 'linkrobins-wiki.admin.rate_limits.appeal_window_days',
        helpKey: 'linkrobins-wiki.admin.rate_limits.appeal_window_days_help',
        min: 1,
        defaultValue: '30',
      },
      {
        key: 'linkrobins-wiki.appeal_max_concurrent_open',
        labelKey: 'linkrobins-wiki.admin.rate_limits.max_concurrent_appeals',
        helpKey: 'linkrobins-wiki.admin.rate_limits.max_concurrent_appeals_help',
        min: 0,
        defaultValue: '1',
      },
      {
        key: 'linkrobins-wiki.general_limit_per_window',
        labelKey: 'linkrobins-wiki.admin.rate_limits.max_general_per_window',
        helpKey: 'linkrobins-wiki.admin.rate_limits.max_general_per_window_help',
        min: 1,
        defaultValue: '10',
      },
      {
        key: 'linkrobins-wiki.general_window_hours',
        labelKey: 'linkrobins-wiki.admin.rate_limits.general_window_hours',
        helpKey: 'linkrobins-wiki.admin.rate_limits.general_window_hours_help',
        min: 1,
        defaultValue: '24',
      },
    ];

    return m(Form, null, [
      m('p', { className: 'helpText' }, tx('linkrobins-wiki.admin.rate_limits.intro')),
      fields.map((f) =>
        m('div', { className: 'Form-group', key: f.key }, [
          m('label', null, tx(f.labelKey)),
          m('input', {
            type: 'number',
            className: 'FormControl',
            min: f.min,
            value: settingsGet(f.key, f.defaultValue),
            oninput: (e: any) => {
              this.setting(f.key)(e.target.value);
            },
          }),
          m('div', { className: 'helpText' }, tx(f.helpKey)),
        ])
      ),
      m('div', { className: 'Form-group Form-controls' }, this.submitButton()),
    ]);
  }

  _renderAppealBansSection() {
    return [
      m('p', { className: 'helpText' }, tx('linkrobins-wiki.admin.appeal_bans.intro')),
      m(
        Button,
        {
          className: 'Button',
          icon: 'fas fa-list',
          onclick: () => {
            if (app.modal) app.modal.show(AppealBannedUsersModal);
          },
        },
        tx('linkrobins-wiki.admin.appeal_bans.view_banned_button')
      ),
    ];
  }
}
