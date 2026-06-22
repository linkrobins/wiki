import Page from 'flarum/common/components/Page';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import PageStructure from 'flarum/forum/components/PageStructure';
import Button from 'flarum/common/components/Button';
import Dropdown from 'flarum/common/components/Dropdown';
import WikiIndexSidebar from './WikiIndexSidebar';
import { tr, trText } from '../utils/translate';
import { basePath, BASE_PATH, formatDate, safeNavigate, showError, userLink } from '../utils/helpers';
import { canHandleWikiTickets } from '../utils/permissions';
import { statusLabel, statusBadge, decisionLabel } from '../utils/status';
import { loadTicket, loadReplies, postReply, uploadFilesToBody } from '../utils/api';
import {
  wikiComposerWikied,
  wikiComposerOpenFor,
  openWikiComposer,
  wikiComposerPreview,
} from '../utils/composer';

export default class WikiShowPage extends Page {
  loading = true;
  error: any = null;
  ticket: any = null;
  replies: any[] = [];
  replyText = '';
  replyIsInternal = false;
  posting = false;
  updating = false;
  uploadingCount = 0;
  uploadError: any = null;
  _ticketId: any = null;
  _ticketBusy = false;
  _replyEditState: Record<string, any> | null = null;
  _replyFileInput: any = null;
  _replyComposer: any = null;
  _replyEditorNonce = 0;

  oninit(vnode: any) {
    super.oninit(vnode);
    this.loading = true;
    this.error = null;
    this.ticket = null;
    this.replies = [];
    this.replyText = '';
    this.replyIsInternal = false;
    this.posting = false;
    this.updating = false;
    this.uploadingCount = 0;
    this.uploadError = null;
    try {
      app.setTitle(tr('show.title', 'Ticket'));
    } catch (e) {}
    this._ticketId = (this.attrs && this.attrs.id) || null;
    if (this._ticketId) this._load();
  }

  onupdate(vnode: any) {
    if (super.onupdate) super.onupdate(vnode);
    const newId = (this.attrs && this.attrs.id) || null;
    if (newId !== this._ticketId) {
      this._ticketId = newId;
      this.loading = true;
      this.ticket = null;
      this.replies = [];
      if (newId) this._load();
    }
  }

  _load() {
    this.loading = true;
    m.redraw();

    Promise.all([loadTicket(this._ticketId), loadReplies(this._ticketId)])
      .then((results: any[]) => {
        this.ticket = results[0];
        this.replies = results[1] || [];
        this.loading = false;
        try {
          const t = this.ticket && this.ticket.subject();
          if (t) app.setTitle(t);
        } catch (e) {}
        m.redraw();
      })
      .catch((err: any) => {
        this.error = err;
        this.loading = false;
        console.error('[linkrobins/wiki] ticket load failed:', err);
        m.redraw();
      });
  }

  _wrap(inner: any) {
    return m(
      PageStructure,
      {
        className: 'IndexPage LinkRobinsWiki-page',
        sidebar: () => m(WikiIndexSidebar, { className: 'LinkRobinsWiki-sidebar', activeFilter: null }),
      },
      inner
    );
  }

