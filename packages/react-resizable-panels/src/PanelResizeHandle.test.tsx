import { Root, createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import type { PanelResizeHandleProps } from "react-resizable-panels";
import { Panel, PanelGroup, PanelResizeHandle } from ".";
import { assert } from "./utils/assert";
import { getResizeHandleElement } from "./utils/dom/getResizeHandleElement";
import {
  dispatchPointerEvent,
  mockBoundingClientRect,
  verifyAttribute,
} from "./utils/test-utils";

describe("PanelResizeHandle", () => {
  let expectedWarnings: string[] = [];
  let root: Root;
  let container: HTMLElement;

  beforeEach(() => {
    // @ts-expect-error
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);

    expectedWarnings = [];
    root = createRoot(container);

    jest.spyOn(console, "warn").mockImplementation((actualMessage: string) => {
      const match = expectedWarnings.findIndex((expectedMessage) => {
        return actualMessage.includes(expectedMessage);
      });

      if (match >= 0) {
        expectedWarnings.splice(match, 1);
        return;
      }

      throw Error(`Unexpected warning: ${actualMessage}`);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    act(() => {
      root.unmount();
    });

    expect(expectedWarnings).toHaveLength(0);
  });

  it("should support ...rest attributes", () => {
    act(() => {
      root.render(
        <PanelGroup direction="horizontal">
          <Panel />
          <PanelResizeHandle
            data-test-name="foo"
            id="handle"
            tabIndex={123}
            title="bar"
          />
          <Panel />
        </PanelGroup>
      );
    });

    const element = getResizeHandleElement("handle", container);
    assert(element);
    expect(element.tabIndex).toBe(123);
    expect(element.getAttribute("data-test-name")).toBe("foo");
    expect(element.title).toBe("bar");
  });

  function setupMockedGroup({
    leftProps = {},
    rightProps = {},
  }: {
    leftProps?: Partial<PanelResizeHandleProps>;
    rightProps?: Partial<PanelResizeHandleProps>;
  } = {}) {
    act(() => {
      root.render(
        <PanelGroup direction="horizontal" id="test-group">
          <Panel />
          <PanelResizeHandle id="handle-left" tabIndex={1} {...leftProps} />
          <Panel />
          <PanelResizeHandle id="handle-right" tabIndex={2} {...rightProps} />
          <Panel />
        </PanelGroup>
      );
    });

    const leftElement = getResizeHandleElement("handle-left", container);
    const rightElement = getResizeHandleElement("handle-right", container);

    assert(leftElement);
    assert(rightElement);

    // JSDom doesn't properly handle bounding rects
    mockBoundingClientRect(leftElement, {
      x: 50,
      y: 0,
      height: 50,
      width: 2,
    });
    mockBoundingClientRect(rightElement, {
      x: 100,
      y: 0,
      height: 50,
      width: 2,
    });

    return {
      leftElement,
      rightElement,
    };
  }

  describe("callbacks", () => {
    describe("onDragging", () => {
      it("should fire when dragging starts/stops", () => {
        const onDragging = jest.fn();

        const { leftElement } = setupMockedGroup({
          leftProps: { onDragging },
        });

        act(() => {
          dispatchPointerEvent("mousemove", leftElement);
        });
        expect(onDragging).not.toHaveBeenCalled();

        act(() => {
          dispatchPointerEvent("mousedown", leftElement);
        });
        expect(onDragging).toHaveBeenCalledTimes(1);
        expect(onDragging).toHaveBeenCalledWith(true);

        act(() => {
          dispatchPointerEvent("mouseup", leftElement);
        });
        expect(onDragging).toHaveBeenCalledTimes(2);
        expect(onDragging).toHaveBeenCalledWith(false);
      });

      it("should only fire for the handle that has been dragged", () => {
        const onDraggingLeft = jest.fn();
        const onDraggingRight = jest.fn();

        const { leftElement } = setupMockedGroup({
          leftProps: { onDragging: onDraggingLeft },
          rightProps: { onDragging: onDraggingRight },
        });

        act(() => {
          dispatchPointerEvent("mousemove", leftElement);
        });
        expect(onDraggingLeft).not.toHaveBeenCalled();
        expect(onDraggingRight).not.toHaveBeenCalled();

        act(() => {
          dispatchPointerEvent("mousedown", leftElement);
        });
        expect(onDraggingLeft).toHaveBeenCalledTimes(1);
        expect(onDraggingLeft).toHaveBeenCalledWith(true);
        expect(onDraggingRight).not.toHaveBeenCalled();

        act(() => {
          dispatchPointerEvent("mouseup", leftElement);
        });
        expect(onDraggingLeft).toHaveBeenCalledTimes(2);
        expect(onDraggingLeft).toHaveBeenCalledWith(false);
        expect(onDraggingRight).not.toHaveBeenCalled();
      });
    });
  });

  describe("data attributes", () => {
    it("should initialize with the correct props based attributes", () => {
      const { leftElement, rightElement } = setupMockedGroup();

      verifyAttribute(leftElement, "data-panel-group-id", "test-group");
      verifyAttribute(leftElement, "data-resize-handle", "");
      verifyAttribute(leftElement, "data-panel-group-direction", "horizontal");
      verifyAttribute(leftElement, "data-panel-resize-handle-enabled", "true");
      verifyAttribute(
        leftElement,
        "data-panel-resize-handle-id",
        "handle-left"
      );

      verifyAttribute(rightElement, "data-panel-group-id", "test-group");
      verifyAttribute(rightElement, "data-resize-handle", "");
      verifyAttribute(rightElement, "data-panel-group-direction", "horizontal");
      verifyAttribute(rightElement, "data-panel-resize-handle-enabled", "true");
      verifyAttribute(
        rightElement,
        "data-panel-resize-handle-id",
        "handle-right"
      );
    });

    it("should update data-resize-handle-active and data-resize-handle-state when dragging starts/stops", () => {
      const { leftElement, rightElement } = setupMockedGroup();
      verifyAttribute(leftElement, "data-resize-handle-active", null);
      verifyAttribute(rightElement, "data-resize-handle-active", null);
      verifyAttribute(leftElement, "data-resize-handle-state", "inactive");
      verifyAttribute(rightElement, "data-resize-handle-state", "inactive");

      act(() => {
        dispatchPointerEvent("mousemove", leftElement);
      });
      verifyAttribute(leftElement, "data-resize-handle-active", null);
      verifyAttribute(rightElement, "data-resize-handle-active", null);
      verifyAttribute(leftElement, "data-resize-handle-state", "hover");
      verifyAttribute(rightElement, "data-resize-handle-state", "inactive");

      act(() => {
        dispatchPointerEvent("mousedown", leftElement);
      });
      verifyAttribute(leftElement, "data-resize-handle-active", "pointer");
      verifyAttribute(rightElement, "data-resize-handle-active", null);
      verifyAttribute(leftElement, "data-resize-handle-state", "drag");
      verifyAttribute(rightElement, "data-resize-handle-state", "inactive");

      act(() => {
        dispatchPointerEvent("mousemove", leftElement);
      });
      verifyAttribute(leftElement, "data-resize-handle-active", "pointer");
      verifyAttribute(rightElement, "data-resize-handle-active", null);
      verifyAttribute(leftElement, "data-resize-handle-state", "drag");
      verifyAttribute(rightElement, "data-resize-handle-state", "inactive");

      act(() => {
        dispatchPointerEvent("mouseup", leftElement);
      });
      verifyAttribute(leftElement, "data-resize-handle-active", null);
      verifyAttribute(rightElement, "data-resize-handle-active", null);
      verifyAttribute(leftElement, "data-resize-handle-state", "hover");
      verifyAttribute(rightElement, "data-resize-handle-state", "inactive");

      act(() => {
        dispatchPointerEvent("mousemove", rightElement);
      });
      verifyAttribute(leftElement, "data-resize-handle-active", null);
      verifyAttribute(rightElement, "data-resize-handle-active", null);
      verifyAttribute(leftElement, "data-resize-handle-state", "inactive");
      verifyAttribute(rightElement, "data-resize-handle-state", "hover");
    });

    it("should update data-resize-handle-active when focused", () => {
      const { leftElement, rightElement } = setupMockedGroup();
      verifyAttribute(leftElement, "data-resize-handle-active", null);
      verifyAttribute(rightElement, "data-resize-handle-active", null);

      act(() => {
        leftElement.focus();
      });
      expect(document.activeElement).toBe(leftElement);
      verifyAttribute(leftElement, "data-resize-handle-active", "keyboard");
      verifyAttribute(rightElement, "data-resize-handle-active", null);

      act(() => {
        leftElement.blur();
      });
      expect(document.activeElement).not.toBe(leftElement);
      verifyAttribute(leftElement, "data-resize-handle-active", null);
      verifyAttribute(rightElement, "data-resize-handle-active", null);
    });
  });
});
