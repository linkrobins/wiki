import Model from 'flarum/common/Model';

/**
 * A wiki category (e.g. "Guides", "Reference") used to organise articles.
 */
export default class WikiCategory extends Model {
  name = Model.attribute<string>('name');
  slug = Model.attribute<string>('slug');
  description = Model.attribute<string | null>('description');
  color = Model.attribute<string | null>('color');
  icon = Model.attribute<string | null>('icon');
  position = Model.attribute<number>('position');
  articleCount = Model.attribute<number>('articleCount');

  createdAt = Model.attribute('createdAt', Model.transformDate);
  updatedAt = Model.attribute('updatedAt', Model.transformDate);
}