  view() {
    if (this.loading) {
      return this._wrap(m('div', { className: 'LinkRobinsWiki-container' }, m(LoadingIndicator)));
    }
    if (this.error || !this.ticket) {
      return this._wrap(
        m('div', { className: 'LinkRobinsWiki-container' }, [
          m('header', { className: 'LinkRobinsWiki-header' }, [
            m('h1', { className: 'LinkRobinsWiki-title' }, tr('show.title', 'Ticket')),
            m(
              'a',
              {
                href: basePath() + BASE_PATH,
                className: 'Button Button--text',
                onclick: (e: any) => {
                  safeNavigate(basePath() + BASE_PATH, e);
                },
              },
              [m('i', { className: 'fas fa-arrow-left' }), ' ', tr('action.back', 'Back')]
            ),
          ]),
          m(
            'div',
            { className: 'LinkRobinsWiki-empty' },
            tr(
              'errors.load_ticket',
              'Could not load this ticket. It may have been deleted, or you may not have permission to view it.'
            )
          ),
        ])
      );
    }

    const ticket = this.ticket;
    const creator = ticket.user && ticket.user();
    const category = ticket.category && ticket.category();
    const isDeleted = !!ticket.isDeleted();
    const canModerate = !!ticket.canUpdate() || !!ticket.canDelete();

    return this._wrap(
      m(
        'div',
        { className: 'LinkRobinsWiki-container' + (isDeleted ? ' LinkRobinsWiki-container--deleted' : '') },
        [
          m('header', { className: 'LinkRobinsWiki-header LinkRobinsWiki-ticket-header' }, [
            m('div', { className: 'LinkRobinsWiki-ticket-titleRow' }, [
              m('h1', { className: 'LinkRobinsWiki-title' }, ticket.subject()),
              statusBadge(ticket.status()),
              isDeleted
                ? m('span', { className: 'LinkRobinsWiki-reply-deletedBadge' }, [
                    m('i', { className: 'fas fa-trash' }),
                    ' ',
                    tr('show.deleted_badge', 'Deleted'),
                  ])
                : null,
              canModerate ? this._renderTicketActions(ticket) : null,
            ]),
            m('div', { className: 'LinkRobinsWiki-ticket-meta' }, [
              category
                ? m(
                    'span',
                    { className: 'LinkRobinsWiki-row-cat', style: 'color: ' + (category.color() || 'inherit') },
                    category.name()
                  )
                : null,
              creator ? m('span', null, [tr('show.opened_by', 'Opened by'), ' ', userLink(creator)]) : null,
              m('span', null, formatDate(ticket.createdAt())),
            ]),
            ticket.decision()
              ? m('div', { className: 'LinkRobinsWiki-decision' }, [
                  tr('show.decision', 'Decision:'),
                  ' ',
                  m('span', { className: 'LinkRobinsWiki-decision-' + ticket.decision() }, decisionLabel(ticket.decision())),
                ])
              : null,
          ]),

          canHandleWikiTickets() ? this._renderStaffControls(ticket) : null,

          m(
            'div',
            { className: 'LinkRobinsWiki-replies' },
            this.replies.map((r: any) => this._renderReply(r))
          ),

          ticket.canReply()
            ? this._renderReplyForm()
            : m(
                'div',
                { className: 'LinkRobinsWiki-empty' },
                ticket.status() === 'closed'
                  ? tr('show.closed_notice', 'This ticket has been closed and cannot be replied to.')
                  : tr('show.cannot_reply', 'You cannot reply to this ticket.')
              ),
        ]
      )
    );
  }

  _renderStaffControls(ticket: any) {
    if (!canHandleWikiTickets()) return null;
    if (ticket.status() === 'closed') {
      return m('div', { className: 'LinkRobinsWiki-staffBar' }, [
        m('span', { className: 'LinkRobinsWiki-staffBar-label' }, tr('show.closed_badge', 'Closed ticket')),
        this._renderDecisionGroup(ticket),
        this._renderAssignmentRow(false),
      ]);
    }
    const statuses = ['open', 'in_progress', 'awaiting_user', 'resolved', 'closed'];

    return m('div', { className: 'LinkRobinsWiki-staffBar' }, [
      m('label', { className: 'LinkRobinsWiki-staffBar-statusGroup' }, [
        m('span', { className: 'LinkRobinsWiki-staffBar-label' }, tr('staff.set_status', 'Set status:')),
        m(
          'select',
          {
            className: 'FormControl LinkRobinsWiki-staffBar-statusSelect',
            value: ticket.status(),
            disabled: this.updating,
            onchange: (e: any) => {
              const next = e.target.value;
              if (next && next !== ticket.status()) {
                this._setStatus(next);
              }
            },
          },
          statuses.map((s) => m('option', { value: s }, statusLabel(s)))
        ),
      ]),
      this._renderDecisionGroup(ticket),
      this._renderAssignmentRow(true),
    ]);
  }

  // Appeal tickets carry a decision (pending/accepted/rejected); regular tickets
  // have a null decision and get no selector. Staff change it here -- the backend
  // (WikiTicketResource) gates the writable `decision` attribute to staff.
  _renderDecisionGroup(ticket: any) {
    if (!ticket.decision()) return null;
    const decisions = ['pending', 'accepted', 'rejected'];

    return m('label', { className: 'LinkRobinsWiki-staffBar-statusGroup' }, [
      m('span', { className: 'LinkRobinsWiki-staffBar-label' }, tr('staff.set_decision', 'Appeal decision:')),
      m(
        'select',
        {
          className: 'FormControl LinkRobinsWiki-staffBar-statusSelect',
          value: ticket.decision(),
          disabled: this.updating,
          onchange: (e: any) => {
            const next = e.target.value;
            if (next && next !== ticket.decision()) {
              this._setDecision(next);
            }
          },
        },
        decisions.map((d) => m('option', { value: d }, decisionLabel(d)))
      ),
    ]);
  }

