import { readForumAttribute } from './helpers';

function isAdmin(): boolean {
  try {
    const u = app.session && app.session.user;
    return !!(u && typeof u.isAdmin === 'function' && u.isAdmin());
  } catch (e) {
    return false;
  }
}

export function canCreateWikiTicket(): boolean {
  try {
    if (!app.session || !app.session.user) return false;
    if (isAdmin()) return true;
    return !!readForumAttribute('canCreateWikiTicket');
  } catch (e) {
    return false;
  }
}

export function canHandleWikiTickets(): boolean {
  try {
    if (!app.session || !app.session.user) return false;
    if (isAdmin()) return true;
    return !!readForumAttribute('canHandleWikiTickets');
  } catch (e) {
    return false;
  }
}

export function wikiAppealBanned(): boolean {
  try {
    return !!readForumAttribute('wikiAppealBanned');
  } catch (e) {
    return false;
  }
}

export function isUserSuspended(): boolean {
  try {
    return !!readForumAttribute('wikiSuspended');
  } catch (e) {
    return false;
  }
}
