import { useEffect, useState, type KeyboardEvent } from "react";

/**
 * Arrow-key/Enter/Escape navigation for a search dropdown list. The caller
 * wires `handleKeyDown` to the search Input's onKeyDown, and uses
 * `activeIndex` to highlight the corresponding row.
 */
export function useListKeyNav<T>(items: T[], onSelect: (item: T) => void, isDisabled?: (item: T) => boolean) {
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    setActiveIndex(items.length > 0 ? 0 : -1);
  }, [items]);

  function handleKeyDown(e: KeyboardEvent) {
    if (items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === "Enter") {
      if (activeIndex < 0 || activeIndex >= items.length) return;
      const item = items[activeIndex];
      if (isDisabled?.(item)) return;
      e.preventDefault();
      onSelect(item);
    } else if (e.key === "Escape") {
      setActiveIndex(-1);
    }
  }

  return { activeIndex, setActiveIndex, handleKeyDown };
}