  _renderAssignmentRow(allowChanges: boolean) {
    const assigned = this.ticket.assignedStaff && this.ticket.assignedStaff();
    const actor = app.session && app.session.user;
    const actorIsAssigned = assigned && actor && String(assigned.id()) === String(actor.id());
    const label = assigned
      ? tr('show.assigned_to', 'Assigned to') + ' ' + (assigned.username() || 'user #' + assigned.id())
      : tr('show.unassigned', 'Unassigned');

    return m('div', { className: 'LinkRobinsWiki-staffBar-assign' }, [
      m('span', { className: 'LinkRobinsWiki-staffBar-label' }, label),
      allowChanges && !actorIsAssigned
        ? m(
            'button',
            {
              type: 'button',
              className: 'Button Button--default LinkRobinsWiki-staffBtn',
              disabled: this.updating,
              onclick: () => {
                this._claim();
              },
            },
            tr('action.claim', 'Claim')
          )
        : null,
      allowChanges && assigned
        ? m(
            'button',
            {
              type: 'button',
              className: 'Button Button--default LinkRobinsWiki-staffBtn',
              disabled: this.updating,
              onclick: () => {
                this._unassign();
              },
            },
            tr('action.unassign', 'Unassign')
          )
        : null,
    ]);
  }

  _claim() {
    const actor = app.session && app.session.user;
    if (!actor) return;
    this._setAssignment(actor);
  }

  _unassign() {
    this._setAssignment(null);
  }

  _setAssignment(user: any) {
    this.updating = true;
    m.redraw();
    this.ticket
      .save({ relationships: { assignedStaff: user } })
      .then(() => {
        // The PATCH response omits a now-null ToOne relationship (the server
        // doesn't echo it back, even when included), so the local model would
        // keep the stale assignee. Clear it explicitly on unassign.
        if (!user && typeof this.ticket.pushData === 'function') {
          this.ticket.pushData({ relationships: { assignedStaff: { data: null } } });
        }
        this.updating = false;
        m.redraw();
      })
      .catch((err: any) => {
        this.updating = false;
        console.error('[linkrobins/wiki] assignment update failed:', err);
        showError(tr('errors.update_assignment', 'Could not update assignment.'));
        m.redraw();
      });
  }

  _setStatus(status: string) {
    this.updating = true;
    m.redraw();
    this.ticket
      .save({ status })
      .then(() => {
        this.updating = false;
        m.redraw();
      })
      .catch((err: any) => {
        this.updating = false;
        console.error('[linkrobins/wiki] status update failed:', err);
        showError(tr('errors.update_status', 'Could not update status.'));
        m.redraw();
      });
  }

  _setDecision(decision: string) {
    this.updating = true;
    m.redraw();
    this.ticket
      .save({ decision })
      .then(() => {
        this.updating = false;
        m.redraw();
      })
      .catch((err: any) => {
        this.updating = false;
        console.error('[linkrobins/wiki] decision update failed:', err);
        showError(tr('errors.update_decision', 'Could not update the appeal decision.'));
        m.redraw();
      });
  }

