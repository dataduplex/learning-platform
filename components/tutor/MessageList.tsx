import type { TutorMessage } from '@/lib/tutor/types';
import { Markdownish } from './Markdownish';

export function MessageList({
  messages,
  streaming,
}: {
  messages: readonly TutorMessage[];
  streaming: string | null;
}) {
  return (
    <ol className="tutor-messages">
      {messages.map((message, index) => (
        <li key={index} data-role={message.role}>
          <span className="tutor-speaker">{message.role === 'user' ? 'You' : 'Tutor'}</span>
          <div className="tutor-body"><Markdownish source={message.content} /></div>
        </li>
      ))}
      {streaming === null ? null : (
        <li data-role="assistant" data-streaming="true">
          <span className="tutor-speaker">Tutor</span>
          <div className="tutor-body"><Markdownish source={streaming} /></div>
        </li>
      )}
    </ol>
  );
}
