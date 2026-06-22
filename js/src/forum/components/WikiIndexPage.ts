import Page from 'flarum/common/components/Page';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import PageStructure from 'flarum/forum/components/PageStructure';
import WikiIndexSidebar from './WikiIndexSidebar';
import { tr } from '../utils/translate';
import { basePath, BASE_PATH, formatDate, safeNavigate } from '../utils/helpers';
import { canCreateWikiArticle } from '../utils/permissions';
import { loadArticles } from '../utils/api';

export default class WikiIndexPage extends Page {
  loading = true;
  error: any = null;
  articles: any[] = [];
  category: string | null = null;

  oninit(vnode: any) {
    super.oninit(vnode);
    this.loading = true;
    this.error = null;
    this.articles = [];
    this.category = m.route.param('category') || null;
    try {
      app.setTitle(tr('nav', 'Wiki'));
    } catch (e) {}
    this._load();
  }

  onbeforeupdate(vnode: any) {
    const next = m.route.param('category') || null;
    if (next !== this.category) {
      this.category = next;
      Promise.resolve().then(() => this._load());
    }
    return true;
  }

  _load() {
    this.loading = true;
    m.redraw();

    const params: any = { page: { limit: 25 } };
    if (this.category) {
      params.filter = { categoryId: this.category };
    }

    loadArticles(params)
      .then((articles: any[]) => {
        this.articles = articles || [];
        this.loading = false;
        m.redraw();
      })
      .catch((err: any) => {
        this.error = err;
        this.loading = false;
        console.error('[linkrobins/wiki] index load failed:', err);
        m.redraw();
      });
  }

  view() {
    const content = m('div', { className: 'LinkRobinsWiki-container' }, [
      this._renderHeader(),
      this._renderList(),
    ]);

    return m(
      PageStructure,
      {
        className: 'IndexPage LinkRobinsWiki-page',
        sidebar: () => this._renderSidebar(),
      },
      content
    );
  }

  _renderSidebar() {
    try {
      return m(WikiIndexSidebar, { className: 'LinkRobinsWiki-sidebar' });
    } catch (e) {
      console.error('[linkrobins/wiki] sidebar render failed:', e);
    }
    return null;
  }

  _renderHeader() {
    return m('header', { className: 'LinkRobinsWiki-header' }, [
      m('h1', { className: 'LinkRobinsWiki-title' }, [m('i', { className: 'fas fa-book' }), ' ', tr('nav', 'Wiki')]),
    ]);
  }

  _renderList() {
    if (this.loading) {
      return m(LoadingIndicator);
    }
    if (this.error) {
      return m('div', { className: 'LinkRobinsWiki-empty' }, tr('errors.load_articles', 'Could not load articles.'));
    }
    if (!this.articles.length) {
      return m(
        'div',
        { className: 'LinkRobinsWiki-empty' },
        canCreateWikiArticle()
          ? tr('index.empty_own', 'No articles yet. Click "New article" to write one.')
          : tr('index.empty', 'No articles to show.')
      );
    }
    return m(
      'div',
      { className: 'LinkRobinsWiki-list' },
      this.articles.map((a: any) => this._renderRow(a))
    );
  }

  _renderRow(article: any) {
    const user = article.user && article.user();
    const cat = article.category && article.category();
    const href = basePath() + BASE_PATH + '/' + encodeURIComponent(article.id());
    const isDeleted = !!(article.isDeleted && article.isDeleted());

    return m(
      'a',
      {
        href,
        className: 'LinkRobinsWiki-row' + (isDeleted ? ' LinkRobinsWiki-row--deleted' : ''),
        onclick: (e: any) => {
          safeNavigate(href, e);
        },
        key: 'article-' + article.id(),
      },
      [
        m('div', { className: 'LinkRobinsWiki-row-main' }, [
          m('div', { className: 'LinkRobinsWiki-row-subject' }, [
            article.title() || tr('index.untitled', 'Untitled'),
            isDeleted
              ? m('span', { className: 'LinkRobinsWiki-row-deletedBadge' }, tr('index.deleted_badge', 'Deleted'))
              : null,
          ]),
          m('div', { className: 'LinkRobinsWiki-row-meta' }, [
            cat
              ? m(
                  'span',
                  { className: 'LinkRobinsWiki-row-cat', style: 'color: ' + (cat.color() || 'inherit') },
                  cat.name()
                )
              : null,
            user
              ? m('span', { className: 'LinkRobinsWiki-row-user' }, user.displayName() || user.username())
              : null,
            m('span', { className: 'LinkRobinsWiki-row-date' }, formatDate(article.lastEditedAt() || article.createdAt())),
          ]),
        ]),
      ]
    );
  }
}