  _renderReply(reply: any) {
    const user = reply.user && reply.user();
    const html = reply.contentHtml() || '';
    const isInternal = !!reply.isInternalNote();
    const isDeleted = !!reply.isDeleted();
    const canEdit = !!reply.canEdit();
    const canDelete = !!reply.canDelete();
    const editedAt = reply.editedAt();
    const editedBy = reply.editedBy && reply.editedBy();

    if (!this._replyEditState) this._replyEditState = {};
    const state = this._replyEditState[reply.id()] || null;
    const editing = !!(state && state.editing);
    const busy = !!(state && state.busy);

    let classes = 'LinkRobinsWiki-reply';
    if (isInternal) classes += ' is-internal';
    if (isDeleted) classes += ' is-deleted';

    return m('article', { className: classes, key: 'reply-' + reply.id() }, [
      m('header', { className: 'LinkRobinsWiki-reply-header' }, [
        user ? m('span', { className: 'LinkRobinsWiki-reply-author' }, userLink(user)) : null,
        m('span', { className: 'LinkRobinsWiki-reply-date' }, formatDate(reply.createdAt())),
        editedAt
          ? m(
              'span',
              {
                className: 'LinkRobinsWiki-reply-edited',
                title: editedBy
                  ? trText('reply.edited_by', 'Edited by {name} on {date}', {
                      date: formatDate(editedAt),
                      name: editedBy.displayName() || editedBy.username(),
                    })
                  : trText('reply.edited_at', 'Edited on {date}', { date: formatDate(editedAt) }),
              },
              tr('reply.edited_marker', '(edited)')
            )
          : null,
        isDeleted
          ? m('span', { className: 'LinkRobinsWiki-reply-deletedBadge' }, [
              m('i', { className: 'fas fa-trash' }),
              ' ',
              tr('show.deleted_badge', 'Deleted'),
            ])
          : null,
        canEdit || canDelete ? this._renderReplyActions(reply, isDeleted, editing, busy) : null,
      ]),

      editing
        ? this._renderReplyEditor(reply, state)
        : isDeleted
        ? m(
            'div',
            { className: 'LinkRobinsWiki-reply-body LinkRobinsWiki-reply-body--deleted' },
            tr('reply.deleted_notice', 'This reply was deleted.')
          )
        : m('div', {
            className: 'LinkRobinsWiki-reply-body',
            oncreate: (vnode: any) => {
              try {
                vnode.dom.innerHTML = html;
              } catch (e) {}
            },
            onupdate: (vnode: any) => {
              try {
                vnode.dom.innerHTML = html;
              } catch (e) {}
            },
          }),
    ]);
  }

  _renderReplyActions(reply: any, isDeleted: boolean, editing: boolean, busy: boolean) {
    const canEdit = !!reply.canEdit();
    const canDelete = !!reply.canDelete();

    if (editing) {
      return null;
    }

    const items: any[] = [];
    if (!isDeleted) {
      if (canEdit) {
        items.push(
          m(
            Button,
            {
              icon: 'fas fa-pencil-alt',
              disabled: busy,
              onclick: () => {
                this._beginEditReply(reply);
              },
            },
            tr('action.edit', 'Edit')
          )
        );
      }
      if (canDelete) {
        items.push(
          m(
            Button,
            {
              icon: 'fas fa-trash',
              className: 'LinkRobinsWiki-reply-action--danger',
              disabled: busy,
              onclick: () => {
                this._softDeleteReply(reply);
              },
            },
            tr('action.delete', 'Delete')
          )
        );
      }
    } else {
      if (canDelete) {
        items.push(
          m(
            Button,
            {
              icon: 'fas fa-undo',
              disabled: busy,
              onclick: () => {
                this._restoreReply(reply);
              },
            },
            tr('action.restore', 'Restore')
          )
        );
        items.push(
          m(
            Button,
            {
              icon: 'fas fa-times',
              className: 'LinkRobinsWiki-reply-action--danger',
              disabled: busy,
              onclick: () => {
                this._forceDeleteReply(reply);
              },
            },
            tr('action.delete_forever', 'Delete forever')
          )
        );
      }
    }

    if (items.length === 0) return null;

    return m(
      'span',
      { className: 'LinkRobinsWiki-reply-actions' },
      m(
        Dropdown,
        {
          menuClassName: 'Dropdown-menu--right',
          buttonClassName: 'Button Button--icon Button--flat LinkRobinsWiki-reply-actionsToggle',
          icon: 'fas fa-ellipsis-h',
          accessibleToggleLabel: tr('reply.mod_actions', 'Moderation actions'),
        },
        items
      )
    );
  }

