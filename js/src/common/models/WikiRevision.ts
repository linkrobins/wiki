import Model from 'flarum/common/Model';
import type User from 'flarum/common/models/User';
import type WikiArticle from './WikiArticle';

/**
 * An immutable snapshot of an article's title and body, taken each time the
 * article is edited. Revisions are read-only history.
 */
export default class WikiRevision extends Model {
  title = Model.attribute<string>('title');
  content = Model.attribute<string>('content');
  contentHtml = Model.attribute<string>('contentHtml');
  summary = Model.attribute<string | null>('summary');

  createdAt = Model.attribute('createdAt', Model.transformDate);

  user = Model.hasOne<User>('user');
  article = Model.hasOne<WikiArticle>('article');
}
