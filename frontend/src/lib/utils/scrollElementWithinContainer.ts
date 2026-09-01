type ScrollBlock = "start" | "center" | "nearest";

type ScrollElementWithinContainerOptions = {
  block?: ScrollBlock;
  behavior?: ScrollBehavior;
};

export function scrollElementWithinContainer(
  container: HTMLElement,
  element: HTMLElement,
  options: ScrollElementWithinContainerOptions = {},
): void {
  const block = options.block ?? "start";
  const behavior = options.behavior ?? "smooth";

  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const elementTop = elementRect.top - containerRect.top + container.scrollTop;
  const elementBottom = elementTop + element.offsetHeight;

  let nextScrollTop = container.scrollTop;

  if (block === "start") {
    nextScrollTop = elementTop;
  } else if (block === "center") {
    nextScrollTop = elementTop - (container.clientHeight - element.offsetHeight) / 2;
  } else if (elementRect.top < containerRect.top) {
    nextScrollTop = elementTop;
  } else if (elementRect.bottom > containerRect.bottom) {
    nextScrollTop = elementBottom - container.clientHeight;
  } else {
    return;
  }

  const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
  const clampedTop = Math.min(Math.max(0, nextScrollTop), maxScrollTop);

  if (typeof container.scrollTo === "function") {
    container.scrollTo({
      top: clampedTop,
      behavior,
    });
    return;
  }

  container.scrollTop = clampedTop;
}