  // Inline edit-reply editor. Only a fallback on stripped installs without the
  // docked composer; normally _beginEditReply opens the composer instead.
  _renderReplyEditor(reply: any, state: any) {
    const canSave = !state.busy && state.draft.trim() !== '';

    return m('div', { className: 'LinkRobinsWiki-reply-editor' }, [
      m('textarea', {
        className: 'FormControl LinkRobinsWiki-body',
        rows: 5,
        value: state.draft,
        disabled: state.busy,
        oninput: (e: any) => {
          state.draft = e.target.value;
        },
        onkeydown: (e: any) => {
          const isSubmit = (e.key === 'Enter' || e.keyCode === 13) && (e.ctrlKey || e.metaKey);
          if (!isSubmit) return;
          if (!state.busy && state.draft.trim() !== '') {
            e.preventDefault();
            this._saveEditReply(reply);
          }
        },
      }),
      m('div', { className: 'LinkRobinsWiki-reply-editor-actions' }, [
        m(
          'button',
          {
            type: 'button',
            className: 'Button Button--default',
            disabled: state.busy,
            onclick: () => {
              this._cancelEditReply(reply);
            },
          },
          tr('action.cancel', 'Cancel')
        ),
        m(
          'button',
          {
            type: 'button',
            className: 'Button Button--primary',
            disabled: !canSave,
            onclick: () => {
              this._saveEditReply(reply);
            },
          },
          state.busy ? tr('action.saving', 'Saving…') : tr('action.save_changes', 'Save changes')
        ),
      ]),
    ]);
  }

  _beginEditReply(reply: any) {
    // Pre-fill with the original markdown source so editing preserves format.
    const draft = typeof reply.content() === 'string' ? reply.content() : '';

    // Preferred path: edit in the docked composer (rich text / mentions /
    // upload all work, matching editing a post on the forum).
    if (wikiComposerWikied()) {
      openWikiComposer({
        wikiContext: 'edit-reply:' + reply.id(),
        className: 'LinkRobinsWiki-replyComposer',
        placeholder: tr('reply.placeholder', 'Write a reply…'),
        submitLabel: tr('action.save_changes', 'Save changes'),
        confirmExit: tr('reply.discard_confirm', 'You have unsaved changes. Discard them?'),
        originalContent: draft,
        wikiHeaderItems: () => [
          {
            name: 'title',
            content: m('h3', { className: 'LinkRobinsWiki-composerTitle' }, [
              m('i', { className: 'fas fa-pencil-alt' }),
              ' ',
              tr('action.edit_reply', 'Edit reply'),
            ]),
          },
        ],
        onWikiSubmit: (content: string, body: any) => {
          this._saveEditReply(reply, content, body);
        },
      });
      return;
    }

    // Fallback: inline textarea editor.
    if (!this._replyEditState) this._replyEditState = {};
    this._replyEditState[reply.id()] = { editing: true, draft, busy: false };
    m.redraw();
  }

  _cancelEditReply(reply: any) {
    if (this._replyEditState) delete this._replyEditState[reply.id()];
    m.redraw();
  }

  // Save a reply edit. Called from the docked composer with (reply, content,
  // body), or from the fallback inline editor with just (reply).
  _saveEditReply(reply: any, content?: string, body?: any) {
    const state = this._replyEditState && this._replyEditState[reply.id()];
    const text = typeof content === 'string' ? content : state ? state.draft : '';
    if (!text || text.trim() === '') return;
    if (!content && !state) return;

    if (state) state.busy = true;
    if (body) body.loading = true;
    m.redraw();

    // Override the URL to request the editedBy/user relationships back so the
    // "(edited) by X" marker refreshes from the server's response.
    reply
      .save(
        { content: text },
        {
          url:
            app.forum.attribute('apiUrl') +
            '/linkrobins-wiki-replies/' +
            reply.id() +
            '?include=user,editedBy',
        }
      )
      .then(() => {
        if (this._replyEditState) delete this._replyEditState[reply.id()];
        if (body && body.composer) body.composer.hide();
        m.redraw();
      })
      .catch((err: any) => {
        if (state) state.busy = false;
        if (body) body.loading = false;
        console.error('[linkrobins/wiki] edit reply failed:', err);
        showError(tr('errors.save_edit', 'Could not save the edit.'));
        m.redraw();
      });
  }

  _softDeleteReply(reply: any) {
    try {
      if (!window.confirm(tr('confirm.soft_delete_reply', 'Soft-delete this reply? Staff can restore it later.'))) return;
    } catch (e) {}
    this._patchReplyDeletedState(reply, true);
  }

  _restoreReply(reply: any) {
    this._patchReplyDeletedState(reply, false);
  }

