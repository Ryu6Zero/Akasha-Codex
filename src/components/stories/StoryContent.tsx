import type { CSSProperties } from 'react';
import type { Character, Story, StoryBlock } from '../../types';
import { findCharacterByWikiLabel } from '../../storage/storyStore';

type StoryContentProps = {
  story: Story;
  characters: Character[];
  onOpenCharacter: (characterId: string) => void;
};

export function StoryContent({ story, characters, onOpenCharacter }: StoryContentProps) {
  return (
    <article className="story-content">
      {story.blocks.map((block, index) => (
        <StoryBlockView
          block={block}
          characters={characters}
          index={index}
          key={block.id}
          onOpenCharacter={onOpenCharacter}
        />
      ))}
    </article>
  );
}

function StoryBlockView({
  block,
  characters,
  index,
  onOpenCharacter,
}: {
  block: StoryBlock;
  characters: Character[];
  index: number;
  onOpenCharacter: (characterId: string) => void;
}) {
  const blockStyle = { '--story-block-delay': `${Math.min(index * 55, 360)}ms` } as CSSProperties & Record<string, string>;

  if (block.type === 'image') {
    return (
      <figure className="story-image-block story-animated-block" style={blockStyle}>
        {block.imageUrl ? <img src={block.imageUrl} alt={block.caption || block.imageFileName || ''} /> : <div />}
        {block.caption ? (
          <figcaption>
            <WikiText value={block.caption} characters={characters} onOpenCharacter={onOpenCharacter} />
          </figcaption>
        ) : null}
      </figure>
    );
  }

  if (block.type === 'heading') {
    return (
      <h2 className="story-animated-block" style={blockStyle}>
        <WikiText value={block.text} characters={characters} onOpenCharacter={onOpenCharacter} />
      </h2>
    );
  }

  if (block.type === 'quote') {
    return (
      <blockquote className="story-animated-block" style={blockStyle}>
        <WikiText value={block.text} characters={characters} onOpenCharacter={onOpenCharacter} />
      </blockquote>
    );
  }

  return (
    <p className="story-animated-block" style={blockStyle}>
      <WikiText value={block.text} characters={characters} onOpenCharacter={onOpenCharacter} />
    </p>
  );
}

function WikiText({
  value,
  characters,
  onOpenCharacter,
}: {
  value: string;
  characters: Character[];
  onOpenCharacter: (characterId: string) => void;
}) {
  const parts = splitWikiText(value);

  return (
    <>
      {parts.map((part, index) => {
        if (!part.isLink) return <span key={`${index}-${part.text}`}>{part.text}</span>;
        const character = findCharacterByWikiLabel(characters, part.text);
        if (!character) return <span key={`${index}-${part.text}`}>[[{part.text}]]</span>;

        return (
          <button className="story-wiki-link" key={`${index}-${part.text}`} type="button" onClick={() => onOpenCharacter(character.id)}>
            {character.name || part.text}
          </button>
        );
      })}
    </>
  );
}

function splitWikiText(value: string): Array<{ isLink: boolean; text: string }> {
  const parts: Array<{ isLink: boolean; text: string }> = [];
  const pattern = /\[\[([^\]]+)\]\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value))) {
    if (match.index > lastIndex) parts.push({ isLink: false, text: value.slice(lastIndex, match.index) });
    parts.push({ isLink: true, text: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < value.length) parts.push({ isLink: false, text: value.slice(lastIndex) });
  return parts.length ? parts : [{ isLink: false, text: value }];
}
