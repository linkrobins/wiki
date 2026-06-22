<x-mail::plain.notification>
<x-slot:body>
{{ $translator->trans('linkrobins-wiki.email.new_reply_body', ['name' => $blueprint->getFromUser()?->display_name ?? $translator->trans('linkrobins-wiki.email.from_wiki')]) }}

  {{ $blueprint->reply->ticket?->subject }}

@if($blueprint->reply->ticket)
{{ $translator->trans('linkrobins-wiki.email.view_ticket') }}: {{ $url->to('forum')->base() . '/wiki/' . $blueprint->reply->ticket->id }}
@endif
</x-slot:body>
</x-mail::plain.notification>