  _patchReplyDeletedState(reply: any, isDeleted: boolean) {
    this._setReplyBusy(reply.id(), true);

    reply
      .save({ isDeleted })
      .then(() => {
        this._setReplyBusy(reply.id(), false);
        m.redraw();
      })
      .catch((err: any) => {
        this._setReplyBusy(reply.id(), false);
        console.error('[linkrobins/wiki] toggle delete failed:', err);
        showError(
          isDeleted
            ? tr('errors.delete_reply', 'Could not delete the reply.')
            : tr('errors.restore_reply', 'Could not restore the reply.')
        );
        m.redraw();
      });
  }

  _forceDeleteReply(reply: any) {
    try {
      if (!window.confirm(tr('confirm.delete_reply_forever', 'Permanently delete this reply? This cannot be undone.')))
        return;
    } catch (e) {}
    this._setReplyBusy(reply.id(), true);

    reply
      .delete()
      .then(() => {
        this.replies = (this.replies || []).filter((r: any) => String(r.id()) !== String(reply.id()));
        if (this._replyEditState) delete this._replyEditState[reply.id()];
        m.redraw();
      })
      .catch((err: any) => {
        this._setReplyBusy(reply.id(), false);
        console.error('[linkrobins/wiki] force delete failed:', err);
        showError(tr('errors.delete_reply_forever', 'Could not permanently delete the reply.'));
        m.redraw();
      });
  }

  _setReplyBusy(replyId: string, busy: boolean) {
    if (!this._replyEditState) this._replyEditState = {};
    const existing = this._replyEditState[replyId];
    if (existing) {
      existing.busy = busy;
    } else if (busy) {
      this._replyEditState[replyId] = { editing: false, draft: '', busy: true };
    }
    if (!busy && this._replyEditState[replyId] && !this._replyEditState[replyId].editing) {
      delete this._replyEditState[replyId];
    }
  }

  // --- Ticket moderation -------------------------------------------------

  _renderTicketActions(ticket: any) {
    const canUpdate = !!ticket.canUpdate();
    const canDelete = !!ticket.canDelete();
    const isDeleted = !!ticket.isDeleted();
    const busy = !!this._ticketBusy;

    const items: any[] = [];
    if (!isDeleted) {
      if (canUpdate) {
        items.push(
          m(
            Button,
            {
              icon: 'fas fa-trash',
              className: 'LinkRobinsWiki-reply-action--danger',
              disabled: busy,
              onclick: () => {
                this._softDeleteTicket();
              },
            },
            tr('ticket.delete', 'Delete ticket')
          )
        );
      }
    } else {
      if (canUpdate) {
        items.push(
          m(
            Button,
            {
              icon: 'fas fa-undo',
              disabled: busy,
              onclick: () => {
                this._restoreTicket();
              },
            },
            tr('ticket.restore', 'Restore ticket')
          )
        );
      }
      if (canDelete) {
        items.push(
          m(
            Button,
            {
              icon: 'fas fa-times',
              className: 'LinkRobinsWiki-reply-action--danger',
              disabled: busy,
              onclick: () => {
                this._forceDeleteTicket();
              },
            },
            tr('action.delete_forever', 'Delete forever')
          )
        );
      }
    }

    if (items.length === 0) return null;

    return m(
      'span',
      { className: 'LinkRobinsWiki-ticket-actions' },
      m(
        Dropdown,
        {
          menuClassName: 'Dropdown-menu--right',
          buttonClassName: 'Button Button--icon Button--flat LinkRobinsWiki-reply-actionsToggle',
          icon: 'fas fa-ellipsis-h',
          accessibleToggleLabel: tr('ticket.mod_actions', 'Ticket moderation actions'),
        },
        items
      )
    );
  }

  _softDeleteTicket() {
    try {
      if (
        !window.confirm(
          tr(
            'confirm.soft_delete_ticket',
            'Soft-delete this ticket? It will be hidden from the index and from the ticket owner; staff can restore it.'
          )
        )
      )
        return;
    } catch (e) {}
    this._patchTicketDeletedState(true);
  }

  _restoreTicket() {
    this._patchTicketDeletedState(false);
  }

  _patchTicketDeletedState(isDeleted: boolean) {
    if (!this.ticket) return;
    this._ticketBusy = true;
    m.redraw();

    this.ticket
      .save({ isDeleted })
      .then(() => {
        this._ticketBusy = false;
        m.redraw();
      })
      .catch((err: any) => {
        this._ticketBusy = false;
        console.error('[linkrobins/wiki] ticket delete toggle failed:', err);
        showError(
          isDeleted
            ? tr('errors.delete_ticket', 'Could not delete the ticket.')
            : tr('errors.restore_ticket', 'Could not restore the ticket.')
        );
        m.redraw();
      });
  }

