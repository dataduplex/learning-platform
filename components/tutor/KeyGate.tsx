'use client';

import { useState } from 'react';
import { writeKey } from '@/lib/tutor/key-store';

export function KeyGate({
  storage,
  onSaved,
}: {
  storage: Storage;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  function save() {
    try {
      writeKey(draft, storage);
      setDraft('');
      setError(null);
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That key was not accepted.');
    }
  }

  return (
    <form
      className="key-gate"
      onSubmit={(event) => { event.preventDefault(); save(); }}
    >
      <p>
        The tutor calls the Anthropic API from your browser using your own key. The key
        stays in this browser&rsquo;s local storage and is sent only to Anthropic - there is
        no server in this course to send it to. Get one from the{' '}
        <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
          Anthropic console
        </a>.
      </p>
      <label htmlFor="tutor-key">API key</label>
      <input
        id="tutor-key"
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={draft}
        onChange={(event) => { setDraft(event.target.value); setError(null); }}
      />
      <button type="submit">Save key</button>
      {error === null ? null : <p className="key-gate-error" role="alert">{error}</p>}
    </form>
  );
}
