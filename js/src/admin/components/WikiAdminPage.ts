import ExtensionPage from 'flarum/admin/components/ExtensionPage';
import Button from 'flarum/common/components/Button';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import CategoryEditorModal from './CategoryEditorModal';
import { t, tx, showError, loadCategoriesList, deleteCategory } from '../utils';

export default class WikiAdminPage extends ExtensionPage {
  loading = true;
  categories: any[] = [];

  oninit(vnode: any) {
    super.oninit(vnode);
    this._load();
  }

  _load() {
    this.loading = true;
    loadCategoriesList()
      .then((cats: any[]) => {
        this.categories = cats || [];
        this.loading = false;
        m.redraw();
      })
      .catch(() => {
        this.loading = false;
        m.redraw();
      });
  }

  content() {
    return m('div', { className: 'ExtensionPage-settings' }, [
      m('div', { className: 'container' }, [
        m('div', { className: 'LinkRobinsWikiAdmin' }, [
          m('h2', t('linkrobins-wiki.admin.categories.heading')),
          m('p', { className: 'helpText' }, t('linkrobins-wiki.admin.categories.intro')),

          m(
            Button,
            {
              className: 'Button Button--primary',
              icon: 'fas fa-plus',
              onclick: () => this._openEditor(null),
            },
            t('linkrobins-wiki.admin.categories.new_button')
          ),

          this.loading ? m(LoadingIndicator) : this._renderTable(),
        ]),
      ]),
    ]);
  }

  _renderTable() {
    if (!this.categories.length) {
      return m('p', { className: 'LinkRobinsWikiAdmin-empty' }, t('linkrobins-wiki.admin.categories.empty'));
    }

    return m('table', { className: 'LinkRobinsWikiAdmin-table' }, [
      m('thead', m('tr', [
        m('th', t('linkrobins-wiki.admin.categories.column_name')),
        m('th', t('linkrobins-wiki.admin.categories.column_slug')),
        m('th', t('linkrobins-wiki.admin.categories.column_articles')),
        m('th'),
      ])),
      m('tbody', this.categories.map((cat: any) => m('tr', { key: 'cat-' + cat.id() }, [
        m('td', [
          cat.icon() ? m('i', { className: cat.icon(), style: 'color: ' + (cat.color() || 'inherit') }) : null,
          ' ',
          cat.name(),
        ]),
        m('td', m('code', cat.slug())),
        m('td', String(cat.articleCount ? cat.articleCount() : 0)),
        m('td', { className: 'LinkRobinsWikiAdmin-rowActions' }, [
          m(Button, { className: 'Button Button--text', icon: 'fas fa-pencil-alt', onclick: () => this._openEditor(cat) }, t('linkrobins-wiki.admin.categories.edit_button')),
          m(Button, { className: 'Button Button--text', icon: 'fas fa-trash', onclick: () => this._delete(cat) }, t('linkrobins-wiki.admin.categories.delete_button')),
        ]),
      ]))),
    ]);
  }

  _openEditor(category: any) {
    app.modal.show(CategoryEditorModal, {
      category,
      onsaved: () => this._load(),
    });
  }

  _delete(category: any) {
    const msg = tx('linkrobins-wiki.admin.categories.delete_confirm_named', { name: category.name() });
    if (!confirm(msg)) return;
    deleteCategory(category)
      .then(() => this._load())
      .catch(() => showError(tx('linkrobins-wiki.admin.category_editor.error_delete')));
  }
}
