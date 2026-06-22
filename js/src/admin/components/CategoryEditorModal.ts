import Modal from 'flarum/common/components/Modal';
import Button from 'flarum/common/components/Button';
import { t, tx, saveCategory } from '../utils';

/**
 * Create / edit a wiki category. A null `category` attr means create; an
 * existing model means edit.
 */
export default class CategoryEditorModal extends Modal {
  category: any = null;
  saving = false;

  name = '';
  slug = '';
  description = '';
  color = '';
  icon = '';
  position = 0;

  oninit(vnode: any) {
    super.oninit(vnode);
    this.category = this.attrs.category || null;
    if (this.category) {
      this.name = this.category.name() || '';
      this.slug = this.category.slug() || '';
      this.description = this.category.description() || '';
      this.color = this.category.color() || '';
      this.icon = this.category.icon() || '';
      this.position = this.category.position() || 0;
    }
  }

  className() {
    return 'Modal--small LinkRobinsWiki-categoryEditor';
  }

  title() {
    return this.category
      ? t('linkrobins-wiki.admin.category_editor.title_edit')
      : t('linkrobins-wiki.admin.category_editor.title_new');
  }

  content() {
    return m('div', { className: 'Modal-body' }, [
      this._field('field_name', m('input', {
        className: 'FormControl',
        value: this.name,
        oninput: (e: any) => { this.name = e.target.value; },
      })),

      this._field('field_slug', m('input', {
        className: 'FormControl',
        value: this.slug,
        placeholder: tx('linkrobins-wiki.admin.category_editor.field_slug_placeholder'),
        oninput: (e: any) => { this.slug = e.target.value; },
      }), 'field_slug_help'),

      this._field('field_description', m('textarea', {
        className: 'FormControl',
        value: this.description,
        oninput: (e: any) => { this.description = e.target.value; },
      })),

      this._field('field_color', m('input', {
        className: 'FormControl',
        type: 'text',
        value: this.color,
        placeholder: '#3b82f6',
        oninput: (e: any) => { this.color = e.target.value; },
      }), 'field_color_help'),

      this._field('field_icon', m('input', {
        className: 'FormControl',
        value: this.icon,
        placeholder: 'fas fa-book',
        oninput: (e: any) => { this.icon = e.target.value; },
      }), 'field_icon_help'),

      this._field('field_position', m('input', {
        className: 'FormControl',
        type: 'number',
        value: String(this.position),
        oninput: (e: any) => { this.position = parseInt(e.target.value, 10) || 0; },
      }), 'field_position_help'),

      m('div', { className: 'Form-group' }, m(
        Button,
        {
          className: 'Button Button--primary',
          type: 'submit',
          loading: this.saving,
          disabled: this.saving,
        },
        this.category
          ? t('linkrobins-wiki.admin.category_editor.submit_update')
          : t('linkrobins-wiki.admin.category_editor.submit_create')
      )),
    ]);
  }

  _field(labelKey: string, control: any, helpKey?: string) {
    return m('div', { className: 'Form-group' }, [
      m('label', t('linkrobins-wiki.admin.category_editor.' + labelKey)),
      control,
      helpKey ? m('p', { className: 'helpText' }, t('linkrobins-wiki.admin.category_editor.' + helpKey)) : null,
    ]);
  }

  onsubmit(e: any) {
    e.preventDefault();
    if (this.saving) return;

    this.saving = true;
    const attrs: Record<string, any> = {
      name: (this.name || '').trim(),
      slug: (this.slug || '').trim(),
      description: this.description,
      color: this.color,
      icon: this.icon,
      position: this.position,
    };

    saveCategory(this.category, attrs)
      .then(() => {
        this.saving = false;
        if (typeof this.attrs.onsaved === 'function') this.attrs.onsaved();
        this.hide();
      })
      .catch(() => {
        this.saving = false;
        this.alertAttrs = { type: 'error', content: tx('linkrobins-wiki.admin.category_editor.error_save') };
        m.redraw();
      });
  }
}