  _forceDeleteTicket() {
    if (!this.ticket) return;
    try {
      if (
        !window.confirm(
          tr('confirm.delete_ticket_forever', 'Permanently delete this ticket and all its replies? This cannot be undone.')
        )
      )
        return;
    } catch (e) {}
    this._ticketBusy = true;
    m.redraw();

    this.ticket
      .delete()
      .then(() => {
        // After permanent deletion the ticket is gone -- navigate back to the
        // index so the user isn't on a stale page that 404s on refetch.
        try {
          m.route.set(app.route('linkrobins-wiki.index'));
        } catch (e) {}
      })
      .catch((err: any) => {
        this._ticketBusy = false;
        console.error('[linkrobins/wiki] ticket force delete failed:', err);
        showError(tr('errors.delete_ticket_forever', 'Could not permanently delete the ticket.'));
        m.redraw();
      });
  }

  _renderReplyForm() {
    const canPostInternal = !!(this.ticket && this.ticket.canPostInternalNote());

    // Preferred path: open Flarum's real docked composer (FoF Rich Text, FoF
    // Upload, Mentions, Emoji all behave as for a normal forum reply). Show the
    // same "reply placeholder" box Flarum uses at the end of a discussion.
    if (wikiComposerWikied()) {
      const open = wikiComposerOpenFor('reply:' + this.ticket.id());
      return m(
        'div',
        { className: 'LinkRobinsWiki-replyPrompt' },
        wikiComposerPreview({
          composing: open,
          placeholder: app.translator.trans('core.forum.post_stream.reply_placeholder'),
          onclick: () => {
            this._openReplyComposer(canPostInternal);
          },
        })
      );
    }

    // Fallback for stripped installs: a plain textarea + attach button.
    const canSubmit = !this.posting && this.replyText.trim() !== '';
    const canUpload = !!(
      app.forum &&
      typeof app.forum.attribute === 'function' &&
      app.forum.attribute('fof-upload.canUpload')
    );
    const placeholder = this.replyIsInternal
      ? tr('reply.internal_placeholder', 'Internal note (only staff will see this)…')
      : tr('reply.placeholder', 'Write a reply…');

    return m('div', { className: 'LinkRobinsWiki-replyForm' }, [
      m('textarea', {
        className: 'FormControl LinkRobinsWiki-body',
        rows: 5,
        value: this.replyText,
        disabled: this.posting,
        placeholder,
        oninput: (e: any) => {
          this.replyText = e.target.value;
        },
        onkeydown: (e: any) => {
          const isSubmit = (e.key === 'Enter' || e.keyCode === 13) && (e.ctrlKey || e.metaKey);
          if (!isSubmit) return;
          if (!this.posting && this.replyText.trim() !== '') {
            e.preventDefault();
            this._postReply();
          }
        },
      }),

      this.uploadError
        ? m('div', { className: 'Alert Alert--danger LinkRobinsWiki-uploadAlert' }, this.uploadError)
        : null,
      this.uploadingCount > 0
        ? m(
            'div',
            { className: 'LinkRobinsWiki-uploadStatus' },
            this.uploadingCount === 1
              ? tr('common.uploading_one', 'Uploading 1 file…')
              : tr('common.uploading_many', 'Uploading {count} files…', { count: this.uploadingCount })
          )
        : null,

      m('div', { className: 'LinkRobinsWiki-replyForm-actions' }, [
        canUpload
          ? m('span', { className: 'LinkRobinsWiki-attachBtnWrap' }, [
              m(
                'button',
                {
                  type: 'button',
                  className: 'Button Button--default LinkRobinsWiki-attachBtn',
                  disabled: this.posting || this.uploadingCount > 0,
                  onclick: () => {
                    if (this._replyFileInput) this._replyFileInput.click();
                  },
                },
                [m('i', { className: 'fas fa-paperclip' }), ' ', tr('action.attach_files', 'Attach files')]
              ),
              m('input', {
                type: 'file',
                multiple: true,
                style: 'display:none;',
                disabled: this.posting || this.uploadingCount > 0,
                oncreate: (vnode: any) => {
                  this._replyFileInput = vnode.dom;
                },
                onremove: () => {
                  this._replyFileInput = null;
                },
                onchange: (e: any) => {
                  const files = e.target.files;
                  if (files && files.length) {
                    this._uploadFiles(files);
                  }
                  try {
                    e.target.value = '';
                  } catch (err) {}
                },
              }),
            ])
          : null,
        canPostInternal
          ? m('label', { className: 'LinkRobinsWiki-internalToggle' }, [
              m('input', {
                type: 'checkbox',
                checked: this.replyIsInternal,
                disabled: this.posting,
                onchange: (e: any) => {
                  this.replyIsInternal = !!e.target.checked;
                },
              }),
              ' ',
              tr('reply.internal_note', 'Internal note'),
            ])
          : null,
        m(
          'button',
          {
            type: 'button',
            className: 'Button Button--primary',
            disabled: !canSubmit,
            onclick: () => {
              this._postReply();
            },
          },
          this.posting ? tr('reply.posting', 'Posting…') : tr('reply.post_reply', 'Post reply')
        ),
      ]),
    ]);
  }

