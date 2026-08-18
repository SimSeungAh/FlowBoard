interface StructuredDescriptionProps {
  description: string;
}

type DescriptionBlock =
  | {
      type: "heading";
      level: 1 | 2 | 3;
      text: string;
    }
  | {
      type: "paragraph";
      lines: string[];
    }
  | {
      type: "unordered-list";
      items: string[];
    }
  | {
      type: "ordered-list";
      items: string[];
    }
  | {
      type: "check-list";
      items: Array<{
        checked: boolean;
        text: string;
      }>;
    };

const headingPattern = /^(#{1,3})\s+(.+)$/;
const unorderedListPattern = /^-\s+(.+)$/;
const orderedListPattern = /^\d+\.\s+(.+)$/;
const checkListPattern = /^-\s+\[([ xX])\]\s+(.+)$/;

const isBlockStart = (line: string) => {
  const trimmed = line.trim();

  return (
    trimmed.length === 0 ||
    headingPattern.test(trimmed) ||
    checkListPattern.test(trimmed) ||
    unorderedListPattern.test(trimmed) ||
    orderedListPattern.test(trimmed)
  );
};

const parseDescription = (
  description: string,
): DescriptionBlock[] => {
  const lines = description
    .replace(/\r\n/g, "\n")
    .split("\n");

  const blocks: DescriptionBlock[] = [];

  let index = 0;

  while (index < lines.length) {
    const trimmed = lines[index].trim();

    if (trimmed.length === 0) {
      index += 1;
      continue;
    }

    const headingMatch =
      trimmed.match(headingPattern);

    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: Math.min(
          headingMatch[1].length,
          3,
        ) as 1 | 2 | 3,
        text: headingMatch[2].trim(),
      });

      index += 1;
      continue;
    }

    const checkListMatch =
      trimmed.match(checkListPattern);

    if (checkListMatch) {
      const items: Array<{
        checked: boolean;
        text: string;
      }> = [];

      while (index < lines.length) {
        const match = lines[index]
          .trim()
          .match(checkListPattern);

        if (!match) {
          break;
        }

        items.push({
          checked:
            match[1].toLowerCase() === "x",
          text: match[2].trim(),
        });

        index += 1;
      }

      blocks.push({
        type: "check-list",
        items,
      });

      continue;
    }

    const unorderedListMatch =
      trimmed.match(
        unorderedListPattern,
      );

    if (unorderedListMatch) {
      const items: string[] = [];

      while (index < lines.length) {
        const current =
          lines[index].trim();

        if (
          checkListPattern.test(
            current,
          )
        ) {
          break;
        }

        const match = current.match(
          unorderedListPattern,
        );

        if (!match) {
          break;
        }

        items.push(
          match[1].trim(),
        );

        index += 1;
      }

      blocks.push({
        type: "unordered-list",
        items,
      });

      continue;
    }

    const orderedListMatch =
      trimmed.match(
        orderedListPattern,
      );

    if (orderedListMatch) {
      const items: string[] = [];

      while (index < lines.length) {
        const match = lines[index]
          .trim()
          .match(
            orderedListPattern,
          );

        if (!match) {
          break;
        }

        items.push(
          match[1].trim(),
        );

        index += 1;
      }

      blocks.push({
        type: "ordered-list",
        items,
      });

      continue;
    }

    const paragraphLines:
      string[] = [];

    while (index < lines.length) {
      const current =
        lines[index];

      if (
        paragraphLines.length > 0 &&
        isBlockStart(current)
      ) {
        break;
      }

      if (
        current.trim().length === 0
      ) {
        break;
      }

      paragraphLines.push(
        current.trim(),
      );

      index += 1;
    }

    blocks.push({
      type: "paragraph",
      lines: paragraphLines,
    });
  }

  return blocks;
};

export default function StructuredDescription({
  description,
}: StructuredDescriptionProps) {
  const blocks =
    parseDescription(
      description,
    );

  return (
    <div className="space-y-4 text-[14px] leading-7 text-[var(--flow-text-secondary)]">
      {blocks.map(
        (
          block,
          blockIndex,
        ) => {
          const key =
            `${block.type}-${blockIndex}`;

          if (
            block.type ===
            "heading"
          ) {
            const headingClassName =
              block.level === 1
                ? "text-lg"
                : block.level === 2
                  ? "text-[15px]"
                  : "text-[14px]";

            return (
              <h4
                key={key}
                className={`${headingClassName} pt-1 font-bold leading-6 text-[var(--flow-text)]`}
              >
                {block.text}
              </h4>
            );
          }

          if (
            block.type ===
            "unordered-list"
          ) {
            return (
              <ul
                key={key}
                className="space-y-1 pl-5"
              >
                {block.items.map(
                  (
                    item,
                    itemIndex,
                  ) => (
                    <li
                      key={`${key}-${itemIndex}`}
                      className="list-disc break-words pl-1"
                    >
                      {item}
                    </li>
                  ),
                )}
              </ul>
            );
          }

          if (
            block.type ===
            "ordered-list"
          ) {
            return (
              <ol
                key={key}
                className="space-y-1 pl-5"
              >
                {block.items.map(
                  (
                    item,
                    itemIndex,
                  ) => (
                    <li
                      key={`${key}-${itemIndex}`}
                      className="list-decimal break-words pl-1"
                    >
                      {item}
                    </li>
                  ),
                )}
              </ol>
            );
          }

          if (
            block.type ===
            "check-list"
          ) {
            return (
              <ul
                key={key}
                className="space-y-2"
              >
                {block.items.map(
                  (
                    item,
                    itemIndex,
                  ) => (
                    <li
                      key={`${key}-${itemIndex}`}
                      className="flex items-start gap-2.5"
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-[5px] flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold ${
                          item.checked
                            ? "border-[var(--flow-primary)] bg-[var(--flow-primary)] text-white"
                            : "border-[var(--flow-border-strong)] bg-white text-transparent"
                        }`}
                      >
                        ✓
                      </span>

                      <span
                        className={`min-w-0 break-words ${
                          item.checked
                            ? "text-[var(--flow-text-muted)] line-through"
                            : ""
                        }`}
                      >
                        {item.text}
                      </span>
                    </li>
                  ),
                )}
              </ul>
            );
          }

          return (
            <p
              key={key}
              className="break-words whitespace-pre-wrap"
            >
              {block.lines.join(
                "\n",
              )}
            </p>
          );
        },
      )}
    </div>
  );
}