  // Open the docked composer to write a reply / internal note.
  _openReplyComposer(canPostInternal: boolean) {
    const ticket = this.ticket;
    const subject = ticket.subject() || '';
    openWikiComposer({
      wikiContext: 'reply:' + ticket.id(),
      className: 'LinkRobinsWiki-replyComposer',
      placeholder: tr('reply.placeholder', 'Write a reply…'),
      submitLabel: tr('reply.post_reply', 'Post reply'),
      confirmExit: tr('reply.discard_confirm', 'You have an unsaved reply. Discard it?'),
      originalContent: '',
      wikiHeaderItems: (body: any) => {
        const rows: any[] = [
          {
            name: 'title',
            priority: 10,
            content: m('h3', { className: 'LinkRobinsWiki-composerTitle' }, [
              m('i', { className: 'fas fa-reply' }),
              ' ',
              subject,
            ]),
          },
        ];
        if (canPostInternal) {
          rows.push({
            name: 'internal',
            content: m('label', { className: 'LinkRobinsWiki-internalToggle' }, [
              m('input', {
                type: 'checkbox',
                checked: !!body._wikiInternal,
                onchange: (e: any) => {
                  body._wikiInternal = !!e.target.checked;
                },
              }),
              ' ',
              tr('reply.internal_note', 'Internal note'),
            ]),
          });
        }
        return rows;
      },
      onWikiSubmit: (content: string, body: any) => {
        this._postReply(content, !!body._wikiInternal, body);
      },
    });
  }

  _uploadFiles(files: FileList) {
    return uploadFilesToBody(this, files, 'replyText', () => this._replyComposer && this._replyComposer.editor);
  }

  _refreshTicket() {
    loadTicket(this._ticketId)
      .then((ticket: any) => {
        this.ticket = ticket;
        m.redraw();
      })
      .catch(() => {});
  }

  // Post a reply. Called from the docked composer with (content, isInternal,
  // body), or from the fallback textarea with no args.
  _postReply(content?: string, isInternal?: boolean, body?: any) {
    const text = typeof content === 'string' ? content : this.replyText;
    const internal = typeof isInternal === 'boolean' ? isInternal : !!this.replyIsInternal;
    if (!text || text.trim() === '') return;

    this.posting = true;
    if (body) body.loading = true;
    m.redraw();

    postReply(this.ticket, text, internal)
      .then((reply: any) => {
        this.posting = false;
        this.uploadError = null;
        this.uploadingCount = 0;
        if (body && body.composer) {
          body.composer.hide();
        } else {
          this.replyText = '';
          this.replyIsInternal = false;
          this._replyEditorNonce = (this._replyEditorNonce || 0) + 1;
        }
        // Append the new reply in place rather than a full reload, then refresh
        // the ticket so any server-side status/assignment change is reflected.
        if (reply) {
          this.replies = (this.replies || []).concat([reply]);
        }
        m.redraw();
        this._refreshTicket();
      })
      .catch((err: any) => {
        this.posting = false;
        if (body) body.loading = false;
        console.error('[linkrobins/wiki] reply failed:', err);
        showError(tr('errors.post_reply', 'Could not post reply.'));
        m.redraw();
      });
  }
}
