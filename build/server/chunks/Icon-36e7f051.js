import { r as readable, d as derived, w as writable, a as readonly } from './index2-c5c18f89.js';
import { s as setContext, j as getContext, c as create_ssr_component, d as compute_rest_props, g as spread, i as escape_object, h as escape_attribute_value, a as each, o as onDestroy, l as get_store_value, n as set_current_component, r as run_all, p as current_component } from './ssr-3edfa391.js';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

let urlAlphabet =
  'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';
let nanoid = (size = 21) => {
  let id = '';
  let i = size;
  while (i--) {
    id += urlAlphabet[(Math.random() * 64) | 0];
  }
  return id
};

const min = Math.min;
const max = Math.max;
const round = Math.round;
const floor = Math.floor;
const createCoords = v => ({
  x: v,
  y: v
});
const oppositeSideMap = {
  left: 'right',
  right: 'left',
  bottom: 'top',
  top: 'bottom'
};
const oppositeAlignmentMap = {
  start: 'end',
  end: 'start'
};
function clamp(start, value, end) {
  return max(start, min(value, end));
}
function evaluate(value, param) {
  return typeof value === 'function' ? value(param) : value;
}
function getSide(placement) {
  return placement.split('-')[0];
}
function getAlignment(placement) {
  return placement.split('-')[1];
}
function getOppositeAxis(axis) {
  return axis === 'x' ? 'y' : 'x';
}
function getAxisLength(axis) {
  return axis === 'y' ? 'height' : 'width';
}
function getSideAxis(placement) {
  return ['top', 'bottom'].includes(getSide(placement)) ? 'y' : 'x';
}
function getAlignmentAxis(placement) {
  return getOppositeAxis(getSideAxis(placement));
}
function getAlignmentSides(placement, rects, rtl) {
  if (rtl === void 0) {
    rtl = false;
  }
  const alignment = getAlignment(placement);
  const alignmentAxis = getAlignmentAxis(placement);
  const length = getAxisLength(alignmentAxis);
  let mainAlignmentSide = alignmentAxis === 'x' ? alignment === (rtl ? 'end' : 'start') ? 'right' : 'left' : alignment === 'start' ? 'bottom' : 'top';
  if (rects.reference[length] > rects.floating[length]) {
    mainAlignmentSide = getOppositePlacement(mainAlignmentSide);
  }
  return [mainAlignmentSide, getOppositePlacement(mainAlignmentSide)];
}
function getExpandedPlacements(placement) {
  const oppositePlacement = getOppositePlacement(placement);
  return [getOppositeAlignmentPlacement(placement), oppositePlacement, getOppositeAlignmentPlacement(oppositePlacement)];
}
function getOppositeAlignmentPlacement(placement) {
  return placement.replace(/start|end/g, alignment => oppositeAlignmentMap[alignment]);
}
function getSideList(side, isStart, rtl) {
  const lr = ['left', 'right'];
  const rl = ['right', 'left'];
  const tb = ['top', 'bottom'];
  const bt = ['bottom', 'top'];
  switch (side) {
    case 'top':
    case 'bottom':
      if (rtl) return isStart ? rl : lr;
      return isStart ? lr : rl;
    case 'left':
    case 'right':
      return isStart ? tb : bt;
    default:
      return [];
  }
}
function getOppositeAxisPlacements(placement, flipAlignment, direction, rtl) {
  const alignment = getAlignment(placement);
  let list = getSideList(getSide(placement), direction === 'start', rtl);
  if (alignment) {
    list = list.map(side => side + "-" + alignment);
    if (flipAlignment) {
      list = list.concat(list.map(getOppositeAlignmentPlacement));
    }
  }
  return list;
}
function getOppositePlacement(placement) {
  return placement.replace(/left|right|bottom|top/g, side => oppositeSideMap[side]);
}
function expandPaddingObject(padding) {
  return {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    ...padding
  };
}
function getPaddingObject(padding) {
  return typeof padding !== 'number' ? expandPaddingObject(padding) : {
    top: padding,
    right: padding,
    bottom: padding,
    left: padding
  };
}
function rectToClientRect(rect) {
  return {
    ...rect,
    top: rect.y,
    left: rect.x,
    right: rect.x + rect.width,
    bottom: rect.y + rect.height
  };
}

function computeCoordsFromPlacement(_ref, placement, rtl) {
  let {
    reference,
    floating
  } = _ref;
  const sideAxis = getSideAxis(placement);
  const alignmentAxis = getAlignmentAxis(placement);
  const alignLength = getAxisLength(alignmentAxis);
  const side = getSide(placement);
  const isVertical = sideAxis === 'y';
  const commonX = reference.x + reference.width / 2 - floating.width / 2;
  const commonY = reference.y + reference.height / 2 - floating.height / 2;
  const commonAlign = reference[alignLength] / 2 - floating[alignLength] / 2;
  let coords;
  switch (side) {
    case 'top':
      coords = {
        x: commonX,
        y: reference.y - floating.height
      };
      break;
    case 'bottom':
      coords = {
        x: commonX,
        y: reference.y + reference.height
      };
      break;
    case 'right':
      coords = {
        x: reference.x + reference.width,
        y: commonY
      };
      break;
    case 'left':
      coords = {
        x: reference.x - floating.width,
        y: commonY
      };
      break;
    default:
      coords = {
        x: reference.x,
        y: reference.y
      };
  }
  switch (getAlignment(placement)) {
    case 'start':
      coords[alignmentAxis] -= commonAlign * (rtl && isVertical ? -1 : 1);
      break;
    case 'end':
      coords[alignmentAxis] += commonAlign * (rtl && isVertical ? -1 : 1);
      break;
  }
  return coords;
}

/**
 * Computes the `x` and `y` coordinates that will place the floating element
 * next to a reference element when it is given a certain positioning strategy.
 *
 * This export does not have any `platform` interface logic. You will need to
 * write one for the platform you are using Floating UI with.
 */
const computePosition$1 = async (reference, floating, config) => {
  const {
    placement = 'bottom',
    strategy = 'absolute',
    middleware = [],
    platform
  } = config;
  const validMiddleware = middleware.filter(Boolean);
  const rtl = await (platform.isRTL == null ? void 0 : platform.isRTL(floating));
  let rects = await platform.getElementRects({
    reference,
    floating,
    strategy
  });
  let {
    x,
    y
  } = computeCoordsFromPlacement(rects, placement, rtl);
  let statefulPlacement = placement;
  let middlewareData = {};
  let resetCount = 0;
  for (let i = 0; i < validMiddleware.length; i++) {
    const {
      name,
      fn
    } = validMiddleware[i];
    const {
      x: nextX,
      y: nextY,
      data,
      reset
    } = await fn({
      x,
      y,
      initialPlacement: placement,
      placement: statefulPlacement,
      strategy,
      middlewareData,
      rects,
      platform,
      elements: {
        reference,
        floating
      }
    });
    x = nextX != null ? nextX : x;
    y = nextY != null ? nextY : y;
    middlewareData = {
      ...middlewareData,
      [name]: {
        ...middlewareData[name],
        ...data
      }
    };
    if (reset && resetCount <= 50) {
      resetCount++;
      if (typeof reset === 'object') {
        if (reset.placement) {
          statefulPlacement = reset.placement;
        }
        if (reset.rects) {
          rects = reset.rects === true ? await platform.getElementRects({
            reference,
            floating,
            strategy
          }) : reset.rects;
        }
        ({
          x,
          y
        } = computeCoordsFromPlacement(rects, statefulPlacement, rtl));
      }
      i = -1;
      continue;
    }
  }
  return {
    x,
    y,
    placement: statefulPlacement,
    strategy,
    middlewareData
  };
};

/**
 * Resolves with an object of overflow side offsets that determine how much the
 * element is overflowing a given clipping boundary on each side.
 * - positive = overflowing the boundary by that number of pixels
 * - negative = how many pixels left before it will overflow
 * - 0 = lies flush with the boundary
 * @see https://floating-ui.com/docs/detectOverflow
 */
async function detectOverflow(state, options) {
  var _await$platform$isEle;
  if (options === void 0) {
    options = {};
  }
  const {
    x,
    y,
    platform,
    rects,
    elements,
    strategy
  } = state;
  const {
    boundary = 'clippingAncestors',
    rootBoundary = 'viewport',
    elementContext = 'floating',
    altBoundary = false,
    padding = 0
  } = evaluate(options, state);
  const paddingObject = getPaddingObject(padding);
  const altContext = elementContext === 'floating' ? 'reference' : 'floating';
  const element = elements[altBoundary ? altContext : elementContext];
  const clippingClientRect = rectToClientRect(await platform.getClippingRect({
    element: ((_await$platform$isEle = await (platform.isElement == null ? void 0 : platform.isElement(element))) != null ? _await$platform$isEle : true) ? element : element.contextElement || (await (platform.getDocumentElement == null ? void 0 : platform.getDocumentElement(elements.floating))),
    boundary,
    rootBoundary,
    strategy
  }));
  const rect = elementContext === 'floating' ? {
    ...rects.floating,
    x,
    y
  } : rects.reference;
  const offsetParent = await (platform.getOffsetParent == null ? void 0 : platform.getOffsetParent(elements.floating));
  const offsetScale = (await (platform.isElement == null ? void 0 : platform.isElement(offsetParent))) ? (await (platform.getScale == null ? void 0 : platform.getScale(offsetParent))) || {
    x: 1,
    y: 1
  } : {
    x: 1,
    y: 1
  };
  const elementClientRect = rectToClientRect(platform.convertOffsetParentRelativeRectToViewportRelativeRect ? await platform.convertOffsetParentRelativeRectToViewportRelativeRect({
    rect,
    offsetParent,
    strategy
  }) : rect);
  return {
    top: (clippingClientRect.top - elementClientRect.top + paddingObject.top) / offsetScale.y,
    bottom: (elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom) / offsetScale.y,
    left: (clippingClientRect.left - elementClientRect.left + paddingObject.left) / offsetScale.x,
    right: (elementClientRect.right - clippingClientRect.right + paddingObject.right) / offsetScale.x
  };
}

/**
 * Provides data to position an inner element of the floating element so that it
 * appears centered to the reference element.
 * @see https://floating-ui.com/docs/arrow
 */
const arrow = options => ({
  name: 'arrow',
  options,
  async fn(state) {
    const {
      x,
      y,
      placement,
      rects,
      platform,
      elements,
      middlewareData
    } = state;
    // Since `element` is required, we don't Partial<> the type.
    const {
      element,
      padding = 0
    } = evaluate(options, state) || {};
    if (element == null) {
      return {};
    }
    const paddingObject = getPaddingObject(padding);
    const coords = {
      x,
      y
    };
    const axis = getAlignmentAxis(placement);
    const length = getAxisLength(axis);
    const arrowDimensions = await platform.getDimensions(element);
    const isYAxis = axis === 'y';
    const minProp = isYAxis ? 'top' : 'left';
    const maxProp = isYAxis ? 'bottom' : 'right';
    const clientProp = isYAxis ? 'clientHeight' : 'clientWidth';
    const endDiff = rects.reference[length] + rects.reference[axis] - coords[axis] - rects.floating[length];
    const startDiff = coords[axis] - rects.reference[axis];
    const arrowOffsetParent = await (platform.getOffsetParent == null ? void 0 : platform.getOffsetParent(element));
    let clientSize = arrowOffsetParent ? arrowOffsetParent[clientProp] : 0;

    // DOM platform can return `window` as the `offsetParent`.
    if (!clientSize || !(await (platform.isElement == null ? void 0 : platform.isElement(arrowOffsetParent)))) {
      clientSize = elements.floating[clientProp] || rects.floating[length];
    }
    const centerToReference = endDiff / 2 - startDiff / 2;

    // If the padding is large enough that it causes the arrow to no longer be
    // centered, modify the padding so that it is centered.
    const largestPossiblePadding = clientSize / 2 - arrowDimensions[length] / 2 - 1;
    const minPadding = min(paddingObject[minProp], largestPossiblePadding);
    const maxPadding = min(paddingObject[maxProp], largestPossiblePadding);

    // Make sure the arrow doesn't overflow the floating element if the center
    // point is outside the floating element's bounds.
    const min$1 = minPadding;
    const max = clientSize - arrowDimensions[length] - maxPadding;
    const center = clientSize / 2 - arrowDimensions[length] / 2 + centerToReference;
    const offset = clamp(min$1, center, max);

    // If the reference is small enough that the arrow's padding causes it to
    // to point to nothing for an aligned placement, adjust the offset of the
    // floating element itself. To ensure `shift()` continues to take action,
    // a single reset is performed when this is true.
    const shouldAddOffset = !middlewareData.arrow && getAlignment(placement) != null && center != offset && rects.reference[length] / 2 - (center < min$1 ? minPadding : maxPadding) - arrowDimensions[length] / 2 < 0;
    const alignmentOffset = shouldAddOffset ? center < min$1 ? center - min$1 : center - max : 0;
    return {
      [axis]: coords[axis] + alignmentOffset,
      data: {
        [axis]: offset,
        centerOffset: center - offset - alignmentOffset,
        ...(shouldAddOffset && {
          alignmentOffset
        })
      },
      reset: shouldAddOffset
    };
  }
});

/**
 * Optimizes the visibility of the floating element by flipping the `placement`
 * in order to keep it in view when the preferred placement(s) will overflow the
 * clipping boundary. Alternative to `autoPlacement`.
 * @see https://floating-ui.com/docs/flip
 */
const flip = function (options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: 'flip',
    options,
    async fn(state) {
      var _middlewareData$arrow, _middlewareData$flip;
      const {
        placement,
        middlewareData,
        rects,
        initialPlacement,
        platform,
        elements
      } = state;
      const {
        mainAxis: checkMainAxis = true,
        crossAxis: checkCrossAxis = true,
        fallbackPlacements: specifiedFallbackPlacements,
        fallbackStrategy = 'bestFit',
        fallbackAxisSideDirection = 'none',
        flipAlignment = true,
        ...detectOverflowOptions
      } = evaluate(options, state);

      // If a reset by the arrow was caused due to an alignment offset being
      // added, we should skip any logic now since `flip()` has already done its
      // work.
      // https://github.com/floating-ui/floating-ui/issues/2549#issuecomment-1719601643
      if ((_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) {
        return {};
      }
      const side = getSide(placement);
      const isBasePlacement = getSide(initialPlacement) === initialPlacement;
      const rtl = await (platform.isRTL == null ? void 0 : platform.isRTL(elements.floating));
      const fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipAlignment ? [getOppositePlacement(initialPlacement)] : getExpandedPlacements(initialPlacement));
      if (!specifiedFallbackPlacements && fallbackAxisSideDirection !== 'none') {
        fallbackPlacements.push(...getOppositeAxisPlacements(initialPlacement, flipAlignment, fallbackAxisSideDirection, rtl));
      }
      const placements = [initialPlacement, ...fallbackPlacements];
      const overflow = await detectOverflow(state, detectOverflowOptions);
      const overflows = [];
      let overflowsData = ((_middlewareData$flip = middlewareData.flip) == null ? void 0 : _middlewareData$flip.overflows) || [];
      if (checkMainAxis) {
        overflows.push(overflow[side]);
      }
      if (checkCrossAxis) {
        const sides = getAlignmentSides(placement, rects, rtl);
        overflows.push(overflow[sides[0]], overflow[sides[1]]);
      }
      overflowsData = [...overflowsData, {
        placement,
        overflows
      }];

      // One or more sides is overflowing.
      if (!overflows.every(side => side <= 0)) {
        var _middlewareData$flip2, _overflowsData$filter;
        const nextIndex = (((_middlewareData$flip2 = middlewareData.flip) == null ? void 0 : _middlewareData$flip2.index) || 0) + 1;
        const nextPlacement = placements[nextIndex];
        if (nextPlacement) {
          // Try next placement and re-run the lifecycle.
          return {
            data: {
              index: nextIndex,
              overflows: overflowsData
            },
            reset: {
              placement: nextPlacement
            }
          };
        }

        // First, find the candidates that fit on the mainAxis side of overflow,
        // then find the placement that fits the best on the main crossAxis side.
        let resetPlacement = (_overflowsData$filter = overflowsData.filter(d => d.overflows[0] <= 0).sort((a, b) => a.overflows[1] - b.overflows[1])[0]) == null ? void 0 : _overflowsData$filter.placement;

        // Otherwise fallback.
        if (!resetPlacement) {
          switch (fallbackStrategy) {
            case 'bestFit':
              {
                var _overflowsData$map$so;
                const placement = (_overflowsData$map$so = overflowsData.map(d => [d.placement, d.overflows.filter(overflow => overflow > 0).reduce((acc, overflow) => acc + overflow, 0)]).sort((a, b) => a[1] - b[1])[0]) == null ? void 0 : _overflowsData$map$so[0];
                if (placement) {
                  resetPlacement = placement;
                }
                break;
              }
            case 'initialPlacement':
              resetPlacement = initialPlacement;
              break;
          }
        }
        if (placement !== resetPlacement) {
          return {
            reset: {
              placement: resetPlacement
            }
          };
        }
      }
      return {};
    }
  };
};

// For type backwards-compatibility, the `OffsetOptions` type was also
// Derivable.
async function convertValueToCoords(state, options) {
  const {
    placement,
    platform,
    elements
  } = state;
  const rtl = await (platform.isRTL == null ? void 0 : platform.isRTL(elements.floating));
  const side = getSide(placement);
  const alignment = getAlignment(placement);
  const isVertical = getSideAxis(placement) === 'y';
  const mainAxisMulti = ['left', 'top'].includes(side) ? -1 : 1;
  const crossAxisMulti = rtl && isVertical ? -1 : 1;
  const rawValue = evaluate(options, state);

  // eslint-disable-next-line prefer-const
  let {
    mainAxis,
    crossAxis,
    alignmentAxis
  } = typeof rawValue === 'number' ? {
    mainAxis: rawValue,
    crossAxis: 0,
    alignmentAxis: null
  } : {
    mainAxis: 0,
    crossAxis: 0,
    alignmentAxis: null,
    ...rawValue
  };
  if (alignment && typeof alignmentAxis === 'number') {
    crossAxis = alignment === 'end' ? alignmentAxis * -1 : alignmentAxis;
  }
  return isVertical ? {
    x: crossAxis * crossAxisMulti,
    y: mainAxis * mainAxisMulti
  } : {
    x: mainAxis * mainAxisMulti,
    y: crossAxis * crossAxisMulti
  };
}

/**
 * Modifies the placement by translating the floating element along the
 * specified axes.
 * A number (shorthand for `mainAxis` or distance), or an axes configuration
 * object may be passed.
 * @see https://floating-ui.com/docs/offset
 */
const offset = function (options) {
  if (options === void 0) {
    options = 0;
  }
  return {
    name: 'offset',
    options,
    async fn(state) {
      var _middlewareData$offse, _middlewareData$arrow;
      const {
        x,
        y,
        placement,
        middlewareData
      } = state;
      const diffCoords = await convertValueToCoords(state, options);

      // If the placement is the same and the arrow caused an alignment offset
      // then we don't need to change the positioning coordinates.
      if (placement === ((_middlewareData$offse = middlewareData.offset) == null ? void 0 : _middlewareData$offse.placement) && (_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) {
        return {};
      }
      return {
        x: x + diffCoords.x,
        y: y + diffCoords.y,
        data: {
          ...diffCoords,
          placement
        }
      };
    }
  };
};

/**
 * Optimizes the visibility of the floating element by shifting it in order to
 * keep it in view when it will overflow the clipping boundary.
 * @see https://floating-ui.com/docs/shift
 */
const shift = function (options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: 'shift',
    options,
    async fn(state) {
      const {
        x,
        y,
        placement
      } = state;
      const {
        mainAxis: checkMainAxis = true,
        crossAxis: checkCrossAxis = false,
        limiter = {
          fn: _ref => {
            let {
              x,
              y
            } = _ref;
            return {
              x,
              y
            };
          }
        },
        ...detectOverflowOptions
      } = evaluate(options, state);
      const coords = {
        x,
        y
      };
      const overflow = await detectOverflow(state, detectOverflowOptions);
      const crossAxis = getSideAxis(getSide(placement));
      const mainAxis = getOppositeAxis(crossAxis);
      let mainAxisCoord = coords[mainAxis];
      let crossAxisCoord = coords[crossAxis];
      if (checkMainAxis) {
        const minSide = mainAxis === 'y' ? 'top' : 'left';
        const maxSide = mainAxis === 'y' ? 'bottom' : 'right';
        const min = mainAxisCoord + overflow[minSide];
        const max = mainAxisCoord - overflow[maxSide];
        mainAxisCoord = clamp(min, mainAxisCoord, max);
      }
      if (checkCrossAxis) {
        const minSide = crossAxis === 'y' ? 'top' : 'left';
        const maxSide = crossAxis === 'y' ? 'bottom' : 'right';
        const min = crossAxisCoord + overflow[minSide];
        const max = crossAxisCoord - overflow[maxSide];
        crossAxisCoord = clamp(min, crossAxisCoord, max);
      }
      const limitedCoords = limiter.fn({
        ...state,
        [mainAxis]: mainAxisCoord,
        [crossAxis]: crossAxisCoord
      });
      return {
        ...limitedCoords,
        data: {
          x: limitedCoords.x - x,
          y: limitedCoords.y - y
        }
      };
    }
  };
};

/**
 * Provides data that allows you to change the size of the floating element —
 * for instance, prevent it from overflowing the clipping boundary or match the
 * width of the reference element.
 * @see https://floating-ui.com/docs/size
 */
const size = function (options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: 'size',
    options,
    async fn(state) {
      const {
        placement,
        rects,
        platform,
        elements
      } = state;
      const {
        apply = () => {},
        ...detectOverflowOptions
      } = evaluate(options, state);
      const overflow = await detectOverflow(state, detectOverflowOptions);
      const side = getSide(placement);
      const alignment = getAlignment(placement);
      const isYAxis = getSideAxis(placement) === 'y';
      const {
        width,
        height
      } = rects.floating;
      let heightSide;
      let widthSide;
      if (side === 'top' || side === 'bottom') {
        heightSide = side;
        widthSide = alignment === ((await (platform.isRTL == null ? void 0 : platform.isRTL(elements.floating))) ? 'start' : 'end') ? 'left' : 'right';
      } else {
        widthSide = side;
        heightSide = alignment === 'end' ? 'top' : 'bottom';
      }
      const overflowAvailableHeight = height - overflow[heightSide];
      const overflowAvailableWidth = width - overflow[widthSide];
      const noShift = !state.middlewareData.shift;
      let availableHeight = overflowAvailableHeight;
      let availableWidth = overflowAvailableWidth;
      if (isYAxis) {
        const maximumClippingWidth = width - overflow.left - overflow.right;
        availableWidth = alignment || noShift ? min(overflowAvailableWidth, maximumClippingWidth) : maximumClippingWidth;
      } else {
        const maximumClippingHeight = height - overflow.top - overflow.bottom;
        availableHeight = alignment || noShift ? min(overflowAvailableHeight, maximumClippingHeight) : maximumClippingHeight;
      }
      if (noShift && !alignment) {
        const xMin = max(overflow.left, 0);
        const xMax = max(overflow.right, 0);
        const yMin = max(overflow.top, 0);
        const yMax = max(overflow.bottom, 0);
        if (isYAxis) {
          availableWidth = width - 2 * (xMin !== 0 || xMax !== 0 ? xMin + xMax : max(overflow.left, overflow.right));
        } else {
          availableHeight = height - 2 * (yMin !== 0 || yMax !== 0 ? yMin + yMax : max(overflow.top, overflow.bottom));
        }
      }
      await apply({
        ...state,
        availableWidth,
        availableHeight
      });
      const nextDimensions = await platform.getDimensions(elements.floating);
      if (width !== nextDimensions.width || height !== nextDimensions.height) {
        return {
          reset: {
            rects: true
          }
        };
      }
      return {};
    }
  };
};

function getNodeName(node) {
  if (isNode(node)) {
    return (node.nodeName || '').toLowerCase();
  }
  // Mocked nodes in testing environments may not be instances of Node. By
  // returning `#document` an infinite loop won't occur.
  // https://github.com/floating-ui/floating-ui/issues/2317
  return '#document';
}
function getWindow(node) {
  var _node$ownerDocument;
  return (node == null ? void 0 : (_node$ownerDocument = node.ownerDocument) == null ? void 0 : _node$ownerDocument.defaultView) || window;
}
function getDocumentElement(node) {
  var _ref;
  return (_ref = (isNode(node) ? node.ownerDocument : node.document) || window.document) == null ? void 0 : _ref.documentElement;
}
function isNode(value) {
  return value instanceof Node || value instanceof getWindow(value).Node;
}
function isElement(value) {
  return value instanceof Element || value instanceof getWindow(value).Element;
}
function isHTMLElement$1(value) {
  return value instanceof HTMLElement || value instanceof getWindow(value).HTMLElement;
}
function isShadowRoot(value) {
  // Browsers without `ShadowRoot` support.
  if (typeof ShadowRoot === 'undefined') {
    return false;
  }
  return value instanceof ShadowRoot || value instanceof getWindow(value).ShadowRoot;
}
function isOverflowElement(element) {
  const {
    overflow,
    overflowX,
    overflowY,
    display
  } = getComputedStyle$1(element);
  return /auto|scroll|overlay|hidden|clip/.test(overflow + overflowY + overflowX) && !['inline', 'contents'].includes(display);
}
function isTableElement(element) {
  return ['table', 'td', 'th'].includes(getNodeName(element));
}
function isContainingBlock(element) {
  const webkit = isWebKit();
  const css = getComputedStyle$1(element);

  // https://developer.mozilla.org/en-US/docs/Web/CSS/Containing_block#identifying_the_containing_block
  return css.transform !== 'none' || css.perspective !== 'none' || (css.containerType ? css.containerType !== 'normal' : false) || !webkit && (css.backdropFilter ? css.backdropFilter !== 'none' : false) || !webkit && (css.filter ? css.filter !== 'none' : false) || ['transform', 'perspective', 'filter'].some(value => (css.willChange || '').includes(value)) || ['paint', 'layout', 'strict', 'content'].some(value => (css.contain || '').includes(value));
}
function getContainingBlock(element) {
  let currentNode = getParentNode(element);
  while (isHTMLElement$1(currentNode) && !isLastTraversableNode(currentNode)) {
    if (isContainingBlock(currentNode)) {
      return currentNode;
    } else {
      currentNode = getParentNode(currentNode);
    }
  }
  return null;
}
function isWebKit() {
  if (typeof CSS === 'undefined' || !CSS.supports) return false;
  return CSS.supports('-webkit-backdrop-filter', 'none');
}
function isLastTraversableNode(node) {
  return ['html', 'body', '#document'].includes(getNodeName(node));
}
function getComputedStyle$1(element) {
  return getWindow(element).getComputedStyle(element);
}
function getNodeScroll(element) {
  if (isElement(element)) {
    return {
      scrollLeft: element.scrollLeft,
      scrollTop: element.scrollTop
    };
  }
  return {
    scrollLeft: element.pageXOffset,
    scrollTop: element.pageYOffset
  };
}
function getParentNode(node) {
  if (getNodeName(node) === 'html') {
    return node;
  }
  const result =
  // Step into the shadow DOM of the parent of a slotted node.
  node.assignedSlot ||
  // DOM Element detected.
  node.parentNode ||
  // ShadowRoot detected.
  isShadowRoot(node) && node.host ||
  // Fallback.
  getDocumentElement(node);
  return isShadowRoot(result) ? result.host : result;
}
function getNearestOverflowAncestor(node) {
  const parentNode = getParentNode(node);
  if (isLastTraversableNode(parentNode)) {
    return node.ownerDocument ? node.ownerDocument.body : node.body;
  }
  if (isHTMLElement$1(parentNode) && isOverflowElement(parentNode)) {
    return parentNode;
  }
  return getNearestOverflowAncestor(parentNode);
}
function getOverflowAncestors(node, list, traverseIframes) {
  var _node$ownerDocument2;
  if (list === void 0) {
    list = [];
  }
  if (traverseIframes === void 0) {
    traverseIframes = true;
  }
  const scrollableAncestor = getNearestOverflowAncestor(node);
  const isBody = scrollableAncestor === ((_node$ownerDocument2 = node.ownerDocument) == null ? void 0 : _node$ownerDocument2.body);
  const win = getWindow(scrollableAncestor);
  if (isBody) {
    return list.concat(win, win.visualViewport || [], isOverflowElement(scrollableAncestor) ? scrollableAncestor : [], win.frameElement && traverseIframes ? getOverflowAncestors(win.frameElement) : []);
  }
  return list.concat(scrollableAncestor, getOverflowAncestors(scrollableAncestor, [], traverseIframes));
}

function getCssDimensions(element) {
  const css = getComputedStyle$1(element);
  // In testing environments, the `width` and `height` properties are empty
  // strings for SVG elements, returning NaN. Fallback to `0` in this case.
  let width = parseFloat(css.width) || 0;
  let height = parseFloat(css.height) || 0;
  const hasOffset = isHTMLElement$1(element);
  const offsetWidth = hasOffset ? element.offsetWidth : width;
  const offsetHeight = hasOffset ? element.offsetHeight : height;
  const shouldFallback = round(width) !== offsetWidth || round(height) !== offsetHeight;
  if (shouldFallback) {
    width = offsetWidth;
    height = offsetHeight;
  }
  return {
    width,
    height,
    $: shouldFallback
  };
}

function unwrapElement(element) {
  return !isElement(element) ? element.contextElement : element;
}

function getScale(element) {
  const domElement = unwrapElement(element);
  if (!isHTMLElement$1(domElement)) {
    return createCoords(1);
  }
  const rect = domElement.getBoundingClientRect();
  const {
    width,
    height,
    $
  } = getCssDimensions(domElement);
  let x = ($ ? round(rect.width) : rect.width) / width;
  let y = ($ ? round(rect.height) : rect.height) / height;

  // 0, NaN, or Infinity should always fallback to 1.

  if (!x || !Number.isFinite(x)) {
    x = 1;
  }
  if (!y || !Number.isFinite(y)) {
    y = 1;
  }
  return {
    x,
    y
  };
}

const noOffsets = /*#__PURE__*/createCoords(0);
function getVisualOffsets(element) {
  const win = getWindow(element);
  if (!isWebKit() || !win.visualViewport) {
    return noOffsets;
  }
  return {
    x: win.visualViewport.offsetLeft,
    y: win.visualViewport.offsetTop
  };
}
function shouldAddVisualOffsets(element, isFixed, floatingOffsetParent) {
  if (isFixed === void 0) {
    isFixed = false;
  }
  if (!floatingOffsetParent || isFixed && floatingOffsetParent !== getWindow(element)) {
    return false;
  }
  return isFixed;
}

function getBoundingClientRect(element, includeScale, isFixedStrategy, offsetParent) {
  if (includeScale === void 0) {
    includeScale = false;
  }
  if (isFixedStrategy === void 0) {
    isFixedStrategy = false;
  }
  const clientRect = element.getBoundingClientRect();
  const domElement = unwrapElement(element);
  let scale = createCoords(1);
  if (includeScale) {
    if (offsetParent) {
      if (isElement(offsetParent)) {
        scale = getScale(offsetParent);
      }
    } else {
      scale = getScale(element);
    }
  }
  const visualOffsets = shouldAddVisualOffsets(domElement, isFixedStrategy, offsetParent) ? getVisualOffsets(domElement) : createCoords(0);
  let x = (clientRect.left + visualOffsets.x) / scale.x;
  let y = (clientRect.top + visualOffsets.y) / scale.y;
  let width = clientRect.width / scale.x;
  let height = clientRect.height / scale.y;
  if (domElement) {
    const win = getWindow(domElement);
    const offsetWin = offsetParent && isElement(offsetParent) ? getWindow(offsetParent) : offsetParent;
    let currentIFrame = win.frameElement;
    while (currentIFrame && offsetParent && offsetWin !== win) {
      const iframeScale = getScale(currentIFrame);
      const iframeRect = currentIFrame.getBoundingClientRect();
      const css = getComputedStyle$1(currentIFrame);
      const left = iframeRect.left + (currentIFrame.clientLeft + parseFloat(css.paddingLeft)) * iframeScale.x;
      const top = iframeRect.top + (currentIFrame.clientTop + parseFloat(css.paddingTop)) * iframeScale.y;
      x *= iframeScale.x;
      y *= iframeScale.y;
      width *= iframeScale.x;
      height *= iframeScale.y;
      x += left;
      y += top;
      currentIFrame = getWindow(currentIFrame).frameElement;
    }
  }
  return rectToClientRect({
    width,
    height,
    x,
    y
  });
}

function convertOffsetParentRelativeRectToViewportRelativeRect(_ref) {
  let {
    rect,
    offsetParent,
    strategy
  } = _ref;
  const isOffsetParentAnElement = isHTMLElement$1(offsetParent);
  const documentElement = getDocumentElement(offsetParent);
  if (offsetParent === documentElement) {
    return rect;
  }
  let scroll = {
    scrollLeft: 0,
    scrollTop: 0
  };
  let scale = createCoords(1);
  const offsets = createCoords(0);
  if (isOffsetParentAnElement || !isOffsetParentAnElement && strategy !== 'fixed') {
    if (getNodeName(offsetParent) !== 'body' || isOverflowElement(documentElement)) {
      scroll = getNodeScroll(offsetParent);
    }
    if (isHTMLElement$1(offsetParent)) {
      const offsetRect = getBoundingClientRect(offsetParent);
      scale = getScale(offsetParent);
      offsets.x = offsetRect.x + offsetParent.clientLeft;
      offsets.y = offsetRect.y + offsetParent.clientTop;
    }
  }
  return {
    width: rect.width * scale.x,
    height: rect.height * scale.y,
    x: rect.x * scale.x - scroll.scrollLeft * scale.x + offsets.x,
    y: rect.y * scale.y - scroll.scrollTop * scale.y + offsets.y
  };
}

function getClientRects(element) {
  return Array.from(element.getClientRects());
}

function getWindowScrollBarX(element) {
  // If <html> has a CSS width greater than the viewport, then this will be
  // incorrect for RTL.
  return getBoundingClientRect(getDocumentElement(element)).left + getNodeScroll(element).scrollLeft;
}

// Gets the entire size of the scrollable document area, even extending outside
// of the `<html>` and `<body>` rect bounds if horizontally scrollable.
function getDocumentRect(element) {
  const html = getDocumentElement(element);
  const scroll = getNodeScroll(element);
  const body = element.ownerDocument.body;
  const width = max(html.scrollWidth, html.clientWidth, body.scrollWidth, body.clientWidth);
  const height = max(html.scrollHeight, html.clientHeight, body.scrollHeight, body.clientHeight);
  let x = -scroll.scrollLeft + getWindowScrollBarX(element);
  const y = -scroll.scrollTop;
  if (getComputedStyle$1(body).direction === 'rtl') {
    x += max(html.clientWidth, body.clientWidth) - width;
  }
  return {
    width,
    height,
    x,
    y
  };
}

function getViewportRect(element, strategy) {
  const win = getWindow(element);
  const html = getDocumentElement(element);
  const visualViewport = win.visualViewport;
  let width = html.clientWidth;
  let height = html.clientHeight;
  let x = 0;
  let y = 0;
  if (visualViewport) {
    width = visualViewport.width;
    height = visualViewport.height;
    const visualViewportBased = isWebKit();
    if (!visualViewportBased || visualViewportBased && strategy === 'fixed') {
      x = visualViewport.offsetLeft;
      y = visualViewport.offsetTop;
    }
  }
  return {
    width,
    height,
    x,
    y
  };
}

// Returns the inner client rect, subtracting scrollbars if present.
function getInnerBoundingClientRect(element, strategy) {
  const clientRect = getBoundingClientRect(element, true, strategy === 'fixed');
  const top = clientRect.top + element.clientTop;
  const left = clientRect.left + element.clientLeft;
  const scale = isHTMLElement$1(element) ? getScale(element) : createCoords(1);
  const width = element.clientWidth * scale.x;
  const height = element.clientHeight * scale.y;
  const x = left * scale.x;
  const y = top * scale.y;
  return {
    width,
    height,
    x,
    y
  };
}
function getClientRectFromClippingAncestor(element, clippingAncestor, strategy) {
  let rect;
  if (clippingAncestor === 'viewport') {
    rect = getViewportRect(element, strategy);
  } else if (clippingAncestor === 'document') {
    rect = getDocumentRect(getDocumentElement(element));
  } else if (isElement(clippingAncestor)) {
    rect = getInnerBoundingClientRect(clippingAncestor, strategy);
  } else {
    const visualOffsets = getVisualOffsets(element);
    rect = {
      ...clippingAncestor,
      x: clippingAncestor.x - visualOffsets.x,
      y: clippingAncestor.y - visualOffsets.y
    };
  }
  return rectToClientRect(rect);
}
function hasFixedPositionAncestor(element, stopNode) {
  const parentNode = getParentNode(element);
  if (parentNode === stopNode || !isElement(parentNode) || isLastTraversableNode(parentNode)) {
    return false;
  }
  return getComputedStyle$1(parentNode).position === 'fixed' || hasFixedPositionAncestor(parentNode, stopNode);
}

// A "clipping ancestor" is an `overflow` element with the characteristic of
// clipping (or hiding) child elements. This returns all clipping ancestors
// of the given element up the tree.
function getClippingElementAncestors(element, cache) {
  const cachedResult = cache.get(element);
  if (cachedResult) {
    return cachedResult;
  }
  let result = getOverflowAncestors(element, [], false).filter(el => isElement(el) && getNodeName(el) !== 'body');
  let currentContainingBlockComputedStyle = null;
  const elementIsFixed = getComputedStyle$1(element).position === 'fixed';
  let currentNode = elementIsFixed ? getParentNode(element) : element;

  // https://developer.mozilla.org/en-US/docs/Web/CSS/Containing_block#identifying_the_containing_block
  while (isElement(currentNode) && !isLastTraversableNode(currentNode)) {
    const computedStyle = getComputedStyle$1(currentNode);
    const currentNodeIsContaining = isContainingBlock(currentNode);
    if (!currentNodeIsContaining && computedStyle.position === 'fixed') {
      currentContainingBlockComputedStyle = null;
    }
    const shouldDropCurrentNode = elementIsFixed ? !currentNodeIsContaining && !currentContainingBlockComputedStyle : !currentNodeIsContaining && computedStyle.position === 'static' && !!currentContainingBlockComputedStyle && ['absolute', 'fixed'].includes(currentContainingBlockComputedStyle.position) || isOverflowElement(currentNode) && !currentNodeIsContaining && hasFixedPositionAncestor(element, currentNode);
    if (shouldDropCurrentNode) {
      // Drop non-containing blocks.
      result = result.filter(ancestor => ancestor !== currentNode);
    } else {
      // Record last containing block for next iteration.
      currentContainingBlockComputedStyle = computedStyle;
    }
    currentNode = getParentNode(currentNode);
  }
  cache.set(element, result);
  return result;
}

// Gets the maximum area that the element is visible in due to any number of
// clipping ancestors.
function getClippingRect(_ref) {
  let {
    element,
    boundary,
    rootBoundary,
    strategy
  } = _ref;
  const elementClippingAncestors = boundary === 'clippingAncestors' ? getClippingElementAncestors(element, this._c) : [].concat(boundary);
  const clippingAncestors = [...elementClippingAncestors, rootBoundary];
  const firstClippingAncestor = clippingAncestors[0];
  const clippingRect = clippingAncestors.reduce((accRect, clippingAncestor) => {
    const rect = getClientRectFromClippingAncestor(element, clippingAncestor, strategy);
    accRect.top = max(rect.top, accRect.top);
    accRect.right = min(rect.right, accRect.right);
    accRect.bottom = min(rect.bottom, accRect.bottom);
    accRect.left = max(rect.left, accRect.left);
    return accRect;
  }, getClientRectFromClippingAncestor(element, firstClippingAncestor, strategy));
  return {
    width: clippingRect.right - clippingRect.left,
    height: clippingRect.bottom - clippingRect.top,
    x: clippingRect.left,
    y: clippingRect.top
  };
}

function getDimensions(element) {
  return getCssDimensions(element);
}

function getRectRelativeToOffsetParent(element, offsetParent, strategy) {
  const isOffsetParentAnElement = isHTMLElement$1(offsetParent);
  const documentElement = getDocumentElement(offsetParent);
  const isFixed = strategy === 'fixed';
  const rect = getBoundingClientRect(element, true, isFixed, offsetParent);
  let scroll = {
    scrollLeft: 0,
    scrollTop: 0
  };
  const offsets = createCoords(0);
  if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
    if (getNodeName(offsetParent) !== 'body' || isOverflowElement(documentElement)) {
      scroll = getNodeScroll(offsetParent);
    }
    if (isOffsetParentAnElement) {
      const offsetRect = getBoundingClientRect(offsetParent, true, isFixed, offsetParent);
      offsets.x = offsetRect.x + offsetParent.clientLeft;
      offsets.y = offsetRect.y + offsetParent.clientTop;
    } else if (documentElement) {
      offsets.x = getWindowScrollBarX(documentElement);
    }
  }
  return {
    x: rect.left + scroll.scrollLeft - offsets.x,
    y: rect.top + scroll.scrollTop - offsets.y,
    width: rect.width,
    height: rect.height
  };
}

function getTrueOffsetParent(element, polyfill) {
  if (!isHTMLElement$1(element) || getComputedStyle$1(element).position === 'fixed') {
    return null;
  }
  if (polyfill) {
    return polyfill(element);
  }
  return element.offsetParent;
}

// Gets the closest ancestor positioned element. Handles some edge cases,
// such as table ancestors and cross browser bugs.
function getOffsetParent(element, polyfill) {
  const window = getWindow(element);
  if (!isHTMLElement$1(element)) {
    return window;
  }
  let offsetParent = getTrueOffsetParent(element, polyfill);
  while (offsetParent && isTableElement(offsetParent) && getComputedStyle$1(offsetParent).position === 'static') {
    offsetParent = getTrueOffsetParent(offsetParent, polyfill);
  }
  if (offsetParent && (getNodeName(offsetParent) === 'html' || getNodeName(offsetParent) === 'body' && getComputedStyle$1(offsetParent).position === 'static' && !isContainingBlock(offsetParent))) {
    return window;
  }
  return offsetParent || getContainingBlock(element) || window;
}

const getElementRects = async function (_ref) {
  let {
    reference,
    floating,
    strategy
  } = _ref;
  const getOffsetParentFn = this.getOffsetParent || getOffsetParent;
  const getDimensionsFn = this.getDimensions;
  return {
    reference: getRectRelativeToOffsetParent(reference, await getOffsetParentFn(floating), strategy),
    floating: {
      x: 0,
      y: 0,
      ...(await getDimensionsFn(floating))
    }
  };
};

function isRTL(element) {
  return getComputedStyle$1(element).direction === 'rtl';
}

const platform = {
  convertOffsetParentRelativeRectToViewportRelativeRect,
  getDocumentElement,
  getClippingRect,
  getOffsetParent,
  getElementRects,
  getClientRects,
  getDimensions,
  getScale,
  isElement,
  isRTL
};

// https://samthor.au/2021/observing-dom/
function observeMove(element, onMove) {
  let io = null;
  let timeoutId;
  const root = getDocumentElement(element);
  function cleanup() {
    clearTimeout(timeoutId);
    io && io.disconnect();
    io = null;
  }
  function refresh(skip, threshold) {
    if (skip === void 0) {
      skip = false;
    }
    if (threshold === void 0) {
      threshold = 1;
    }
    cleanup();
    const {
      left,
      top,
      width,
      height
    } = element.getBoundingClientRect();
    if (!skip) {
      onMove();
    }
    if (!width || !height) {
      return;
    }
    const insetTop = floor(top);
    const insetRight = floor(root.clientWidth - (left + width));
    const insetBottom = floor(root.clientHeight - (top + height));
    const insetLeft = floor(left);
    const rootMargin = -insetTop + "px " + -insetRight + "px " + -insetBottom + "px " + -insetLeft + "px";
    const options = {
      rootMargin,
      threshold: max(0, min(1, threshold)) || 1
    };
    let isFirstUpdate = true;
    function handleObserve(entries) {
      const ratio = entries[0].intersectionRatio;
      if (ratio !== threshold) {
        if (!isFirstUpdate) {
          return refresh();
        }
        if (!ratio) {
          timeoutId = setTimeout(() => {
            refresh(false, 1e-7);
          }, 100);
        } else {
          refresh(false, ratio);
        }
      }
      isFirstUpdate = false;
    }

    // Older browsers don't support a `document` as the root and will throw an
    // error.
    try {
      io = new IntersectionObserver(handleObserve, {
        ...options,
        // Handle <iframe>s
        root: root.ownerDocument
      });
    } catch (e) {
      io = new IntersectionObserver(handleObserve, options);
    }
    io.observe(element);
  }
  refresh(true);
  return cleanup;
}

/**
 * Automatically updates the position of the floating element when necessary.
 * Should only be called when the floating element is mounted on the DOM or
 * visible on the screen.
 * @returns cleanup function that should be invoked when the floating element is
 * removed from the DOM or hidden from the screen.
 * @see https://floating-ui.com/docs/autoUpdate
 */
function autoUpdate(reference, floating, update, options) {
  if (options === void 0) {
    options = {};
  }
  const {
    ancestorScroll = true,
    ancestorResize = true,
    elementResize = typeof ResizeObserver === 'function',
    layoutShift = typeof IntersectionObserver === 'function',
    animationFrame = false
  } = options;
  const referenceEl = unwrapElement(reference);
  const ancestors = ancestorScroll || ancestorResize ? [...(referenceEl ? getOverflowAncestors(referenceEl) : []), ...getOverflowAncestors(floating)] : [];
  ancestors.forEach(ancestor => {
    ancestorScroll && ancestor.addEventListener('scroll', update, {
      passive: true
    });
    ancestorResize && ancestor.addEventListener('resize', update);
  });
  const cleanupIo = referenceEl && layoutShift ? observeMove(referenceEl, update) : null;
  let reobserveFrame = -1;
  let resizeObserver = null;
  if (elementResize) {
    resizeObserver = new ResizeObserver(_ref => {
      let [firstEntry] = _ref;
      if (firstEntry && firstEntry.target === referenceEl && resizeObserver) {
        // Prevent update loops when using the `size` middleware.
        // https://github.com/floating-ui/floating-ui/issues/1740
        resizeObserver.unobserve(floating);
        cancelAnimationFrame(reobserveFrame);
        reobserveFrame = requestAnimationFrame(() => {
          resizeObserver && resizeObserver.observe(floating);
        });
      }
      update();
    });
    if (referenceEl && !animationFrame) {
      resizeObserver.observe(referenceEl);
    }
    resizeObserver.observe(floating);
  }
  let frameId;
  let prevRefRect = animationFrame ? getBoundingClientRect(reference) : null;
  if (animationFrame) {
    frameLoop();
  }
  function frameLoop() {
    const nextRefRect = getBoundingClientRect(reference);
    if (prevRefRect && (nextRefRect.x !== prevRefRect.x || nextRefRect.y !== prevRefRect.y || nextRefRect.width !== prevRefRect.width || nextRefRect.height !== prevRefRect.height)) {
      update();
    }
    prevRefRect = nextRefRect;
    frameId = requestAnimationFrame(frameLoop);
  }
  update();
  return () => {
    ancestors.forEach(ancestor => {
      ancestorScroll && ancestor.removeEventListener('scroll', update);
      ancestorResize && ancestor.removeEventListener('resize', update);
    });
    cleanupIo && cleanupIo();
    resizeObserver && resizeObserver.disconnect();
    resizeObserver = null;
    if (animationFrame) {
      cancelAnimationFrame(frameId);
    }
  };
}

/**
 * Computes the `x` and `y` coordinates that will place the floating element
 * next to a reference element when it is given a certain CSS positioning
 * strategy.
 */
const computePosition = (reference, floating, options) => {
  // This caches the expensive `getClippingElementAncestors` function so that
  // multiple lifecycle resets re-use the same result. It only lives for a
  // single call. If other functions become expensive, we can add them as well.
  const cache = new Map();
  const mergedOptions = {
    platform,
    ...options
  };
  const platformWithCache = {
    ...mergedOptions.platform,
    _c: cache
  };
  return computePosition$1(reference, floating, {
    ...mergedOptions,
    platform: platformWithCache
  });
};

/*!
* tabbable 6.2.0
* @license MIT, https://github.com/focus-trap/tabbable/blob/master/LICENSE
*/
// NOTE: separate `:not()` selectors has broader browser support than the newer
//  `:not([inert], [inert] *)` (Feb 2023)
// CAREFUL: JSDom does not support `:not([inert] *)` as a selector; using it causes
//  the entire query to fail, resulting in no nodes found, which will break a lot
//  of things... so we have to rely on JS to identify nodes inside an inert container
var candidateSelectors = ['input:not([inert])', 'select:not([inert])', 'textarea:not([inert])', 'a[href]:not([inert])', 'button:not([inert])', '[tabindex]:not(slot):not([inert])', 'audio[controls]:not([inert])', 'video[controls]:not([inert])', '[contenteditable]:not([contenteditable="false"]):not([inert])', 'details>summary:first-of-type:not([inert])', 'details:not([inert])'];
var candidateSelector = /* #__PURE__ */candidateSelectors.join(',');
var NoElement = typeof Element === 'undefined';
var matches = NoElement ? function () {} : Element.prototype.matches || Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
var getRootNode = !NoElement && Element.prototype.getRootNode ? function (element) {
  var _element$getRootNode;
  return element === null || element === void 0 ? void 0 : (_element$getRootNode = element.getRootNode) === null || _element$getRootNode === void 0 ? void 0 : _element$getRootNode.call(element);
} : function (element) {
  return element === null || element === void 0 ? void 0 : element.ownerDocument;
};

/**
 * Determines if a node is inert or in an inert ancestor.
 * @param {Element} [node]
 * @param {boolean} [lookUp] If true and `node` is not inert, looks up at ancestors to
 *  see if any of them are inert. If false, only `node` itself is considered.
 * @returns {boolean} True if inert itself or by way of being in an inert ancestor.
 *  False if `node` is falsy.
 */
var isInert = function isInert(node, lookUp) {
  var _node$getAttribute;
  if (lookUp === void 0) {
    lookUp = true;
  }
  // CAREFUL: JSDom does not support inert at all, so we can't use the `HTMLElement.inert`
  //  JS API property; we have to check the attribute, which can either be empty or 'true';
  //  if it's `null` (not specified) or 'false', it's an active element
  var inertAtt = node === null || node === void 0 ? void 0 : (_node$getAttribute = node.getAttribute) === null || _node$getAttribute === void 0 ? void 0 : _node$getAttribute.call(node, 'inert');
  var inert = inertAtt === '' || inertAtt === 'true';

  // NOTE: this could also be handled with `node.matches('[inert], :is([inert] *)')`
  //  if it weren't for `matches()` not being a function on shadow roots; the following
  //  code works for any kind of node
  // CAREFUL: JSDom does not appear to support certain selectors like `:not([inert] *)`
  //  so it likely would not support `:is([inert] *)` either...
  var result = inert || lookUp && node && isInert(node.parentNode); // recursive

  return result;
};

/**
 * Determines if a node's content is editable.
 * @param {Element} [node]
 * @returns True if it's content-editable; false if it's not or `node` is falsy.
 */
var isContentEditable = function isContentEditable(node) {
  var _node$getAttribute2;
  // CAREFUL: JSDom does not support the `HTMLElement.isContentEditable` API so we have
  //  to use the attribute directly to check for this, which can either be empty or 'true';
  //  if it's `null` (not specified) or 'false', it's a non-editable element
  var attValue = node === null || node === void 0 ? void 0 : (_node$getAttribute2 = node.getAttribute) === null || _node$getAttribute2 === void 0 ? void 0 : _node$getAttribute2.call(node, 'contenteditable');
  return attValue === '' || attValue === 'true';
};

/**
 * @param {Element} el container to check in
 * @param {boolean} includeContainer add container to check
 * @param {(node: Element) => boolean} filter filter candidates
 * @returns {Element[]}
 */
var getCandidates = function getCandidates(el, includeContainer, filter) {
  // even if `includeContainer=false`, we still have to check it for inertness because
  //  if it's inert, all its children are inert
  if (isInert(el)) {
    return [];
  }
  var candidates = Array.prototype.slice.apply(el.querySelectorAll(candidateSelector));
  if (includeContainer && matches.call(el, candidateSelector)) {
    candidates.unshift(el);
  }
  candidates = candidates.filter(filter);
  return candidates;
};

/**
 * @callback GetShadowRoot
 * @param {Element} element to check for shadow root
 * @returns {ShadowRoot|boolean} ShadowRoot if available or boolean indicating if a shadowRoot is attached but not available.
 */

/**
 * @callback ShadowRootFilter
 * @param {Element} shadowHostNode the element which contains shadow content
 * @returns {boolean} true if a shadow root could potentially contain valid candidates.
 */

/**
 * @typedef {Object} CandidateScope
 * @property {Element} scopeParent contains inner candidates
 * @property {Element[]} candidates list of candidates found in the scope parent
 */

/**
 * @typedef {Object} IterativeOptions
 * @property {GetShadowRoot|boolean} getShadowRoot true if shadow support is enabled; falsy if not;
 *  if a function, implies shadow support is enabled and either returns the shadow root of an element
 *  or a boolean stating if it has an undisclosed shadow root
 * @property {(node: Element) => boolean} filter filter candidates
 * @property {boolean} flatten if true then result will flatten any CandidateScope into the returned list
 * @property {ShadowRootFilter} shadowRootFilter filter shadow roots;
 */

/**
 * @param {Element[]} elements list of element containers to match candidates from
 * @param {boolean} includeContainer add container list to check
 * @param {IterativeOptions} options
 * @returns {Array.<Element|CandidateScope>}
 */
var getCandidatesIteratively = function getCandidatesIteratively(elements, includeContainer, options) {
  var candidates = [];
  var elementsToCheck = Array.from(elements);
  while (elementsToCheck.length) {
    var element = elementsToCheck.shift();
    if (isInert(element, false)) {
      // no need to look up since we're drilling down
      // anything inside this container will also be inert
      continue;
    }
    if (element.tagName === 'SLOT') {
      // add shadow dom slot scope (slot itself cannot be focusable)
      var assigned = element.assignedElements();
      var content = assigned.length ? assigned : element.children;
      var nestedCandidates = getCandidatesIteratively(content, true, options);
      if (options.flatten) {
        candidates.push.apply(candidates, nestedCandidates);
      } else {
        candidates.push({
          scopeParent: element,
          candidates: nestedCandidates
        });
      }
    } else {
      // check candidate element
      var validCandidate = matches.call(element, candidateSelector);
      if (validCandidate && options.filter(element) && (includeContainer || !elements.includes(element))) {
        candidates.push(element);
      }

      // iterate over shadow content if possible
      var shadowRoot = element.shadowRoot ||
      // check for an undisclosed shadow
      typeof options.getShadowRoot === 'function' && options.getShadowRoot(element);

      // no inert look up because we're already drilling down and checking for inertness
      //  on the way down, so all containers to this root node should have already been
      //  vetted as non-inert
      var validShadowRoot = !isInert(shadowRoot, false) && (!options.shadowRootFilter || options.shadowRootFilter(element));
      if (shadowRoot && validShadowRoot) {
        // add shadow dom scope IIF a shadow root node was given; otherwise, an undisclosed
        //  shadow exists, so look at light dom children as fallback BUT create a scope for any
        //  child candidates found because they're likely slotted elements (elements that are
        //  children of the web component element (which has the shadow), in the light dom, but
        //  slotted somewhere _inside_ the undisclosed shadow) -- the scope is created below,
        //  _after_ we return from this recursive call
        var _nestedCandidates = getCandidatesIteratively(shadowRoot === true ? element.children : shadowRoot.children, true, options);
        if (options.flatten) {
          candidates.push.apply(candidates, _nestedCandidates);
        } else {
          candidates.push({
            scopeParent: element,
            candidates: _nestedCandidates
          });
        }
      } else {
        // there's not shadow so just dig into the element's (light dom) children
        //  __without__ giving the element special scope treatment
        elementsToCheck.unshift.apply(elementsToCheck, element.children);
      }
    }
  }
  return candidates;
};

/**
 * @private
 * Determines if the node has an explicitly specified `tabindex` attribute.
 * @param {HTMLElement} node
 * @returns {boolean} True if so; false if not.
 */
var hasTabIndex = function hasTabIndex(node) {
  return !isNaN(parseInt(node.getAttribute('tabindex'), 10));
};

/**
 * Determine the tab index of a given node.
 * @param {HTMLElement} node
 * @returns {number} Tab order (negative, 0, or positive number).
 * @throws {Error} If `node` is falsy.
 */
var getTabIndex = function getTabIndex(node) {
  if (!node) {
    throw new Error('No node provided');
  }
  if (node.tabIndex < 0) {
    // in Chrome, <details/>, <audio controls/> and <video controls/> elements get a default
    // `tabIndex` of -1 when the 'tabindex' attribute isn't specified in the DOM,
    // yet they are still part of the regular tab order; in FF, they get a default
    // `tabIndex` of 0; since Chrome still puts those elements in the regular tab
    // order, consider their tab index to be 0.
    // Also browsers do not return `tabIndex` correctly for contentEditable nodes;
    // so if they don't have a tabindex attribute specifically set, assume it's 0.
    if ((/^(AUDIO|VIDEO|DETAILS)$/.test(node.tagName) || isContentEditable(node)) && !hasTabIndex(node)) {
      return 0;
    }
  }
  return node.tabIndex;
};

/**
 * Determine the tab index of a given node __for sort order purposes__.
 * @param {HTMLElement} node
 * @param {boolean} [isScope] True for a custom element with shadow root or slot that, by default,
 *  has tabIndex -1, but needs to be sorted by document order in order for its content to be
 *  inserted into the correct sort position.
 * @returns {number} Tab order (negative, 0, or positive number).
 */
var getSortOrderTabIndex = function getSortOrderTabIndex(node, isScope) {
  var tabIndex = getTabIndex(node);
  if (tabIndex < 0 && isScope && !hasTabIndex(node)) {
    return 0;
  }
  return tabIndex;
};
var sortOrderedTabbables = function sortOrderedTabbables(a, b) {
  return a.tabIndex === b.tabIndex ? a.documentOrder - b.documentOrder : a.tabIndex - b.tabIndex;
};
var isInput = function isInput(node) {
  return node.tagName === 'INPUT';
};
var isHiddenInput = function isHiddenInput(node) {
  return isInput(node) && node.type === 'hidden';
};
var isDetailsWithSummary = function isDetailsWithSummary(node) {
  var r = node.tagName === 'DETAILS' && Array.prototype.slice.apply(node.children).some(function (child) {
    return child.tagName === 'SUMMARY';
  });
  return r;
};
var getCheckedRadio = function getCheckedRadio(nodes, form) {
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i].checked && nodes[i].form === form) {
      return nodes[i];
    }
  }
};
var isTabbableRadio = function isTabbableRadio(node) {
  if (!node.name) {
    return true;
  }
  var radioScope = node.form || getRootNode(node);
  var queryRadios = function queryRadios(name) {
    return radioScope.querySelectorAll('input[type="radio"][name="' + name + '"]');
  };
  var radioSet;
  if (typeof window !== 'undefined' && typeof window.CSS !== 'undefined' && typeof window.CSS.escape === 'function') {
    radioSet = queryRadios(window.CSS.escape(node.name));
  } else {
    try {
      radioSet = queryRadios(node.name);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Looks like you have a radio button with a name attribute containing invalid CSS selector characters and need the CSS.escape polyfill: %s', err.message);
      return false;
    }
  }
  var checked = getCheckedRadio(radioSet, node.form);
  return !checked || checked === node;
};
var isRadio = function isRadio(node) {
  return isInput(node) && node.type === 'radio';
};
var isNonTabbableRadio = function isNonTabbableRadio(node) {
  return isRadio(node) && !isTabbableRadio(node);
};

// determines if a node is ultimately attached to the window's document
var isNodeAttached = function isNodeAttached(node) {
  var _nodeRoot;
  // The root node is the shadow root if the node is in a shadow DOM; some document otherwise
  //  (but NOT _the_ document; see second 'If' comment below for more).
  // If rootNode is shadow root, it'll have a host, which is the element to which the shadow
  //  is attached, and the one we need to check if it's in the document or not (because the
  //  shadow, and all nodes it contains, is never considered in the document since shadows
  //  behave like self-contained DOMs; but if the shadow's HOST, which is part of the document,
  //  is hidden, or is not in the document itself but is detached, it will affect the shadow's
  //  visibility, including all the nodes it contains). The host could be any normal node,
  //  or a custom element (i.e. web component). Either way, that's the one that is considered
  //  part of the document, not the shadow root, nor any of its children (i.e. the node being
  //  tested).
  // To further complicate things, we have to look all the way up until we find a shadow HOST
  //  that is attached (or find none) because the node might be in nested shadows...
  // If rootNode is not a shadow root, it won't have a host, and so rootNode should be the
  //  document (per the docs) and while it's a Document-type object, that document does not
  //  appear to be the same as the node's `ownerDocument` for some reason, so it's safer
  //  to ignore the rootNode at this point, and use `node.ownerDocument`. Otherwise,
  //  using `rootNode.contains(node)` will _always_ be true we'll get false-positives when
  //  node is actually detached.
  // NOTE: If `nodeRootHost` or `node` happens to be the `document` itself (which is possible
  //  if a tabbable/focusable node was quickly added to the DOM, focused, and then removed
  //  from the DOM as in https://github.com/focus-trap/focus-trap-react/issues/905), then
  //  `ownerDocument` will be `null`, hence the optional chaining on it.
  var nodeRoot = node && getRootNode(node);
  var nodeRootHost = (_nodeRoot = nodeRoot) === null || _nodeRoot === void 0 ? void 0 : _nodeRoot.host;

  // in some cases, a detached node will return itself as the root instead of a document or
  //  shadow root object, in which case, we shouldn't try to look further up the host chain
  var attached = false;
  if (nodeRoot && nodeRoot !== node) {
    var _nodeRootHost, _nodeRootHost$ownerDo, _node$ownerDocument;
    attached = !!((_nodeRootHost = nodeRootHost) !== null && _nodeRootHost !== void 0 && (_nodeRootHost$ownerDo = _nodeRootHost.ownerDocument) !== null && _nodeRootHost$ownerDo !== void 0 && _nodeRootHost$ownerDo.contains(nodeRootHost) || node !== null && node !== void 0 && (_node$ownerDocument = node.ownerDocument) !== null && _node$ownerDocument !== void 0 && _node$ownerDocument.contains(node));
    while (!attached && nodeRootHost) {
      var _nodeRoot2, _nodeRootHost2, _nodeRootHost2$ownerD;
      // since it's not attached and we have a root host, the node MUST be in a nested shadow DOM,
      //  which means we need to get the host's host and check if that parent host is contained
      //  in (i.e. attached to) the document
      nodeRoot = getRootNode(nodeRootHost);
      nodeRootHost = (_nodeRoot2 = nodeRoot) === null || _nodeRoot2 === void 0 ? void 0 : _nodeRoot2.host;
      attached = !!((_nodeRootHost2 = nodeRootHost) !== null && _nodeRootHost2 !== void 0 && (_nodeRootHost2$ownerD = _nodeRootHost2.ownerDocument) !== null && _nodeRootHost2$ownerD !== void 0 && _nodeRootHost2$ownerD.contains(nodeRootHost));
    }
  }
  return attached;
};
var isZeroArea = function isZeroArea(node) {
  var _node$getBoundingClie = node.getBoundingClientRect(),
    width = _node$getBoundingClie.width,
    height = _node$getBoundingClie.height;
  return width === 0 && height === 0;
};
var isHidden = function isHidden(node, _ref) {
  var displayCheck = _ref.displayCheck,
    getShadowRoot = _ref.getShadowRoot;
  // NOTE: visibility will be `undefined` if node is detached from the document
  //  (see notes about this further down), which means we will consider it visible
  //  (this is legacy behavior from a very long way back)
  // NOTE: we check this regardless of `displayCheck="none"` because this is a
  //  _visibility_ check, not a _display_ check
  if (getComputedStyle(node).visibility === 'hidden') {
    return true;
  }
  var isDirectSummary = matches.call(node, 'details>summary:first-of-type');
  var nodeUnderDetails = isDirectSummary ? node.parentElement : node;
  if (matches.call(nodeUnderDetails, 'details:not([open]) *')) {
    return true;
  }
  if (!displayCheck || displayCheck === 'full' || displayCheck === 'legacy-full') {
    if (typeof getShadowRoot === 'function') {
      // figure out if we should consider the node to be in an undisclosed shadow and use the
      //  'non-zero-area' fallback
      var originalNode = node;
      while (node) {
        var parentElement = node.parentElement;
        var rootNode = getRootNode(node);
        if (parentElement && !parentElement.shadowRoot && getShadowRoot(parentElement) === true // check if there's an undisclosed shadow
        ) {
          // node has an undisclosed shadow which means we can only treat it as a black box, so we
          //  fall back to a non-zero-area test
          return isZeroArea(node);
        } else if (node.assignedSlot) {
          // iterate up slot
          node = node.assignedSlot;
        } else if (!parentElement && rootNode !== node.ownerDocument) {
          // cross shadow boundary
          node = rootNode.host;
        } else {
          // iterate up normal dom
          node = parentElement;
        }
      }
      node = originalNode;
    }
    // else, `getShadowRoot` might be true, but all that does is enable shadow DOM support
    //  (i.e. it does not also presume that all nodes might have undisclosed shadows); or
    //  it might be a falsy value, which means shadow DOM support is disabled

    // Since we didn't find it sitting in an undisclosed shadow (or shadows are disabled)
    //  now we can just test to see if it would normally be visible or not, provided it's
    //  attached to the main document.
    // NOTE: We must consider case where node is inside a shadow DOM and given directly to
    //  `isTabbable()` or `isFocusable()` -- regardless of `getShadowRoot` option setting.

    if (isNodeAttached(node)) {
      // this works wherever the node is: if there's at least one client rect, it's
      //  somehow displayed; it also covers the CSS 'display: contents' case where the
      //  node itself is hidden in place of its contents; and there's no need to search
      //  up the hierarchy either
      return !node.getClientRects().length;
    }

    // Else, the node isn't attached to the document, which means the `getClientRects()`
    //  API will __always__ return zero rects (this can happen, for example, if React
    //  is used to render nodes onto a detached tree, as confirmed in this thread:
    //  https://github.com/facebook/react/issues/9117#issuecomment-284228870)
    //
    // It also means that even window.getComputedStyle(node).display will return `undefined`
    //  because styles are only computed for nodes that are in the document.
    //
    // NOTE: THIS HAS BEEN THE CASE FOR YEARS. It is not new, nor is it caused by tabbable
    //  somehow. Though it was never stated officially, anyone who has ever used tabbable
    //  APIs on nodes in detached containers has actually implicitly used tabbable in what
    //  was later (as of v5.2.0 on Apr 9, 2021) called `displayCheck="none"` mode -- essentially
    //  considering __everything__ to be visible because of the innability to determine styles.
    //
    // v6.0.0: As of this major release, the default 'full' option __no longer treats detached
    //  nodes as visible with the 'none' fallback.__
    if (displayCheck !== 'legacy-full') {
      return true; // hidden
    }
    // else, fallback to 'none' mode and consider the node visible
  } else if (displayCheck === 'non-zero-area') {
    // NOTE: Even though this tests that the node's client rect is non-zero to determine
    //  whether it's displayed, and that a detached node will __always__ have a zero-area
    //  client rect, we don't special-case for whether the node is attached or not. In
    //  this mode, we do want to consider nodes that have a zero area to be hidden at all
    //  times, and that includes attached or not.
    return isZeroArea(node);
  }

  // visible, as far as we can tell, or per current `displayCheck=none` mode, we assume
  //  it's visible
  return false;
};

// form fields (nested) inside a disabled fieldset are not focusable/tabbable
//  unless they are in the _first_ <legend> element of the top-most disabled
//  fieldset
var isDisabledFromFieldset = function isDisabledFromFieldset(node) {
  if (/^(INPUT|BUTTON|SELECT|TEXTAREA)$/.test(node.tagName)) {
    var parentNode = node.parentElement;
    // check if `node` is contained in a disabled <fieldset>
    while (parentNode) {
      if (parentNode.tagName === 'FIELDSET' && parentNode.disabled) {
        // look for the first <legend> among the children of the disabled <fieldset>
        for (var i = 0; i < parentNode.children.length; i++) {
          var child = parentNode.children.item(i);
          // when the first <legend> (in document order) is found
          if (child.tagName === 'LEGEND') {
            // if its parent <fieldset> is not nested in another disabled <fieldset>,
            // return whether `node` is a descendant of its first <legend>
            return matches.call(parentNode, 'fieldset[disabled] *') ? true : !child.contains(node);
          }
        }
        // the disabled <fieldset> containing `node` has no <legend>
        return true;
      }
      parentNode = parentNode.parentElement;
    }
  }

  // else, node's tabbable/focusable state should not be affected by a fieldset's
  //  enabled/disabled state
  return false;
};
var isNodeMatchingSelectorFocusable = function isNodeMatchingSelectorFocusable(options, node) {
  if (node.disabled ||
  // we must do an inert look up to filter out any elements inside an inert ancestor
  //  because we're limited in the type of selectors we can use in JSDom (see related
  //  note related to `candidateSelectors`)
  isInert(node) || isHiddenInput(node) || isHidden(node, options) ||
  // For a details element with a summary, the summary element gets the focus
  isDetailsWithSummary(node) || isDisabledFromFieldset(node)) {
    return false;
  }
  return true;
};
var isNodeMatchingSelectorTabbable = function isNodeMatchingSelectorTabbable(options, node) {
  if (isNonTabbableRadio(node) || getTabIndex(node) < 0 || !isNodeMatchingSelectorFocusable(options, node)) {
    return false;
  }
  return true;
};
var isValidShadowRootTabbable = function isValidShadowRootTabbable(shadowHostNode) {
  var tabIndex = parseInt(shadowHostNode.getAttribute('tabindex'), 10);
  if (isNaN(tabIndex) || tabIndex >= 0) {
    return true;
  }
  // If a custom element has an explicit negative tabindex,
  // browsers will not allow tab targeting said element's children.
  return false;
};

/**
 * @param {Array.<Element|CandidateScope>} candidates
 * @returns Element[]
 */
var sortByOrder = function sortByOrder(candidates) {
  var regularTabbables = [];
  var orderedTabbables = [];
  candidates.forEach(function (item, i) {
    var isScope = !!item.scopeParent;
    var element = isScope ? item.scopeParent : item;
    var candidateTabindex = getSortOrderTabIndex(element, isScope);
    var elements = isScope ? sortByOrder(item.candidates) : element;
    if (candidateTabindex === 0) {
      isScope ? regularTabbables.push.apply(regularTabbables, elements) : regularTabbables.push(element);
    } else {
      orderedTabbables.push({
        documentOrder: i,
        tabIndex: candidateTabindex,
        item: item,
        isScope: isScope,
        content: elements
      });
    }
  });
  return orderedTabbables.sort(sortOrderedTabbables).reduce(function (acc, sortable) {
    sortable.isScope ? acc.push.apply(acc, sortable.content) : acc.push(sortable.content);
    return acc;
  }, []).concat(regularTabbables);
};
var tabbable = function tabbable(container, options) {
  options = options || {};
  var candidates;
  if (options.getShadowRoot) {
    candidates = getCandidatesIteratively([container], options.includeContainer, {
      filter: isNodeMatchingSelectorTabbable.bind(null, options),
      flatten: false,
      getShadowRoot: options.getShadowRoot,
      shadowRootFilter: isValidShadowRootTabbable
    });
  } else {
    candidates = getCandidates(container, options.includeContainer, isNodeMatchingSelectorTabbable.bind(null, options));
  }
  return sortByOrder(candidates);
};
var focusable = function focusable(container, options) {
  options = options || {};
  var candidates;
  if (options.getShadowRoot) {
    candidates = getCandidatesIteratively([container], options.includeContainer, {
      filter: isNodeMatchingSelectorFocusable.bind(null, options),
      flatten: true,
      getShadowRoot: options.getShadowRoot
    });
  } else {
    candidates = getCandidates(container, options.includeContainer, isNodeMatchingSelectorFocusable.bind(null, options));
  }
  return candidates;
};
var isTabbable = function isTabbable(node, options) {
  options = options || {};
  if (!node) {
    throw new Error('No node provided');
  }
  if (matches.call(node, candidateSelector) === false) {
    return false;
  }
  return isNodeMatchingSelectorTabbable(options, node);
};
var focusableCandidateSelector = /* #__PURE__ */candidateSelectors.concat('iframe').join(',');
var isFocusable = function isFocusable(node, options) {
  options = options || {};
  if (!node) {
    throw new Error('No node provided');
  }
  if (matches.call(node, focusableCandidateSelector) === false) {
    return false;
  }
  return isNodeMatchingSelectorFocusable(options, node);
};

/*!
* focus-trap 7.5.4
* @license MIT, https://github.com/focus-trap/focus-trap/blob/master/LICENSE
*/

function ownKeys(e, r) {
  var t = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e);
    r && (o = o.filter(function (r) {
      return Object.getOwnPropertyDescriptor(e, r).enumerable;
    })), t.push.apply(t, o);
  }
  return t;
}
function _objectSpread2(e) {
  for (var r = 1; r < arguments.length; r++) {
    var t = null != arguments[r] ? arguments[r] : {};
    r % 2 ? ownKeys(Object(t), !0).forEach(function (r) {
      _defineProperty(e, r, t[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) {
      Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
    });
  }
  return e;
}
function _defineProperty(obj, key, value) {
  key = _toPropertyKey(key);
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }
  return obj;
}
function _toPrimitive(input, hint) {
  if (typeof input !== "object" || input === null) return input;
  var prim = input[Symbol.toPrimitive];
  if (prim !== undefined) {
    var res = prim.call(input, hint || "default");
    if (typeof res !== "object") return res;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (hint === "string" ? String : Number)(input);
}
function _toPropertyKey(arg) {
  var key = _toPrimitive(arg, "string");
  return typeof key === "symbol" ? key : String(key);
}

var activeFocusTraps = {
  activateTrap: function activateTrap(trapStack, trap) {
    if (trapStack.length > 0) {
      var activeTrap = trapStack[trapStack.length - 1];
      if (activeTrap !== trap) {
        activeTrap.pause();
      }
    }
    var trapIndex = trapStack.indexOf(trap);
    if (trapIndex === -1) {
      trapStack.push(trap);
    } else {
      // move this existing trap to the front of the queue
      trapStack.splice(trapIndex, 1);
      trapStack.push(trap);
    }
  },
  deactivateTrap: function deactivateTrap(trapStack, trap) {
    var trapIndex = trapStack.indexOf(trap);
    if (trapIndex !== -1) {
      trapStack.splice(trapIndex, 1);
    }
    if (trapStack.length > 0) {
      trapStack[trapStack.length - 1].unpause();
    }
  }
};
var isSelectableInput = function isSelectableInput(node) {
  return node.tagName && node.tagName.toLowerCase() === 'input' && typeof node.select === 'function';
};
var isEscapeEvent = function isEscapeEvent(e) {
  return (e === null || e === void 0 ? void 0 : e.key) === 'Escape' || (e === null || e === void 0 ? void 0 : e.key) === 'Esc' || (e === null || e === void 0 ? void 0 : e.keyCode) === 27;
};
var isTabEvent = function isTabEvent(e) {
  return (e === null || e === void 0 ? void 0 : e.key) === 'Tab' || (e === null || e === void 0 ? void 0 : e.keyCode) === 9;
};

// checks for TAB by default
var isKeyForward = function isKeyForward(e) {
  return isTabEvent(e) && !e.shiftKey;
};

// checks for SHIFT+TAB by default
var isKeyBackward = function isKeyBackward(e) {
  return isTabEvent(e) && e.shiftKey;
};
var delay = function delay(fn) {
  return setTimeout(fn, 0);
};

// Array.find/findIndex() are not supported on IE; this replicates enough
//  of Array.findIndex() for our needs
var findIndex = function findIndex(arr, fn) {
  var idx = -1;
  arr.every(function (value, i) {
    if (fn(value)) {
      idx = i;
      return false; // break
    }

    return true; // next
  });

  return idx;
};

/**
 * Get an option's value when it could be a plain value, or a handler that provides
 *  the value.
 * @param {*} value Option's value to check.
 * @param {...*} [params] Any parameters to pass to the handler, if `value` is a function.
 * @returns {*} The `value`, or the handler's returned value.
 */
var valueOrHandler = function valueOrHandler(value) {
  for (var _len = arguments.length, params = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    params[_key - 1] = arguments[_key];
  }
  return typeof value === 'function' ? value.apply(void 0, params) : value;
};
var getActualTarget = function getActualTarget(event) {
  // NOTE: If the trap is _inside_ a shadow DOM, event.target will always be the
  //  shadow host. However, event.target.composedPath() will be an array of
  //  nodes "clicked" from inner-most (the actual element inside the shadow) to
  //  outer-most (the host HTML document). If we have access to composedPath(),
  //  then use its first element; otherwise, fall back to event.target (and
  //  this only works for an _open_ shadow DOM; otherwise,
  //  composedPath()[0] === event.target always).
  return event.target.shadowRoot && typeof event.composedPath === 'function' ? event.composedPath()[0] : event.target;
};

// NOTE: this must be _outside_ `createFocusTrap()` to make sure all traps in this
//  current instance use the same stack if `userOptions.trapStack` isn't specified
var internalTrapStack = [];
var createFocusTrap$1 = function createFocusTrap(elements, userOptions) {
  // SSR: a live trap shouldn't be created in this type of environment so this
  //  should be safe code to execute if the `document` option isn't specified
  var doc = (userOptions === null || userOptions === void 0 ? void 0 : userOptions.document) || document;
  var trapStack = (userOptions === null || userOptions === void 0 ? void 0 : userOptions.trapStack) || internalTrapStack;
  var config = _objectSpread2({
    returnFocusOnDeactivate: true,
    escapeDeactivates: true,
    delayInitialFocus: true,
    isKeyForward: isKeyForward,
    isKeyBackward: isKeyBackward
  }, userOptions);
  var state = {
    // containers given to createFocusTrap()
    // @type {Array<HTMLElement>}
    containers: [],
    // list of objects identifying tabbable nodes in `containers` in the trap
    // NOTE: it's possible that a group has no tabbable nodes if nodes get removed while the trap
    //  is active, but the trap should never get to a state where there isn't at least one group
    //  with at least one tabbable node in it (that would lead to an error condition that would
    //  result in an error being thrown)
    // @type {Array<{
    //   container: HTMLElement,
    //   tabbableNodes: Array<HTMLElement>, // empty if none
    //   focusableNodes: Array<HTMLElement>, // empty if none
    //   posTabIndexesFound: boolean,
    //   firstTabbableNode: HTMLElement|undefined,
    //   lastTabbableNode: HTMLElement|undefined,
    //   firstDomTabbableNode: HTMLElement|undefined,
    //   lastDomTabbableNode: HTMLElement|undefined,
    //   nextTabbableNode: (node: HTMLElement, forward: boolean) => HTMLElement|undefined
    // }>}
    containerGroups: [],
    // same order/length as `containers` list

    // references to objects in `containerGroups`, but only those that actually have
    //  tabbable nodes in them
    // NOTE: same order as `containers` and `containerGroups`, but __not necessarily__
    //  the same length
    tabbableGroups: [],
    nodeFocusedBeforeActivation: null,
    mostRecentlyFocusedNode: null,
    active: false,
    paused: false,
    // timer ID for when delayInitialFocus is true and initial focus in this trap
    //  has been delayed during activation
    delayInitialFocusTimer: undefined,
    // the most recent KeyboardEvent for the configured nav key (typically [SHIFT+]TAB), if any
    recentNavEvent: undefined
  };
  var trap; // eslint-disable-line prefer-const -- some private functions reference it, and its methods reference private functions, so we must declare here and define later

  /**
   * Gets a configuration option value.
   * @param {Object|undefined} configOverrideOptions If true, and option is defined in this set,
   *  value will be taken from this object. Otherwise, value will be taken from base configuration.
   * @param {string} optionName Name of the option whose value is sought.
   * @param {string|undefined} [configOptionName] Name of option to use __instead of__ `optionName`
   *  IIF `configOverrideOptions` is not defined. Otherwise, `optionName` is used.
   */
  var getOption = function getOption(configOverrideOptions, optionName, configOptionName) {
    return configOverrideOptions && configOverrideOptions[optionName] !== undefined ? configOverrideOptions[optionName] : config[configOptionName || optionName];
  };

  /**
   * Finds the index of the container that contains the element.
   * @param {HTMLElement} element
   * @param {Event} [event] If available, and `element` isn't directly found in any container,
   *  the event's composed path is used to see if includes any known trap containers in the
   *  case where the element is inside a Shadow DOM.
   * @returns {number} Index of the container in either `state.containers` or
   *  `state.containerGroups` (the order/length of these lists are the same); -1
   *  if the element isn't found.
   */
  var findContainerIndex = function findContainerIndex(element, event) {
    var composedPath = typeof (event === null || event === void 0 ? void 0 : event.composedPath) === 'function' ? event.composedPath() : undefined;
    // NOTE: search `containerGroups` because it's possible a group contains no tabbable
    //  nodes, but still contains focusable nodes (e.g. if they all have `tabindex=-1`)
    //  and we still need to find the element in there
    return state.containerGroups.findIndex(function (_ref) {
      var container = _ref.container,
        tabbableNodes = _ref.tabbableNodes;
      return container.contains(element) || ( // fall back to explicit tabbable search which will take into consideration any
      //  web components if the `tabbableOptions.getShadowRoot` option was used for
      //  the trap, enabling shadow DOM support in tabbable (`Node.contains()` doesn't
      //  look inside web components even if open)
      composedPath === null || composedPath === void 0 ? void 0 : composedPath.includes(container)) || tabbableNodes.find(function (node) {
        return node === element;
      });
    });
  };

  /**
   * Gets the node for the given option, which is expected to be an option that
   *  can be either a DOM node, a string that is a selector to get a node, `false`
   *  (if a node is explicitly NOT given), or a function that returns any of these
   *  values.
   * @param {string} optionName
   * @returns {undefined | false | HTMLElement | SVGElement} Returns
   *  `undefined` if the option is not specified; `false` if the option
   *  resolved to `false` (node explicitly not given); otherwise, the resolved
   *  DOM node.
   * @throws {Error} If the option is set, not `false`, and is not, or does not
   *  resolve to a node.
   */
  var getNodeForOption = function getNodeForOption(optionName) {
    var optionValue = config[optionName];
    if (typeof optionValue === 'function') {
      for (var _len2 = arguments.length, params = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        params[_key2 - 1] = arguments[_key2];
      }
      optionValue = optionValue.apply(void 0, params);
    }
    if (optionValue === true) {
      optionValue = undefined; // use default value
    }

    if (!optionValue) {
      if (optionValue === undefined || optionValue === false) {
        return optionValue;
      }
      // else, empty string (invalid), null (invalid), 0 (invalid)

      throw new Error("`".concat(optionName, "` was specified but was not a node, or did not return a node"));
    }
    var node = optionValue; // could be HTMLElement, SVGElement, or non-empty string at this point

    if (typeof optionValue === 'string') {
      node = doc.querySelector(optionValue); // resolve to node, or null if fails
      if (!node) {
        throw new Error("`".concat(optionName, "` as selector refers to no known node"));
      }
    }
    return node;
  };
  var getInitialFocusNode = function getInitialFocusNode() {
    var node = getNodeForOption('initialFocus');

    // false explicitly indicates we want no initialFocus at all
    if (node === false) {
      return false;
    }
    if (node === undefined || !isFocusable(node, config.tabbableOptions)) {
      // option not specified nor focusable: use fallback options
      if (findContainerIndex(doc.activeElement) >= 0) {
        node = doc.activeElement;
      } else {
        var firstTabbableGroup = state.tabbableGroups[0];
        var firstTabbableNode = firstTabbableGroup && firstTabbableGroup.firstTabbableNode;

        // NOTE: `fallbackFocus` option function cannot return `false` (not supported)
        node = firstTabbableNode || getNodeForOption('fallbackFocus');
      }
    }
    if (!node) {
      throw new Error('Your focus-trap needs to have at least one focusable element');
    }
    return node;
  };
  var updateTabbableNodes = function updateTabbableNodes() {
    state.containerGroups = state.containers.map(function (container) {
      var tabbableNodes = tabbable(container, config.tabbableOptions);

      // NOTE: if we have tabbable nodes, we must have focusable nodes; focusable nodes
      //  are a superset of tabbable nodes since nodes with negative `tabindex` attributes
      //  are focusable but not tabbable
      var focusableNodes = focusable(container, config.tabbableOptions);
      var firstTabbableNode = tabbableNodes.length > 0 ? tabbableNodes[0] : undefined;
      var lastTabbableNode = tabbableNodes.length > 0 ? tabbableNodes[tabbableNodes.length - 1] : undefined;
      var firstDomTabbableNode = focusableNodes.find(function (node) {
        return isTabbable(node);
      });
      var lastDomTabbableNode = focusableNodes.slice().reverse().find(function (node) {
        return isTabbable(node);
      });
      var posTabIndexesFound = !!tabbableNodes.find(function (node) {
        return getTabIndex(node) > 0;
      });
      return {
        container: container,
        tabbableNodes: tabbableNodes,
        focusableNodes: focusableNodes,
        /** True if at least one node with positive `tabindex` was found in this container. */
        posTabIndexesFound: posTabIndexesFound,
        /** First tabbable node in container, __tabindex__ order; `undefined` if none. */
        firstTabbableNode: firstTabbableNode,
        /** Last tabbable node in container, __tabindex__ order; `undefined` if none. */
        lastTabbableNode: lastTabbableNode,
        // NOTE: DOM order is NOT NECESSARILY "document position" order, but figuring that out
        //  would require more than just https://developer.mozilla.org/en-US/docs/Web/API/Node/compareDocumentPosition
        //  because that API doesn't work with Shadow DOM as well as it should (@see
        //  https://github.com/whatwg/dom/issues/320) and since this first/last is only needed, so far,
        //  to address an edge case related to positive tabindex support, this seems like a much easier,
        //  "close enough most of the time" alternative for positive tabindexes which should generally
        //  be avoided anyway...
        /** First tabbable node in container, __DOM__ order; `undefined` if none. */
        firstDomTabbableNode: firstDomTabbableNode,
        /** Last tabbable node in container, __DOM__ order; `undefined` if none. */
        lastDomTabbableNode: lastDomTabbableNode,
        /**
         * Finds the __tabbable__ node that follows the given node in the specified direction,
         *  in this container, if any.
         * @param {HTMLElement} node
         * @param {boolean} [forward] True if going in forward tab order; false if going
         *  in reverse.
         * @returns {HTMLElement|undefined} The next tabbable node, if any.
         */
        nextTabbableNode: function nextTabbableNode(node) {
          var forward = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
          var nodeIdx = tabbableNodes.indexOf(node);
          if (nodeIdx < 0) {
            // either not tabbable nor focusable, or was focused but not tabbable (negative tabindex):
            //  since `node` should at least have been focusable, we assume that's the case and mimic
            //  what browsers do, which is set focus to the next node in __document position order__,
            //  regardless of positive tabindexes, if any -- and for reasons explained in the NOTE
            //  above related to `firstDomTabbable` and `lastDomTabbable` properties, we fall back to
            //  basic DOM order
            if (forward) {
              return focusableNodes.slice(focusableNodes.indexOf(node) + 1).find(function (el) {
                return isTabbable(el);
              });
            }
            return focusableNodes.slice(0, focusableNodes.indexOf(node)).reverse().find(function (el) {
              return isTabbable(el);
            });
          }
          return tabbableNodes[nodeIdx + (forward ? 1 : -1)];
        }
      };
    });
    state.tabbableGroups = state.containerGroups.filter(function (group) {
      return group.tabbableNodes.length > 0;
    });

    // throw if no groups have tabbable nodes and we don't have a fallback focus node either
    if (state.tabbableGroups.length <= 0 && !getNodeForOption('fallbackFocus') // returning false not supported for this option
    ) {
      throw new Error('Your focus-trap must have at least one container with at least one tabbable node in it at all times');
    }

    // NOTE: Positive tabindexes are only properly supported in single-container traps because
    //  doing it across multiple containers where tabindexes could be all over the place
    //  would require Tabbable to support multiple containers, would require additional
    //  specialized Shadow DOM support, and would require Tabbable's multi-container support
    //  to look at those containers in document position order rather than user-provided
    //  order (as they are treated in Focus-trap, for legacy reasons). See discussion on
    //  https://github.com/focus-trap/focus-trap/issues/375 for more details.
    if (state.containerGroups.find(function (g) {
      return g.posTabIndexesFound;
    }) && state.containerGroups.length > 1) {
      throw new Error("At least one node with a positive tabindex was found in one of your focus-trap's multiple containers. Positive tabindexes are only supported in single-container focus-traps.");
    }
  };

  /**
   * Gets the current activeElement. If it's a web-component and has open shadow-root
   * it will recursively search inside shadow roots for the "true" activeElement.
   *
   * @param {Document | ShadowRoot} el
   *
   * @returns {HTMLElement} The element that currently has the focus
   **/
  var getActiveElement = function getActiveElement(el) {
    var activeElement = el.activeElement;
    if (!activeElement) {
      return;
    }
    if (activeElement.shadowRoot && activeElement.shadowRoot.activeElement !== null) {
      return getActiveElement(activeElement.shadowRoot);
    }
    return activeElement;
  };
  var tryFocus = function tryFocus(node) {
    if (node === false) {
      return;
    }
    if (node === getActiveElement(document)) {
      return;
    }
    if (!node || !node.focus) {
      tryFocus(getInitialFocusNode());
      return;
    }
    node.focus({
      preventScroll: !!config.preventScroll
    });
    // NOTE: focus() API does not trigger focusIn event so set MRU node manually
    state.mostRecentlyFocusedNode = node;
    if (isSelectableInput(node)) {
      node.select();
    }
  };
  var getReturnFocusNode = function getReturnFocusNode(previousActiveElement) {
    var node = getNodeForOption('setReturnFocus', previousActiveElement);
    return node ? node : node === false ? false : previousActiveElement;
  };

  /**
   * Finds the next node (in either direction) where focus should move according to a
   *  keyboard focus-in event.
   * @param {Object} params
   * @param {Node} [params.target] Known target __from which__ to navigate, if any.
   * @param {KeyboardEvent|FocusEvent} [params.event] Event to use if `target` isn't known (event
   *  will be used to determine the `target`). Ignored if `target` is specified.
   * @param {boolean} [params.isBackward] True if focus should move backward.
   * @returns {Node|undefined} The next node, or `undefined` if a next node couldn't be
   *  determined given the current state of the trap.
   */
  var findNextNavNode = function findNextNavNode(_ref2) {
    var target = _ref2.target,
      event = _ref2.event,
      _ref2$isBackward = _ref2.isBackward,
      isBackward = _ref2$isBackward === void 0 ? false : _ref2$isBackward;
    target = target || getActualTarget(event);
    updateTabbableNodes();
    var destinationNode = null;
    if (state.tabbableGroups.length > 0) {
      // make sure the target is actually contained in a group
      // NOTE: the target may also be the container itself if it's focusable
      //  with tabIndex='-1' and was given initial focus
      var containerIndex = findContainerIndex(target, event);
      var containerGroup = containerIndex >= 0 ? state.containerGroups[containerIndex] : undefined;
      if (containerIndex < 0) {
        // target not found in any group: quite possible focus has escaped the trap,
        //  so bring it back into...
        if (isBackward) {
          // ...the last node in the last group
          destinationNode = state.tabbableGroups[state.tabbableGroups.length - 1].lastTabbableNode;
        } else {
          // ...the first node in the first group
          destinationNode = state.tabbableGroups[0].firstTabbableNode;
        }
      } else if (isBackward) {
        // REVERSE

        // is the target the first tabbable node in a group?
        var startOfGroupIndex = findIndex(state.tabbableGroups, function (_ref3) {
          var firstTabbableNode = _ref3.firstTabbableNode;
          return target === firstTabbableNode;
        });
        if (startOfGroupIndex < 0 && (containerGroup.container === target || isFocusable(target, config.tabbableOptions) && !isTabbable(target, config.tabbableOptions) && !containerGroup.nextTabbableNode(target, false))) {
          // an exception case where the target is either the container itself, or
          //  a non-tabbable node that was given focus (i.e. tabindex is negative
          //  and user clicked on it or node was programmatically given focus)
          //  and is not followed by any other tabbable node, in which
          //  case, we should handle shift+tab as if focus were on the container's
          //  first tabbable node, and go to the last tabbable node of the LAST group
          startOfGroupIndex = containerIndex;
        }
        if (startOfGroupIndex >= 0) {
          // YES: then shift+tab should go to the last tabbable node in the
          //  previous group (and wrap around to the last tabbable node of
          //  the LAST group if it's the first tabbable node of the FIRST group)
          var destinationGroupIndex = startOfGroupIndex === 0 ? state.tabbableGroups.length - 1 : startOfGroupIndex - 1;
          var destinationGroup = state.tabbableGroups[destinationGroupIndex];
          destinationNode = getTabIndex(target) >= 0 ? destinationGroup.lastTabbableNode : destinationGroup.lastDomTabbableNode;
        } else if (!isTabEvent(event)) {
          // user must have customized the nav keys so we have to move focus manually _within_
          //  the active group: do this based on the order determined by tabbable()
          destinationNode = containerGroup.nextTabbableNode(target, false);
        }
      } else {
        // FORWARD

        // is the target the last tabbable node in a group?
        var lastOfGroupIndex = findIndex(state.tabbableGroups, function (_ref4) {
          var lastTabbableNode = _ref4.lastTabbableNode;
          return target === lastTabbableNode;
        });
        if (lastOfGroupIndex < 0 && (containerGroup.container === target || isFocusable(target, config.tabbableOptions) && !isTabbable(target, config.tabbableOptions) && !containerGroup.nextTabbableNode(target))) {
          // an exception case where the target is the container itself, or
          //  a non-tabbable node that was given focus (i.e. tabindex is negative
          //  and user clicked on it or node was programmatically given focus)
          //  and is not followed by any other tabbable node, in which
          //  case, we should handle tab as if focus were on the container's
          //  last tabbable node, and go to the first tabbable node of the FIRST group
          lastOfGroupIndex = containerIndex;
        }
        if (lastOfGroupIndex >= 0) {
          // YES: then tab should go to the first tabbable node in the next
          //  group (and wrap around to the first tabbable node of the FIRST
          //  group if it's the last tabbable node of the LAST group)
          var _destinationGroupIndex = lastOfGroupIndex === state.tabbableGroups.length - 1 ? 0 : lastOfGroupIndex + 1;
          var _destinationGroup = state.tabbableGroups[_destinationGroupIndex];
          destinationNode = getTabIndex(target) >= 0 ? _destinationGroup.firstTabbableNode : _destinationGroup.firstDomTabbableNode;
        } else if (!isTabEvent(event)) {
          // user must have customized the nav keys so we have to move focus manually _within_
          //  the active group: do this based on the order determined by tabbable()
          destinationNode = containerGroup.nextTabbableNode(target);
        }
      }
    } else {
      // no groups available
      // NOTE: the fallbackFocus option does not support returning false to opt-out
      destinationNode = getNodeForOption('fallbackFocus');
    }
    return destinationNode;
  };

  // This needs to be done on mousedown and touchstart instead of click
  // so that it precedes the focus event.
  var checkPointerDown = function checkPointerDown(e) {
    var target = getActualTarget(e);
    if (findContainerIndex(target, e) >= 0) {
      // allow the click since it ocurred inside the trap
      return;
    }
    if (valueOrHandler(config.clickOutsideDeactivates, e)) {
      // immediately deactivate the trap
      trap.deactivate({
        // NOTE: by setting `returnFocus: false`, deactivate() will do nothing,
        //  which will result in the outside click setting focus to the node
        //  that was clicked (and if not focusable, to "nothing"); by setting
        //  `returnFocus: true`, we'll attempt to re-focus the node originally-focused
        //  on activation (or the configured `setReturnFocus` node), whether the
        //  outside click was on a focusable node or not
        returnFocus: config.returnFocusOnDeactivate
      });
      return;
    }

    // This is needed for mobile devices.
    // (If we'll only let `click` events through,
    // then on mobile they will be blocked anyways if `touchstart` is blocked.)
    if (valueOrHandler(config.allowOutsideClick, e)) {
      // allow the click outside the trap to take place
      return;
    }

    // otherwise, prevent the click
    e.preventDefault();
  };

  // In case focus escapes the trap for some strange reason, pull it back in.
  // NOTE: the focusIn event is NOT cancelable, so if focus escapes, it may cause unexpected
  //  scrolling if the node that got focused was out of view; there's nothing we can do to
  //  prevent that from happening by the time we discover that focus escaped
  var checkFocusIn = function checkFocusIn(event) {
    var target = getActualTarget(event);
    var targetContained = findContainerIndex(target, event) >= 0;

    // In Firefox when you Tab out of an iframe the Document is briefly focused.
    if (targetContained || target instanceof Document) {
      if (targetContained) {
        state.mostRecentlyFocusedNode = target;
      }
    } else {
      // escaped! pull it back in to where it just left
      event.stopImmediatePropagation();

      // focus will escape if the MRU node had a positive tab index and user tried to nav forward;
      //  it will also escape if the MRU node had a 0 tab index and user tried to nav backward
      //  toward a node with a positive tab index
      var nextNode; // next node to focus, if we find one
      var navAcrossContainers = true;
      if (state.mostRecentlyFocusedNode) {
        if (getTabIndex(state.mostRecentlyFocusedNode) > 0) {
          // MRU container index must be >=0 otherwise we wouldn't have it as an MRU node...
          var mruContainerIdx = findContainerIndex(state.mostRecentlyFocusedNode);
          // there MAY not be any tabbable nodes in the container if there are at least 2 containers
          //  and the MRU node is focusable but not tabbable (focus-trap requires at least 1 container
          //  with at least one tabbable node in order to function, so this could be the other container
          //  with nothing tabbable in it)
          var tabbableNodes = state.containerGroups[mruContainerIdx].tabbableNodes;
          if (tabbableNodes.length > 0) {
            // MRU tab index MAY not be found if the MRU node is focusable but not tabbable
            var mruTabIdx = tabbableNodes.findIndex(function (node) {
              return node === state.mostRecentlyFocusedNode;
            });
            if (mruTabIdx >= 0) {
              if (config.isKeyForward(state.recentNavEvent)) {
                if (mruTabIdx + 1 < tabbableNodes.length) {
                  nextNode = tabbableNodes[mruTabIdx + 1];
                  navAcrossContainers = false;
                }
                // else, don't wrap within the container as focus should move to next/previous
                //  container
              } else {
                if (mruTabIdx - 1 >= 0) {
                  nextNode = tabbableNodes[mruTabIdx - 1];
                  navAcrossContainers = false;
                }
                // else, don't wrap within the container as focus should move to next/previous
                //  container
              }
              // else, don't find in container order without considering direction too
            }
          }
          // else, no tabbable nodes in that container (which means we must have at least one other
          //  container with at least one tabbable node in it, otherwise focus-trap would've thrown
          //  an error the last time updateTabbableNodes() was run): find next node among all known
          //  containers
        } else {
          // check to see if there's at least one tabbable node with a positive tab index inside
          //  the trap because focus seems to escape when navigating backward from a tabbable node
          //  with tabindex=0 when this is the case (instead of wrapping to the tabbable node with
          //  the greatest positive tab index like it should)
          if (!state.containerGroups.some(function (g) {
            return g.tabbableNodes.some(function (n) {
              return getTabIndex(n) > 0;
            });
          })) {
            // no containers with tabbable nodes with positive tab indexes which means the focus
            //  escaped for some other reason and we should just execute the fallback to the
            //  MRU node or initial focus node, if any
            navAcrossContainers = false;
          }
        }
      } else {
        // no MRU node means we're likely in some initial condition when the trap has just
        //  been activated and initial focus hasn't been given yet, in which case we should
        //  fall through to trying to focus the initial focus node, which is what should
        //  happen below at this point in the logic
        navAcrossContainers = false;
      }
      if (navAcrossContainers) {
        nextNode = findNextNavNode({
          // move FROM the MRU node, not event-related node (which will be the node that is
          //  outside the trap causing the focus escape we're trying to fix)
          target: state.mostRecentlyFocusedNode,
          isBackward: config.isKeyBackward(state.recentNavEvent)
        });
      }
      if (nextNode) {
        tryFocus(nextNode);
      } else {
        tryFocus(state.mostRecentlyFocusedNode || getInitialFocusNode());
      }
    }
    state.recentNavEvent = undefined; // clear
  };

  // Hijack key nav events on the first and last focusable nodes of the trap,
  // in order to prevent focus from escaping. If it escapes for even a
  // moment it can end up scrolling the page and causing confusion so we
  // kind of need to capture the action at the keydown phase.
  var checkKeyNav = function checkKeyNav(event) {
    var isBackward = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    state.recentNavEvent = event;
    var destinationNode = findNextNavNode({
      event: event,
      isBackward: isBackward
    });
    if (destinationNode) {
      if (isTabEvent(event)) {
        // since tab natively moves focus, we wouldn't have a destination node unless we
        //  were on the edge of a container and had to move to the next/previous edge, in
        //  which case we want to prevent default to keep the browser from moving focus
        //  to where it normally would
        event.preventDefault();
      }
      tryFocus(destinationNode);
    }
    // else, let the browser take care of [shift+]tab and move the focus
  };

  var checkKey = function checkKey(event) {
    if (isEscapeEvent(event) && valueOrHandler(config.escapeDeactivates, event) !== false) {
      event.preventDefault();
      trap.deactivate();
      return;
    }
    if (config.isKeyForward(event) || config.isKeyBackward(event)) {
      checkKeyNav(event, config.isKeyBackward(event));
    }
  };
  var checkClick = function checkClick(e) {
    var target = getActualTarget(e);
    if (findContainerIndex(target, e) >= 0) {
      return;
    }
    if (valueOrHandler(config.clickOutsideDeactivates, e)) {
      return;
    }
    if (valueOrHandler(config.allowOutsideClick, e)) {
      return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
  };

  //
  // EVENT LISTENERS
  //

  var addListeners = function addListeners() {
    if (!state.active) {
      return;
    }

    // There can be only one listening focus trap at a time
    activeFocusTraps.activateTrap(trapStack, trap);

    // Delay ensures that the focused element doesn't capture the event
    // that caused the focus trap activation.
    state.delayInitialFocusTimer = config.delayInitialFocus ? delay(function () {
      tryFocus(getInitialFocusNode());
    }) : tryFocus(getInitialFocusNode());
    doc.addEventListener('focusin', checkFocusIn, true);
    doc.addEventListener('mousedown', checkPointerDown, {
      capture: true,
      passive: false
    });
    doc.addEventListener('touchstart', checkPointerDown, {
      capture: true,
      passive: false
    });
    doc.addEventListener('click', checkClick, {
      capture: true,
      passive: false
    });
    doc.addEventListener('keydown', checkKey, {
      capture: true,
      passive: false
    });
    return trap;
  };
  var removeListeners = function removeListeners() {
    if (!state.active) {
      return;
    }
    doc.removeEventListener('focusin', checkFocusIn, true);
    doc.removeEventListener('mousedown', checkPointerDown, true);
    doc.removeEventListener('touchstart', checkPointerDown, true);
    doc.removeEventListener('click', checkClick, true);
    doc.removeEventListener('keydown', checkKey, true);
    return trap;
  };

  //
  // MUTATION OBSERVER
  //

  var checkDomRemoval = function checkDomRemoval(mutations) {
    var isFocusedNodeRemoved = mutations.some(function (mutation) {
      var removedNodes = Array.from(mutation.removedNodes);
      return removedNodes.some(function (node) {
        return node === state.mostRecentlyFocusedNode;
      });
    });

    // If the currently focused is removed then browsers will move focus to the
    // <body> element. If this happens, try to move focus back into the trap.
    if (isFocusedNodeRemoved) {
      tryFocus(getInitialFocusNode());
    }
  };

  // Use MutationObserver - if supported - to detect if focused node is removed
  // from the DOM.
  var mutationObserver = typeof window !== 'undefined' && 'MutationObserver' in window ? new MutationObserver(checkDomRemoval) : undefined;
  var updateObservedNodes = function updateObservedNodes() {
    if (!mutationObserver) {
      return;
    }
    mutationObserver.disconnect();
    if (state.active && !state.paused) {
      state.containers.map(function (container) {
        mutationObserver.observe(container, {
          subtree: true,
          childList: true
        });
      });
    }
  };

  //
  // TRAP DEFINITION
  //

  trap = {
    get active() {
      return state.active;
    },
    get paused() {
      return state.paused;
    },
    activate: function activate(activateOptions) {
      if (state.active) {
        return this;
      }
      var onActivate = getOption(activateOptions, 'onActivate');
      var onPostActivate = getOption(activateOptions, 'onPostActivate');
      var checkCanFocusTrap = getOption(activateOptions, 'checkCanFocusTrap');
      if (!checkCanFocusTrap) {
        updateTabbableNodes();
      }
      state.active = true;
      state.paused = false;
      state.nodeFocusedBeforeActivation = doc.activeElement;
      onActivate === null || onActivate === void 0 || onActivate();
      var finishActivation = function finishActivation() {
        if (checkCanFocusTrap) {
          updateTabbableNodes();
        }
        addListeners();
        updateObservedNodes();
        onPostActivate === null || onPostActivate === void 0 || onPostActivate();
      };
      if (checkCanFocusTrap) {
        checkCanFocusTrap(state.containers.concat()).then(finishActivation, finishActivation);
        return this;
      }
      finishActivation();
      return this;
    },
    deactivate: function deactivate(deactivateOptions) {
      if (!state.active) {
        return this;
      }
      var options = _objectSpread2({
        onDeactivate: config.onDeactivate,
        onPostDeactivate: config.onPostDeactivate,
        checkCanReturnFocus: config.checkCanReturnFocus
      }, deactivateOptions);
      clearTimeout(state.delayInitialFocusTimer); // noop if undefined
      state.delayInitialFocusTimer = undefined;
      removeListeners();
      state.active = false;
      state.paused = false;
      updateObservedNodes();
      activeFocusTraps.deactivateTrap(trapStack, trap);
      var onDeactivate = getOption(options, 'onDeactivate');
      var onPostDeactivate = getOption(options, 'onPostDeactivate');
      var checkCanReturnFocus = getOption(options, 'checkCanReturnFocus');
      var returnFocus = getOption(options, 'returnFocus', 'returnFocusOnDeactivate');
      onDeactivate === null || onDeactivate === void 0 || onDeactivate();
      var finishDeactivation = function finishDeactivation() {
        delay(function () {
          if (returnFocus) {
            tryFocus(getReturnFocusNode(state.nodeFocusedBeforeActivation));
          }
          onPostDeactivate === null || onPostDeactivate === void 0 || onPostDeactivate();
        });
      };
      if (returnFocus && checkCanReturnFocus) {
        checkCanReturnFocus(getReturnFocusNode(state.nodeFocusedBeforeActivation)).then(finishDeactivation, finishDeactivation);
        return this;
      }
      finishDeactivation();
      return this;
    },
    pause: function pause(pauseOptions) {
      if (state.paused || !state.active) {
        return this;
      }
      var onPause = getOption(pauseOptions, 'onPause');
      var onPostPause = getOption(pauseOptions, 'onPostPause');
      state.paused = true;
      onPause === null || onPause === void 0 || onPause();
      removeListeners();
      updateObservedNodes();
      onPostPause === null || onPostPause === void 0 || onPostPause();
      return this;
    },
    unpause: function unpause(unpauseOptions) {
      if (!state.paused || !state.active) {
        return this;
      }
      var onUnpause = getOption(unpauseOptions, 'onUnpause');
      var onPostUnpause = getOption(unpauseOptions, 'onPostUnpause');
      state.paused = false;
      onUnpause === null || onUnpause === void 0 || onUnpause();
      updateTabbableNodes();
      addListeners();
      updateObservedNodes();
      onPostUnpause === null || onPostUnpause === void 0 || onPostUnpause();
      return this;
    },
    updateContainerElements: function updateContainerElements(containerElements) {
      var elementsAsArray = [].concat(containerElements).filter(Boolean);
      state.containers = elementsAsArray.map(function (element) {
        return typeof element === 'string' ? doc.querySelector(element) : element;
      });
      if (state.active) {
        updateTabbableNodes();
      }
      updateObservedNodes();
      return this;
    }
  };

  // initialize container elements
  trap.updateContainerElements(elements);
  return trap;
};

const dirty_components = [];
const binding_callbacks = [];
let render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = /* @__PURE__ */ Promise.resolve();
let update_scheduled = false;
function schedule_update() {
  if (!update_scheduled) {
    update_scheduled = true;
    resolved_promise.then(flush);
  }
}
function tick() {
  schedule_update();
  return resolved_promise;
}
function add_render_callback(fn) {
  render_callbacks.push(fn);
}
const seen_callbacks = /* @__PURE__ */ new Set();
let flushidx = 0;
function flush() {
  if (flushidx !== 0) {
    return;
  }
  const saved_component = current_component;
  do {
    try {
      while (flushidx < dirty_components.length) {
        const component = dirty_components[flushidx];
        flushidx++;
        set_current_component(component);
        update(component.$$);
      }
    } catch (e) {
      dirty_components.length = 0;
      flushidx = 0;
      throw e;
    }
    set_current_component(null);
    dirty_components.length = 0;
    flushidx = 0;
    while (binding_callbacks.length)
      binding_callbacks.pop()();
    for (let i = 0; i < render_callbacks.length; i += 1) {
      const callback = render_callbacks[i];
      if (!seen_callbacks.has(callback)) {
        seen_callbacks.add(callback);
        callback();
      }
    }
    render_callbacks.length = 0;
  } while (dirty_components.length);
  while (flush_callbacks.length) {
    flush_callbacks.pop()();
  }
  update_scheduled = false;
  seen_callbacks.clear();
  set_current_component(saved_component);
}
function update($$) {
  if ($$.fragment !== null) {
    $$.update();
    run_all($$.before_update);
    const dirty = $$.dirty;
    $$.dirty = [-1];
    $$.fragment && $$.fragment.p($$.ctx, dirty);
    $$.after_update.forEach(add_render_callback);
  }
}
const void_element_names = /^(?:area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)$/;
function is_void(name2) {
  return void_element_names.test(name2) || name2.toLowerCase() === "!doctype";
}
function wrapArray(array, startIndex) {
  return array.map((_, index) => array[(startIndex + index) % array.length]);
}
function styleToString$1(style) {
  return Object.keys(style).reduce((str, key) => {
    if (style[key] === void 0)
      return str;
    return str + `${key}:${style[key]};`;
  }, "");
}
function disabledAttr(disabled) {
  return disabled ? true : void 0;
}
const hiddenInputAttrs = {
  type: "hidden",
  "aria-hidden": true,
  hidden: true,
  tabIndex: -1,
  style: styleToString$1({
    position: "absolute",
    opacity: 0,
    "pointer-events": "none",
    margin: 0,
    transform: "translateX(-100%)"
  })
};
function lightable(value) {
  function subscribe(run) {
    run(value);
    return () => {
    };
  }
  return { subscribe };
}
function getElementByMeltId(id) {
  if (!isBrowser)
    return null;
  const el = document.querySelector(`[data-melt-id="${id}"]`);
  return isHTMLElement(el) ? el : null;
}
const hiddenAction = (obj) => {
  return new Proxy(obj, {
    get(target, prop, receiver) {
      return Reflect.get(target, prop, receiver);
    },
    ownKeys(target) {
      return Reflect.ownKeys(target).filter((key) => key !== "action");
    }
  });
};
const isFunctionWithParams = (fn) => {
  return typeof fn === "function";
};
function builder(name2, args) {
  const { stores, action, returned } = args ?? {};
  const derivedStore = (() => {
    if (stores && returned) {
      return derived(stores, (values) => {
        const result = returned(values);
        if (isFunctionWithParams(result)) {
          const fn = (...args2) => {
            return hiddenAction({
              ...result(...args2),
              [`data-melt-${name2}`]: "",
              action: action ?? noop
            });
          };
          fn.action = action ?? noop;
          return fn;
        }
        return hiddenAction({
          ...result,
          [`data-melt-${name2}`]: "",
          action: action ?? noop
        });
      });
    } else {
      const returnedFn = returned;
      const result = returnedFn?.();
      if (isFunctionWithParams(result)) {
        const resultFn = (...args2) => {
          return hiddenAction({
            ...result(...args2),
            [`data-melt-${name2}`]: "",
            action: action ?? noop
          });
        };
        resultFn.action = action ?? noop;
        return lightable(resultFn);
      }
      return lightable(hiddenAction({
        ...result,
        [`data-melt-${name2}`]: "",
        action: action ?? noop
      }));
    }
  })();
  const actionFn = action ?? (() => {
  });
  actionFn.subscribe = derivedStore.subscribe;
  return actionFn;
}
function createElHelpers(prefix) {
  const name2 = (part) => part ? `${prefix}-${part}` : prefix;
  const attribute = (part) => `data-melt-${prefix}${part ? `-${part}` : ""}`;
  const selector2 = (part) => `[data-melt-${prefix}${part ? `-${part}` : ""}]`;
  const getEl = (part) => document.querySelector(selector2(part));
  return {
    name: name2,
    attribute,
    selector: selector2,
    getEl
  };
}
const isBrowser = typeof document !== "undefined";
const isFunction = (v) => typeof v === "function";
function isHTMLElement(element) {
  return element instanceof HTMLElement;
}
function isElementDisabled(element) {
  const ariaDisabled = element.getAttribute("aria-disabled");
  const disabled = element.getAttribute("disabled");
  const dataDisabled = element.hasAttribute("data-disabled");
  if (ariaDisabled === "true" || disabled !== null || dataDisabled) {
    return true;
  }
  return false;
}
function executeCallbacks(...callbacks) {
  return (...args) => {
    for (const callback of callbacks) {
      if (typeof callback === "function") {
        callback(...args);
      }
    }
  };
}
function noop() {
}
function addEventListener(target, event, handler, options) {
  const events = Array.isArray(event) ? event : [event];
  events.forEach((_event) => target.addEventListener(_event, handler, options));
  return () => {
    events.forEach((_event) => target.removeEventListener(_event, handler, options));
  };
}
function addMeltEventListener(target, event, handler, options) {
  const events = Array.isArray(event) ? event : [event];
  if (typeof handler === "function") {
    const handlerWithMelt = withMelt((_event) => handler(_event));
    events.forEach((_event) => target.addEventListener(_event, handlerWithMelt, options));
    return () => {
      events.forEach((_event) => target.removeEventListener(_event, handlerWithMelt, options));
    };
  }
  return () => noop();
}
function dispatchMeltEvent(originalEvent) {
  const node = originalEvent.currentTarget;
  if (!isHTMLElement(node))
    return null;
  const customMeltEvent = new CustomEvent(`m-${originalEvent.type}`, {
    detail: {
      originalEvent
    },
    cancelable: true
  });
  node.dispatchEvent(customMeltEvent);
  return customMeltEvent;
}
function withMelt(handler) {
  return (event) => {
    const customEvent = dispatchMeltEvent(event);
    if (customEvent?.defaultPrevented)
      return;
    return handler(event);
  };
}
function addHighlight(element) {
  element.setAttribute("data-highlighted", "");
}
function removeHighlight(element) {
  element.removeAttribute("data-highlighted");
}
function getElemDirection(elem) {
  const style = window.getComputedStyle(elem);
  const direction = style.getPropertyValue("direction");
  return direction;
}
function omit(obj, ...keys) {
  const result = {};
  for (const key of Object.keys(obj)) {
    if (!keys.includes(key)) {
      result[key] = obj[key];
    }
  }
  return result;
}
const overridable = (store, onChange) => {
  const update2 = (updater, sideEffect) => {
    store.update((curr) => {
      const next = updater(curr);
      let res = next;
      if (onChange) {
        res = onChange({ curr, next });
      }
      sideEffect?.(res);
      return res;
    });
  };
  const set = (curr) => {
    update2(() => curr);
  };
  return {
    ...store,
    update: update2,
    set
  };
};
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function generateId$1() {
  return nanoid(10);
}
function generateIds(args) {
  return args.reduce((acc, curr) => {
    acc[curr] = generateId$1();
    return acc;
  }, {});
}
const kbd = {
  ALT: "Alt",
  ARROW_DOWN: "ArrowDown",
  ARROW_LEFT: "ArrowLeft",
  ARROW_RIGHT: "ArrowRight",
  ARROW_UP: "ArrowUp",
  BACKSPACE: "Backspace",
  CAPS_LOCK: "CapsLock",
  CONTROL: "Control",
  DELETE: "Delete",
  END: "End",
  ENTER: "Enter",
  ESCAPE: "Escape",
  F1: "F1",
  F10: "F10",
  F11: "F11",
  F12: "F12",
  F2: "F2",
  F3: "F3",
  F4: "F4",
  F5: "F5",
  F6: "F6",
  F7: "F7",
  F8: "F8",
  F9: "F9",
  HOME: "Home",
  META: "Meta",
  PAGE_DOWN: "PageDown",
  PAGE_UP: "PageUp",
  SHIFT: "Shift",
  SPACE: " ",
  TAB: "Tab",
  CTRL: "Control",
  ASTERISK: "*",
  A: "a",
  P: "p"
};
const FIRST_KEYS = [kbd.ARROW_DOWN, kbd.PAGE_UP, kbd.HOME];
const LAST_KEYS = [kbd.ARROW_UP, kbd.PAGE_DOWN, kbd.END];
const FIRST_LAST_KEYS = [...FIRST_KEYS, ...LAST_KEYS];
const SELECTION_KEYS = [kbd.ENTER, kbd.SPACE];
const getNextKey = (dir = "ltr", orientation = "horizontal") => {
  return {
    horizontal: dir === "rtl" ? kbd.ARROW_LEFT : kbd.ARROW_RIGHT,
    vertical: kbd.ARROW_DOWN
  }[orientation];
};
const getPrevKey = (dir = "ltr", orientation = "horizontal") => {
  return {
    horizontal: dir === "rtl" ? kbd.ARROW_RIGHT : kbd.ARROW_LEFT,
    vertical: kbd.ARROW_UP
  }[orientation];
};
const getDirectionalKeys = (dir = "ltr", orientation = "horizontal") => {
  return {
    nextKey: getNextKey(dir, orientation),
    prevKey: getPrevKey(dir, orientation)
  };
};
function debounce(fn, wait = 500) {
  let timeout = null;
  return function(...args) {
    const later = () => {
      timeout = null;
      fn(...args);
    };
    timeout && clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
const isDom = () => typeof window !== "undefined";
function getPlatform() {
  const agent = navigator.userAgentData;
  return agent?.platform ?? navigator.platform;
}
const pt = (v) => isDom() && v.test(getPlatform().toLowerCase());
const isTouchDevice = () => isDom() && !!navigator.maxTouchPoints;
const isMac = () => pt(/^mac/) && !isTouchDevice();
const isApple = () => pt(/mac|iphone|ipad|ipod/i);
const isIos = () => isApple() && !isMac();
const LOCK_CLASSNAME = "data-melt-scroll-lock";
function assignStyle(el, style) {
  if (!el)
    return;
  const previousStyle = el.style.cssText;
  Object.assign(el.style, style);
  return () => {
    el.style.cssText = previousStyle;
  };
}
function setCSSProperty(el, property, value) {
  if (!el)
    return;
  const previousValue = el.style.getPropertyValue(property);
  el.style.setProperty(property, value);
  return () => {
    if (previousValue) {
      el.style.setProperty(property, previousValue);
    } else {
      el.style.removeProperty(property);
    }
  };
}
function getPaddingProperty(documentElement) {
  const documentLeft = documentElement.getBoundingClientRect().left;
  const scrollbarX = Math.round(documentLeft) + documentElement.scrollLeft;
  return scrollbarX ? "paddingLeft" : "paddingRight";
}
function removeScroll(_document) {
  const doc = _document ?? document;
  const win = doc.defaultView ?? window;
  const { documentElement, body } = doc;
  const locked = body.hasAttribute(LOCK_CLASSNAME);
  if (locked)
    return noop;
  body.setAttribute(LOCK_CLASSNAME, "");
  const scrollbarWidth = win.innerWidth - documentElement.clientWidth;
  const setScrollbarWidthProperty = () => setCSSProperty(documentElement, "--scrollbar-width", `${scrollbarWidth}px`);
  const paddingProperty = getPaddingProperty(documentElement);
  const scrollbarSidePadding = win.getComputedStyle(body)[paddingProperty];
  const setStyle = () => assignStyle(body, {
    overflow: "hidden",
    [paddingProperty]: `calc(${scrollbarSidePadding} + ${scrollbarWidth}px)`
  });
  const setIOSStyle = () => {
    const { scrollX, scrollY, visualViewport } = win;
    const offsetLeft = visualViewport?.offsetLeft ?? 0;
    const offsetTop = visualViewport?.offsetTop ?? 0;
    const restoreStyle = assignStyle(body, {
      position: "fixed",
      overflow: "hidden",
      top: `${-(scrollY - Math.floor(offsetTop))}px`,
      left: `${-(scrollX - Math.floor(offsetLeft))}px`,
      right: "0",
      [paddingProperty]: `calc(${scrollbarSidePadding} + ${scrollbarWidth}px)`
    });
    return () => {
      restoreStyle?.();
      win.scrollTo(scrollX, scrollY);
    };
  };
  const cleanups = [setScrollbarWidthProperty(), isIos() ? setIOSStyle() : setStyle()];
  return () => {
    cleanups.forEach((fn) => fn?.());
    body.removeAttribute(LOCK_CLASSNAME);
  };
}
function derivedVisible(obj) {
  const { open, forceVisible, activeTrigger } = obj;
  return derived([open, forceVisible, activeTrigger], ([$open, $forceVisible, $activeTrigger]) => ($open || $forceVisible) && $activeTrigger !== null);
}
function derivedWithUnsubscribe(stores, fn) {
  let unsubscribers = [];
  const onUnsubscribe = (cb) => {
    unsubscribers.push(cb);
  };
  const unsubscribe = () => {
    unsubscribers.forEach((fn2) => fn2());
    unsubscribers = [];
  };
  const derivedStore = derived(stores, ($storeValues) => {
    unsubscribe();
    return fn($storeValues, onUnsubscribe);
  });
  onDestroy(unsubscribe);
  const subscribe = (...args) => {
    const unsub = derivedStore.subscribe(...args);
    return () => {
      unsub();
      unsubscribe();
    };
  };
  return {
    ...derivedStore,
    subscribe
  };
}
function effect(stores, fn) {
  const unsub = derivedWithUnsubscribe(stores, (stores2, onUnsubscribe) => {
    return {
      stores: stores2,
      onUnsubscribe
    };
  }).subscribe(({ stores: stores2, onUnsubscribe }) => {
    const returned = fn(stores2);
    if (returned) {
      onUnsubscribe(returned);
    }
  });
  onDestroy(unsub);
  return unsub;
}
function toWritableStores(properties) {
  const result = {};
  Object.keys(properties).forEach((key) => {
    const propertyKey = key;
    const value = properties[propertyKey];
    result[propertyKey] = writable(value);
  });
  return result;
}
function handleRovingFocus(nextElement) {
  if (!isBrowser)
    return;
  sleep(1).then(() => {
    const currentFocusedElement = document.activeElement;
    if (!isHTMLElement(currentFocusedElement) || currentFocusedElement === nextElement)
      return;
    currentFocusedElement.tabIndex = -1;
    if (nextElement) {
      nextElement.tabIndex = 0;
      nextElement.focus();
    }
  });
}
function getFocusableElements() {
  return Array.from(document.querySelectorAll('a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])'));
}
function getNextFocusable(currentElement) {
  const focusableElements = getFocusableElements();
  const currentIndex = focusableElements.indexOf(currentElement);
  const nextIndex = currentIndex + 1;
  const nextElement = focusableElements[nextIndex];
  if (nextIndex < focusableElements.length && isHTMLElement(nextElement)) {
    return nextElement;
  }
  return null;
}
function getPreviousFocusable(currentElement) {
  const focusableElements = getFocusableElements();
  const currentIndex = focusableElements.indexOf(currentElement);
  const previousIndex = currentIndex - 1;
  const prevElement = focusableElements[previousIndex];
  if (previousIndex >= 0 && isHTMLElement(prevElement)) {
    return prevElement;
  }
  return null;
}
const defaults$6 = {
  onMatch: handleRovingFocus,
  getCurrentItem: () => document.activeElement
};
function createTypeaheadSearch(args = {}) {
  const withDefaults = { ...defaults$6, ...args };
  const typed = writable([]);
  const resetTyped = debounce(() => {
    typed.update(() => []);
  });
  const handleTypeaheadSearch = (key, items) => {
    const currentItem = withDefaults.getCurrentItem();
    const $typed = get_store_value(typed);
    if (!Array.isArray($typed)) {
      return;
    }
    $typed.push(key.toLowerCase());
    typed.set($typed);
    const candidateItems = items.filter((item) => {
      if (item.getAttribute("disabled") === "true" || item.getAttribute("aria-disabled") === "true" || item.hasAttribute("data-disabled")) {
        return false;
      }
      return true;
    });
    const isRepeated = $typed.length > 1 && $typed.every((char) => char === $typed[0]);
    const normalizeSearch = isRepeated ? $typed[0] : $typed.join("");
    const currentItemIndex = isHTMLElement(currentItem) ? candidateItems.indexOf(currentItem) : -1;
    let wrappedItems = wrapArray(candidateItems, Math.max(currentItemIndex, 0));
    const excludeCurrentItem = normalizeSearch.length === 1;
    if (excludeCurrentItem) {
      wrappedItems = wrappedItems.filter((v) => v !== currentItem);
    }
    const nextItem = wrappedItems.find((item) => item?.innerText && item.innerText.toLowerCase().startsWith(normalizeSearch.toLowerCase()));
    if (isHTMLElement(nextItem) && nextItem !== currentItem) {
      withDefaults.onMatch(nextItem);
    }
    resetTyped();
  };
  return {
    typed,
    resetTyped,
    handleTypeaheadSearch
  };
}
function getPortalParent(node) {
  let parent = node.parentElement;
  while (isHTMLElement(parent) && !parent.hasAttribute("data-portal")) {
    parent = parent.parentElement;
  }
  return parent || "body";
}
function getPortalDestination(node, portalProp) {
  const portalParent = getPortalParent(node);
  if (portalProp !== void 0)
    return portalProp;
  if (portalParent === "body")
    return document.body;
  return null;
}
function handleFocus(args) {
  const { prop, defaultEl } = args;
  sleep(1).then(() => {
    if (prop === void 0) {
      defaultEl?.focus();
      return;
    }
    const returned = isFunction(prop) ? prop(defaultEl) : prop;
    if (typeof returned === "string") {
      const el = document.querySelector(returned);
      if (!isHTMLElement(el))
        return;
      el.focus();
    } else if (isHTMLElement(returned)) {
      returned.focus();
    }
  });
}
const { name: name$2, selector: selector$1 } = createElHelpers("accordion");
const defaults$5 = {
  multiple: false,
  disabled: false,
  forceVisible: false
};
const createAccordion = (props) => {
  const withDefaults = { ...defaults$5, ...props };
  const options = toWritableStores(omit(withDefaults, "value", "onValueChange", "defaultValue"));
  const meltIds = generateIds(["root"]);
  const { disabled, forceVisible } = options;
  const valueWritable = withDefaults.value ?? writable(withDefaults.defaultValue);
  const value = overridable(valueWritable, withDefaults?.onValueChange);
  const isSelected = (key, v) => {
    if (v === void 0)
      return false;
    if (typeof v === "string")
      return v === key;
    return v.includes(key);
  };
  const isSelectedStore = derived(value, ($value) => {
    return (key) => isSelected(key, $value);
  });
  const root = builder(name$2(), {
    returned: () => ({
      "data-melt-id": meltIds.root
    })
  });
  const parseItemProps = (props2) => {
    if (typeof props2 === "string") {
      return { value: props2 };
    } else {
      return props2;
    }
  };
  const parseHeadingProps = (props2) => {
    if (typeof props2 === "number") {
      return { level: props2 };
    } else {
      return props2;
    }
  };
  const item = builder(name$2("item"), {
    stores: value,
    returned: ($value) => {
      return (props2) => {
        const { value: itemValue, disabled: disabled2 } = parseItemProps(props2);
        return {
          "data-state": isSelected(itemValue, $value) ? "open" : "closed",
          "data-disabled": disabledAttr(disabled2)
        };
      };
    }
  });
  const trigger = builder(name$2("trigger"), {
    stores: [value, disabled],
    returned: ([$value, $disabled]) => {
      return (props2) => {
        const { value: itemValue, disabled: disabled2 } = parseItemProps(props2);
        return {
          disabled: disabledAttr($disabled || disabled2),
          "aria-expanded": isSelected(itemValue, $value) ? true : false,
          "aria-disabled": disabled2 ? true : false,
          "data-disabled": disabledAttr(disabled2),
          "data-value": itemValue,
          "data-state": isSelected(itemValue, $value) ? "open" : "closed"
        };
      };
    },
    action: (node) => {
      const unsub = executeCallbacks(addMeltEventListener(node, "click", () => {
        const disabled2 = node.dataset.disabled === "true";
        const itemValue = node.dataset.value;
        if (disabled2 || !itemValue)
          return;
        handleValueUpdate(itemValue);
      }), addMeltEventListener(node, "keydown", (e) => {
        if (![kbd.ARROW_DOWN, kbd.ARROW_UP, kbd.HOME, kbd.END].includes(e.key)) {
          return;
        }
        e.preventDefault();
        if (e.key === kbd.SPACE || e.key === kbd.ENTER) {
          const disabled2 = node.dataset.disabled === "true";
          const itemValue = node.dataset.value;
          if (disabled2 || !itemValue)
            return;
          handleValueUpdate(itemValue);
          return;
        }
        const el = e.target;
        const rootEl = getElementByMeltId(meltIds.root);
        if (!rootEl || !isHTMLElement(el))
          return;
        const items = Array.from(rootEl.querySelectorAll(selector$1("trigger")));
        const candidateItems = items.filter((item2) => {
          if (!isHTMLElement(item2))
            return false;
          return item2.dataset.disabled !== "true";
        });
        if (!candidateItems.length)
          return;
        const elIdx = candidateItems.indexOf(el);
        if (e.key === kbd.ARROW_DOWN) {
          candidateItems[(elIdx + 1) % candidateItems.length].focus();
        }
        if (e.key === kbd.ARROW_UP) {
          candidateItems[(elIdx - 1 + candidateItems.length) % candidateItems.length].focus();
        }
        if (e.key === kbd.HOME) {
          candidateItems[0].focus();
        }
        if (e.key === kbd.END) {
          candidateItems[candidateItems.length - 1].focus();
        }
      }));
      return {
        destroy: unsub
      };
    }
  });
  const content = builder(name$2("content"), {
    stores: [value, disabled, forceVisible],
    returned: ([$value, $disabled, $forceVisible]) => {
      return (props2) => {
        const { value: itemValue } = parseItemProps(props2);
        const isVisible = isSelected(itemValue, $value) || $forceVisible;
        return {
          "data-state": isVisible ? "open" : "closed",
          "data-disabled": disabledAttr($disabled),
          "data-value": itemValue,
          hidden: isVisible ? void 0 : true,
          style: styleToString$1({
            display: isVisible ? void 0 : "none"
          })
        };
      };
    },
    action: (node) => {
      tick().then(() => {
        const contentId = generateId$1();
        const triggerId = generateId$1();
        const parentTrigger = document.querySelector(`${selector$1("trigger")}, [data-value="${node.dataset.value}"]`);
        if (!isHTMLElement(parentTrigger))
          return;
        node.id = contentId;
        parentTrigger.setAttribute("aria-controls", contentId);
        parentTrigger.id = triggerId;
      });
    }
  });
  const heading = builder(name$2("heading"), {
    returned: () => {
      return (props2) => {
        const { level } = parseHeadingProps(props2);
        return {
          role: "heading",
          "aria-level": level,
          "data-heading-level": level
        };
      };
    }
  });
  function handleValueUpdate(itemValue) {
    value.update(($value) => {
      if ($value === void 0) {
        return withDefaults.multiple ? [itemValue] : itemValue;
      }
      if (Array.isArray($value)) {
        if ($value.includes(itemValue)) {
          return $value.filter((v) => v !== itemValue);
        }
        $value.push(itemValue);
        return $value;
      }
      return $value === itemValue ? void 0 : itemValue;
    });
  }
  return {
    ids: meltIds,
    elements: {
      root,
      item,
      trigger,
      content,
      heading
    },
    states: {
      value
    },
    helpers: {
      isSelected: isSelectedStore
    },
    options
  };
};
const documentClickStore = readable(void 0, (set) => {
  function clicked(event) {
    set(event);
    set(void 0);
  }
  const unsubscribe = addEventListener(document, "pointerup", clicked, {
    passive: false,
    capture: true
  });
  return unsubscribe;
});
const useClickOutside = (node, config = {}) => {
  let options = { enabled: true, ...config };
  function isEnabled() {
    return typeof options.enabled === "boolean" ? options.enabled : get_store_value(options.enabled);
  }
  const unsubscribe = documentClickStore.subscribe((e) => {
    if (!isEnabled() || !e || e.target === node) {
      return;
    }
    const composedPath = e.composedPath();
    if (composedPath.includes(node))
      return;
    if (options.ignore) {
      if (isFunction(options.ignore)) {
        if (options.ignore(e))
          return;
      } else if (Array.isArray(options.ignore)) {
        if (options.ignore.length > 0 && options.ignore.some((ignoreEl) => {
          return ignoreEl && (e.target === ignoreEl || composedPath.includes(ignoreEl));
        }))
          return;
      }
    }
    options.handler?.(e);
  });
  return {
    update(params) {
      options = { ...options, ...params };
    },
    destroy() {
      unsubscribe();
    }
  };
};
const documentEscapeKeyStore = readable(void 0, (set) => {
  function keydown(event) {
    if (event && event.key === kbd.ESCAPE) {
      set(event);
    }
    set(void 0);
  }
  const unsubscribe = addEventListener(document, "keydown", keydown, {
    passive: false,
    capture: true
  });
  return unsubscribe;
});
const useEscapeKeydown = (node, config = {}) => {
  node.dataset.escapee = "";
  let options = { enabled: true, ...config };
  function isEnabled() {
    return typeof options.enabled === "boolean" ? options.enabled : get_store_value(options.enabled);
  }
  const unsubscribe = documentEscapeKeyStore.subscribe((e) => {
    if (!e || !isEnabled())
      return;
    const target = e.target;
    if (!isHTMLElement(target) || target.closest("[data-escapee]") !== node) {
      return;
    }
    e.preventDefault();
    if (options.ignore) {
      if (isFunction(options.ignore)) {
        if (options.ignore(e))
          return;
      } else if (Array.isArray(options.ignore)) {
        if (options.ignore.length > 0 && options.ignore.some((ignoreEl) => {
          return ignoreEl && target === ignoreEl;
        }))
          return;
      }
    }
    options.handler?.(e);
  });
  return {
    update(params) {
      options = { ...options, ...params };
    },
    destroy() {
      node.removeAttribute("data-escapee");
      unsubscribe();
    }
  };
};
const defaultConfig$1 = {
  strategy: "absolute",
  placement: "top",
  gutter: 5,
  flip: true,
  sameWidth: false,
  overflowPadding: 8
};
const ARROW_TRANSFORM = {
  bottom: "rotate(45deg)",
  left: "rotate(135deg)",
  top: "rotate(225deg)",
  right: "rotate(315deg)"
};
function useFloating(reference, floating, opts = {}) {
  if (!floating || !reference || opts === null)
    return {
      destroy: noop
    };
  const options = { ...defaultConfig$1, ...opts };
  const arrowEl = floating.querySelector("[data-arrow=true]");
  const middleware = [];
  if (options.flip) {
    middleware.push(flip({
      boundary: options.boundary,
      padding: options.overflowPadding
    }));
  }
  const arrowOffset = isHTMLElement(arrowEl) ? arrowEl.offsetHeight / 2 : 0;
  if (options.gutter || options.offset) {
    const data = options.gutter ? { mainAxis: options.gutter } : options.offset;
    if (data?.mainAxis != null) {
      data.mainAxis += arrowOffset;
    }
    middleware.push(offset(data));
  }
  middleware.push(shift({
    boundary: options.boundary,
    crossAxis: options.overlap,
    padding: options.overflowPadding
  }));
  if (arrowEl) {
    middleware.push(arrow({ element: arrowEl, padding: 8 }));
  }
  middleware.push(size({
    padding: options.overflowPadding,
    apply({ rects, availableHeight, availableWidth }) {
      if (options.sameWidth) {
        Object.assign(floating.style, {
          width: `${Math.round(rects.reference.width)}px`,
          minWidth: "unset"
        });
      }
      if (options.fitViewport) {
        Object.assign(floating.style, {
          maxWidth: `${availableWidth}px`,
          maxHeight: `${availableHeight}px`
        });
      }
    }
  }));
  function compute() {
    if (!reference || !floating)
      return;
    const { placement, strategy } = options;
    computePosition(reference, floating, {
      placement,
      middleware,
      strategy
    }).then((data) => {
      const x = Math.round(data.x);
      const y = Math.round(data.y);
      Object.assign(floating.style, {
        position: options.strategy,
        top: `${y}px`,
        left: `${x}px`
      });
      if (isHTMLElement(arrowEl) && data.middlewareData.arrow) {
        const { x: x2, y: y2 } = data.middlewareData.arrow;
        const dir = data.placement.split("-")[0];
        Object.assign(arrowEl.style, {
          position: "absolute",
          left: x2 != null ? `${x2}px` : "",
          top: y2 != null ? `${y2}px` : "",
          [dir]: `calc(100% - ${arrowOffset}px)`,
          transform: ARROW_TRANSFORM[dir],
          backgroundColor: "inherit",
          zIndex: "inherit"
        });
      }
      return data;
    });
  }
  Object.assign(floating.style, {
    position: options.strategy
  });
  return {
    destroy: autoUpdate(reference, floating, compute)
  };
}
function createFocusTrap(config = {}) {
  let trap;
  const { immediate, ...focusTrapOptions } = config;
  const hasFocus = writable(false);
  const isPaused = writable(false);
  const activate = (opts) => trap?.activate(opts);
  const deactivate = (opts) => {
    trap?.deactivate(opts);
  };
  const pause = () => {
    if (trap) {
      trap.pause();
      isPaused.set(true);
    }
  };
  const unpause = () => {
    if (trap) {
      trap.unpause();
      isPaused.set(false);
    }
  };
  const useFocusTrap = (node) => {
    trap = createFocusTrap$1(node, {
      ...focusTrapOptions,
      onActivate() {
        hasFocus.set(true);
        config.onActivate?.();
      },
      onDeactivate() {
        hasFocus.set(false);
        config.onDeactivate?.();
      }
    });
    if (immediate) {
      activate();
    }
    return {
      destroy() {
        deactivate();
        trap = void 0;
      }
    };
  };
  return {
    useFocusTrap,
    hasFocus: readonly(hasFocus),
    isPaused: readonly(isPaused),
    activate,
    deactivate,
    pause,
    unpause
  };
}
const defaultConfig = {
  floating: {},
  focusTrap: {},
  clickOutside: {},
  escapeKeydown: {},
  portal: "body"
};
const usePopper = (popperElement, args) => {
  popperElement.dataset.escapee = "";
  const { anchorElement, open, options } = args;
  if (!anchorElement || !open || !options) {
    return { destroy: noop };
  }
  const opts = { ...defaultConfig, ...options };
  const callbacks = [];
  if (opts.portal !== null) {
    const portal = usePortal(popperElement, opts.portal);
    if (portal?.destroy) {
      callbacks.push(portal.destroy);
    }
  }
  callbacks.push(useFloating(anchorElement, popperElement, opts.floating).destroy);
  if (opts.focusTrap !== null) {
    const { useFocusTrap } = createFocusTrap({
      immediate: true,
      escapeDeactivates: false,
      allowOutsideClick: true,
      returnFocusOnDeactivate: false,
      fallbackFocus: popperElement,
      ...opts.focusTrap
    });
    const usedFocusTrap = useFocusTrap(popperElement);
    if (usedFocusTrap?.destroy) {
      callbacks.push(usedFocusTrap.destroy);
    }
  }
  if (opts.clickOutside !== null) {
    callbacks.push(useClickOutside(popperElement, {
      enabled: open,
      handler: (e) => {
        if (e.defaultPrevented)
          return;
        if (isHTMLElement(anchorElement) && !anchorElement.contains(e.target)) {
          open.set(false);
          anchorElement.focus();
        }
      },
      ...opts.clickOutside
    }).destroy);
  }
  if (opts.escapeKeydown !== null) {
    callbacks.push(useEscapeKeydown(popperElement, {
      enabled: open,
      handler: () => {
        open.set(false);
      },
      ...opts.escapeKeydown
    }).destroy);
  }
  const unsubscribe = executeCallbacks(...callbacks);
  return {
    destroy() {
      unsubscribe();
    }
  };
};
const usePortal = (el, target = "body") => {
  let targetEl;
  if (!isHTMLElement(target) && typeof target !== "string") {
    return {
      destroy: noop
    };
  }
  async function update2(newTarget) {
    target = newTarget;
    if (typeof target === "string") {
      targetEl = document.querySelector(target);
      if (targetEl === null) {
        await tick();
        targetEl = document.querySelector(target);
      }
      if (targetEl === null) {
        throw new Error(`No element found matching css selector: "${target}"`);
      }
    } else if (target instanceof HTMLElement) {
      targetEl = target;
    } else {
      throw new TypeError(`Unknown portal target type: ${target === null ? "null" : typeof target}. Allowed types: string (CSS selector) or HTMLElement.`);
    }
    el.dataset.portal = "";
    targetEl.appendChild(el);
    el.hidden = false;
  }
  function destroy() {
    el.remove();
  }
  update2(target);
  return {
    update: update2,
    destroy
  };
};
const SUB_OPEN_KEYS = {
  ltr: [...SELECTION_KEYS, kbd.ARROW_RIGHT],
  rtl: [...SELECTION_KEYS, kbd.ARROW_LEFT]
};
const SUB_CLOSE_KEYS = {
  ltr: [kbd.ARROW_LEFT],
  rtl: [kbd.ARROW_RIGHT]
};
const menuIdParts = ["menu", "trigger"];
const defaults$4 = {
  arrowSize: 8,
  positioning: {
    placement: "bottom"
  },
  preventScroll: true,
  closeOnEscape: true,
  closeOnOutsideClick: true,
  portal: "body",
  loop: false,
  dir: "ltr",
  defaultOpen: false,
  typeahead: true
};
function createMenuBuilder(opts) {
  const { name: name2, selector: selector2 } = createElHelpers(opts.selector);
  const { preventScroll, arrowSize, positioning, closeOnEscape, closeOnOutsideClick, portal, forceVisible, typeahead, loop, closeFocus, disableFocusFirstItem } = opts.rootOptions;
  const rootOpen = opts.rootOpen;
  const rootActiveTrigger = opts.rootActiveTrigger;
  const nextFocusable = opts.nextFocusable;
  const prevFocusable = opts.prevFocusable;
  const isUsingKeyboard = writable(false);
  const lastPointerX = writable(0);
  const pointerGraceIntent = writable(null);
  const pointerDir = writable("right");
  const currentFocusedItem = writable(null);
  const pointerMovingToSubmenu = derivedWithUnsubscribe([pointerDir, pointerGraceIntent], ([$pointerDir, $pointerGraceIntent]) => {
    return (e) => {
      const isMovingTowards = $pointerDir === $pointerGraceIntent?.side;
      return isMovingTowards && isPointerInGraceArea(e, $pointerGraceIntent?.area);
    };
  });
  const { typed, handleTypeaheadSearch } = createTypeaheadSearch();
  const rootIds = toWritableStores({ ...generateIds(menuIdParts), ...opts.ids });
  const isVisible = derivedVisible({
    open: rootOpen,
    forceVisible,
    activeTrigger: rootActiveTrigger
  });
  const rootMenu = builder(name2(), {
    stores: [isVisible, portal, rootIds.menu, rootIds.trigger],
    returned: ([$isVisible, $portal, $rootMenuId, $rootTriggerId]) => {
      return {
        role: "menu",
        hidden: $isVisible ? void 0 : true,
        style: styleToString$1({
          display: $isVisible ? void 0 : "none"
        }),
        id: $rootMenuId,
        "aria-labelledby": $rootTriggerId,
        "data-state": $isVisible ? "open" : "closed",
        "data-portal": $portal ? "" : void 0,
        tabindex: -1
      };
    },
    action: (node) => {
      let unsubPopper = noop;
      const unsubDerived = effect([isVisible, rootActiveTrigger, positioning, closeOnOutsideClick, portal, closeOnEscape], ([$isVisible, $rootActiveTrigger, $positioning, $closeOnOutsideClick, $portal, $closeOnEscape]) => {
        unsubPopper();
        if (!$isVisible || !$rootActiveTrigger)
          return;
        tick().then(() => {
          setMeltMenuAttribute(node, selector2);
          const popper = usePopper(node, {
            anchorElement: $rootActiveTrigger,
            open: rootOpen,
            options: {
              floating: $positioning,
              clickOutside: $closeOnOutsideClick ? void 0 : null,
              portal: getPortalDestination(node, $portal),
              escapeKeydown: $closeOnEscape ? void 0 : null
            }
          });
          if (popper && popper.destroy) {
            unsubPopper = popper.destroy;
          }
        });
      });
      const unsubEvents = executeCallbacks(addMeltEventListener(node, "keydown", (e) => {
        const target = e.target;
        const menuEl = e.currentTarget;
        if (!isHTMLElement(target) || !isHTMLElement(menuEl))
          return;
        const isKeyDownInside = target.closest('[role="menu"]') === menuEl;
        if (!isKeyDownInside)
          return;
        if (FIRST_LAST_KEYS.includes(e.key)) {
          handleMenuNavigation(e, get_store_value(loop) ?? false);
        }
        if (e.key === kbd.TAB) {
          e.preventDefault();
          rootOpen.set(false);
          handleTabNavigation(e, nextFocusable, prevFocusable);
          return;
        }
        const isCharacterKey = e.key.length === 1;
        const isModifierKey = e.ctrlKey || e.altKey || e.metaKey;
        if (!isModifierKey && isCharacterKey && get_store_value(typeahead) === true) {
          handleTypeaheadSearch(e.key, getMenuItems(menuEl));
        }
      }));
      return {
        destroy() {
          unsubDerived();
          unsubEvents();
          unsubPopper();
        }
      };
    }
  });
  const rootTrigger = builder(name2("trigger"), {
    stores: [rootOpen, rootIds.menu, rootIds.trigger],
    returned: ([$rootOpen, $rootMenuId, $rootTriggerId]) => {
      return {
        "aria-controls": $rootMenuId,
        "aria-expanded": $rootOpen,
        "data-state": $rootOpen ? "open" : "closed",
        id: $rootTriggerId,
        tabindex: 0
      };
    },
    action: (node) => {
      applyAttrsIfDisabled(node);
      const unsub = executeCallbacks(addMeltEventListener(node, "click", (e) => {
        const $rootOpen = get_store_value(rootOpen);
        const triggerEl = e.currentTarget;
        if (!isHTMLElement(triggerEl))
          return;
        handleOpen(triggerEl);
        if (!$rootOpen)
          e.preventDefault();
      }), addMeltEventListener(node, "keydown", (e) => {
        const triggerEl = e.currentTarget;
        if (!isHTMLElement(triggerEl))
          return;
        if (!(SELECTION_KEYS.includes(e.key) || e.key === kbd.ARROW_DOWN))
          return;
        e.preventDefault();
        handleOpen(triggerEl);
        const menuId = triggerEl.getAttribute("aria-controls");
        if (!menuId)
          return;
        const menu = document.getElementById(menuId);
        if (!menu)
          return;
        const menuItems = getMenuItems(menu);
        if (!menuItems.length)
          return;
        handleRovingFocus(menuItems[0]);
      }));
      return {
        destroy: unsub
      };
    }
  });
  const rootArrow = builder(name2("arrow"), {
    stores: arrowSize,
    returned: ($arrowSize) => ({
      "data-arrow": true,
      style: styleToString$1({
        position: "absolute",
        width: `var(--arrow-size, ${$arrowSize}px)`,
        height: `var(--arrow-size, ${$arrowSize}px)`
      })
    })
  });
  const item = builder(name2("item"), {
    returned: () => {
      return {
        role: "menuitem",
        tabindex: -1,
        "data-orientation": "vertical"
      };
    },
    action: (node) => {
      setMeltMenuAttribute(node, selector2);
      applyAttrsIfDisabled(node);
      const unsub = executeCallbacks(addMeltEventListener(node, "pointerdown", (e) => {
        const itemEl = e.currentTarget;
        if (!isHTMLElement(itemEl))
          return;
        if (isElementDisabled(itemEl)) {
          e.preventDefault();
          return;
        }
      }), addMeltEventListener(node, "click", (e) => {
        const itemEl = e.currentTarget;
        if (!isHTMLElement(itemEl))
          return;
        if (isElementDisabled(itemEl)) {
          e.preventDefault();
          return;
        }
        if (e.defaultPrevented) {
          handleRovingFocus(itemEl);
          return;
        }
        sleep(1).then(() => {
          rootOpen.set(false);
        });
      }), addMeltEventListener(node, "keydown", (e) => {
        onItemKeyDown(e);
      }), addMeltEventListener(node, "pointermove", (e) => {
        onMenuItemPointerMove(e);
      }), addMeltEventListener(node, "pointerleave", (e) => {
        onMenuItemPointerLeave(e);
      }), addMeltEventListener(node, "focusin", (e) => {
        onItemFocusIn(e);
      }), addMeltEventListener(node, "focusout", (e) => {
        onItemFocusOut(e);
      }));
      return {
        destroy: unsub
      };
    }
  });
  const group = builder(name2("group"), {
    returned: () => {
      return (groupId) => ({
        role: "group",
        "aria-labelledby": groupId
      });
    }
  });
  const groupLabel = builder(name2("group-label"), {
    returned: () => {
      return (groupId) => ({
        id: groupId
      });
    }
  });
  const checkboxItemDefaults = {
    defaultChecked: false,
    disabled: false
  };
  const createCheckboxItem = (props) => {
    const withDefaults = { ...checkboxItemDefaults, ...props };
    const checkedWritable = withDefaults.checked ?? writable(withDefaults.defaultChecked ?? null);
    const checked = overridable(checkedWritable, withDefaults.onCheckedChange);
    const disabled = writable(withDefaults.disabled);
    const checkboxItem = builder(name2("checkbox-item"), {
      stores: [checked, disabled],
      returned: ([$checked, $disabled]) => {
        return {
          role: "menuitemcheckbox",
          tabindex: -1,
          "data-orientation": "vertical",
          "aria-checked": isIndeterminate($checked) ? "mixed" : $checked ? "true" : "false",
          "data-disabled": disabledAttr($disabled),
          "data-state": getCheckedState($checked)
        };
      },
      action: (node) => {
        setMeltMenuAttribute(node, selector2);
        applyAttrsIfDisabled(node);
        const unsub = executeCallbacks(addMeltEventListener(node, "pointerdown", (e) => {
          const itemEl = e.currentTarget;
          if (!isHTMLElement(itemEl))
            return;
          if (isElementDisabled(itemEl)) {
            e.preventDefault();
            return;
          }
        }), addMeltEventListener(node, "click", (e) => {
          const itemEl = e.currentTarget;
          if (!isHTMLElement(itemEl))
            return;
          if (isElementDisabled(itemEl)) {
            e.preventDefault();
            return;
          }
          if (e.defaultPrevented) {
            handleRovingFocus(itemEl);
            return;
          }
          checked.update((prev) => {
            if (isIndeterminate(prev))
              return true;
            return !prev;
          });
          tick().then(() => {
            rootOpen.set(false);
          });
        }), addMeltEventListener(node, "keydown", (e) => {
          onItemKeyDown(e);
        }), addMeltEventListener(node, "pointermove", (e) => {
          const itemEl = e.currentTarget;
          if (!isHTMLElement(itemEl))
            return;
          if (isElementDisabled(itemEl)) {
            onItemLeave(e);
            return;
          }
          onMenuItemPointerMove(e, itemEl);
        }), addMeltEventListener(node, "pointerleave", (e) => {
          onMenuItemPointerLeave(e);
        }), addMeltEventListener(node, "focusin", (e) => {
          onItemFocusIn(e);
        }), addMeltEventListener(node, "focusout", (e) => {
          onItemFocusOut(e);
        }));
        return {
          destroy: unsub
        };
      }
    });
    return {
      elements: {
        checkboxItem
      },
      states: {
        checked
      },
      options: {
        disabled
      }
    };
  };
  const createMenuRadioGroup = (args = {}) => {
    const valueWritable = args.value ?? writable(args.defaultValue ?? null);
    const value = overridable(valueWritable, args.onValueChange);
    const radioGroup = builder(name2("radio-group"), {
      returned: () => ({
        role: "group"
      })
    });
    const radioItemDefaults = {
      disabled: false
    };
    const radioItem = builder(name2("radio-item"), {
      stores: [value],
      returned: ([$value]) => {
        return (itemProps) => {
          const { value: itemValue, disabled } = { ...radioItemDefaults, ...itemProps };
          const checked = $value === itemValue;
          return {
            disabled,
            role: "menuitemradio",
            "data-state": checked ? "checked" : "unchecked",
            "aria-checked": checked,
            "data-disabled": disabledAttr(disabled),
            "data-value": itemValue,
            "data-orientation": "vertical",
            tabindex: -1
          };
        };
      },
      action: (node) => {
        setMeltMenuAttribute(node, selector2);
        const unsub = executeCallbacks(addMeltEventListener(node, "pointerdown", (e) => {
          const itemEl = e.currentTarget;
          if (!isHTMLElement(itemEl))
            return;
          const itemValue = node.dataset.value;
          const disabled = node.dataset.disabled;
          if (disabled || itemValue === void 0) {
            e.preventDefault();
            return;
          }
        }), addMeltEventListener(node, "click", (e) => {
          const itemEl = e.currentTarget;
          if (!isHTMLElement(itemEl))
            return;
          const itemValue = node.dataset.value;
          const disabled = node.dataset.disabled;
          if (disabled || itemValue === void 0) {
            e.preventDefault();
            return;
          }
          if (e.defaultPrevented) {
            if (!isHTMLElement(itemEl))
              return;
            handleRovingFocus(itemEl);
            return;
          }
          value.set(itemValue);
          tick().then(() => {
            rootOpen.set(false);
          });
        }), addMeltEventListener(node, "keydown", (e) => {
          onItemKeyDown(e);
        }), addMeltEventListener(node, "pointermove", (e) => {
          const itemEl = e.currentTarget;
          if (!isHTMLElement(itemEl))
            return;
          const itemValue = node.dataset.value;
          const disabled = node.dataset.disabled;
          if (disabled || itemValue === void 0) {
            onItemLeave(e);
            return;
          }
          onMenuItemPointerMove(e, itemEl);
        }), addMeltEventListener(node, "pointerleave", (e) => {
          onMenuItemPointerLeave(e);
        }), addMeltEventListener(node, "focusin", (e) => {
          onItemFocusIn(e);
        }), addMeltEventListener(node, "focusout", (e) => {
          onItemFocusOut(e);
        }));
        return {
          destroy: unsub
        };
      }
    });
    const isChecked = derived(value, ($value) => {
      return (itemValue) => {
        return $value === itemValue;
      };
    });
    return {
      elements: {
        radioGroup,
        radioItem
      },
      states: {
        value
      },
      helpers: {
        isChecked
      }
    };
  };
  const { elements: { root: separator } } = createSeparator({
    orientation: "horizontal"
  });
  const subMenuDefaults = {
    ...defaults$4,
    disabled: false,
    positioning: {
      placement: "right-start",
      gutter: 8
    }
  };
  const createSubmenu = (args) => {
    const withDefaults = { ...subMenuDefaults, ...args };
    const subOpenWritable = withDefaults.open ?? writable(false);
    const subOpen = overridable(subOpenWritable, withDefaults?.onOpenChange);
    const options = toWritableStores(omit(withDefaults, "ids"));
    const { positioning: positioning2, arrowSize: arrowSize2, disabled } = options;
    const subActiveTrigger = writable(null);
    const subOpenTimer = writable(null);
    const pointerGraceTimer = writable(0);
    const subIds = toWritableStores({ ...generateIds(menuIdParts), ...withDefaults.ids });
    const subIsVisible = derivedVisible({
      open: subOpen,
      forceVisible,
      activeTrigger: subActiveTrigger
    });
    const subMenu = builder(name2("submenu"), {
      stores: [subIsVisible, subIds.menu, subIds.trigger],
      returned: ([$subIsVisible, $subMenuId, $subTriggerId]) => {
        return {
          role: "menu",
          hidden: $subIsVisible ? void 0 : true,
          style: styleToString$1({
            display: $subIsVisible ? void 0 : "none"
          }),
          id: $subMenuId,
          "aria-labelledby": $subTriggerId,
          "data-state": $subIsVisible ? "open" : "closed",
          // unit tests fail on `.closest` if the id starts with a number
          // so using a data attribute
          "data-id": $subMenuId,
          tabindex: -1
        };
      },
      action: (node) => {
        let unsubPopper = noop;
        const unsubDerived = effect([subIsVisible, positioning2], ([$subIsVisible, $positioning]) => {
          unsubPopper();
          if (!$subIsVisible)
            return;
          const activeTrigger = get_store_value(subActiveTrigger);
          if (!activeTrigger)
            return;
          tick().then(() => {
            const parentMenuEl = getParentMenu(activeTrigger);
            const popper = usePopper(node, {
              anchorElement: activeTrigger,
              open: subOpen,
              options: {
                floating: $positioning,
                portal: isHTMLElement(parentMenuEl) ? parentMenuEl : void 0,
                clickOutside: null,
                focusTrap: null,
                escapeKeydown: null
              }
            });
            if (popper && popper.destroy) {
              unsubPopper = popper.destroy;
            }
          });
        });
        const unsubEvents = executeCallbacks(addMeltEventListener(node, "keydown", (e) => {
          if (e.key === kbd.ESCAPE) {
            return;
          }
          const target = e.target;
          const menuEl = e.currentTarget;
          if (!isHTMLElement(target) || !isHTMLElement(menuEl))
            return;
          const isKeyDownInside = target.closest('[role="menu"]') === menuEl;
          if (!isKeyDownInside)
            return;
          if (FIRST_LAST_KEYS.includes(e.key)) {
            e.stopImmediatePropagation();
            handleMenuNavigation(e, get_store_value(loop) ?? false);
            return;
          }
          const isCloseKey = SUB_CLOSE_KEYS["ltr"].includes(e.key);
          const isModifierKey = e.ctrlKey || e.altKey || e.metaKey;
          const isCharacterKey = e.key.length === 1;
          if (isCloseKey) {
            const $subActiveTrigger = get_store_value(subActiveTrigger);
            e.preventDefault();
            subOpen.update(() => {
              if ($subActiveTrigger) {
                handleRovingFocus($subActiveTrigger);
              }
              return false;
            });
            return;
          }
          if (e.key === kbd.TAB) {
            e.preventDefault();
            rootOpen.set(false);
            handleTabNavigation(e, nextFocusable, prevFocusable);
            return;
          }
          if (!isModifierKey && isCharacterKey && get_store_value(typeahead) === true) {
            handleTypeaheadSearch(e.key, getMenuItems(menuEl));
          }
        }), addMeltEventListener(node, "pointermove", (e) => {
          onMenuPointerMove(e);
        }), addMeltEventListener(node, "focusout", (e) => {
          const $subActiveTrigger = get_store_value(subActiveTrigger);
          if (get_store_value(isUsingKeyboard)) {
            const target = e.target;
            const submenuEl = document.getElementById(get_store_value(subIds.menu));
            if (!isHTMLElement(submenuEl) || !isHTMLElement(target))
              return;
            if (!submenuEl.contains(target) && target !== $subActiveTrigger) {
              subOpen.set(false);
            }
          } else {
            const menuEl = e.currentTarget;
            const relatedTarget = e.relatedTarget;
            if (!isHTMLElement(relatedTarget) || !isHTMLElement(menuEl))
              return;
            if (!menuEl.contains(relatedTarget) && relatedTarget !== $subActiveTrigger) {
              subOpen.set(false);
            }
          }
        }));
        return {
          destroy() {
            unsubDerived();
            unsubPopper();
            unsubEvents();
          }
        };
      }
    });
    const subTrigger = builder(name2("subtrigger"), {
      stores: [subOpen, disabled, subIds.menu, subIds.trigger],
      returned: ([$subOpen, $disabled, $subMenuId, $subTriggerId]) => {
        return {
          role: "menuitem",
          id: $subTriggerId,
          tabindex: -1,
          "aria-controls": $subMenuId,
          "aria-expanded": $subOpen,
          "data-state": $subOpen ? "open" : "closed",
          "data-disabled": disabledAttr($disabled),
          "aria-haspopop": "menu"
        };
      },
      action: (node) => {
        setMeltMenuAttribute(node, selector2);
        applyAttrsIfDisabled(node);
        const unsubTimer = () => {
          clearTimerStore(subOpenTimer);
          window.clearTimeout(get_store_value(pointerGraceTimer));
          pointerGraceIntent.set(null);
        };
        const unsubEvents = executeCallbacks(addMeltEventListener(node, "click", (e) => {
          if (e.defaultPrevented)
            return;
          const triggerEl = e.currentTarget;
          if (!isHTMLElement(triggerEl) || isElementDisabled(triggerEl))
            return;
          handleRovingFocus(triggerEl);
          if (!get_store_value(subOpen)) {
            subOpen.update((prev) => {
              const isAlreadyOpen = prev;
              if (!isAlreadyOpen) {
                subActiveTrigger.set(triggerEl);
                return !prev;
              }
              return prev;
            });
          }
        }), addMeltEventListener(node, "keydown", (e) => {
          const $typed = get_store_value(typed);
          const triggerEl = e.currentTarget;
          if (!isHTMLElement(triggerEl) || isElementDisabled(triggerEl))
            return;
          const isTypingAhead = $typed.length > 0;
          if (isTypingAhead && e.key === kbd.SPACE)
            return;
          if (SUB_OPEN_KEYS["ltr"].includes(e.key)) {
            if (!get_store_value(subOpen)) {
              triggerEl.click();
              e.preventDefault();
              return;
            }
            const menuId = triggerEl.getAttribute("aria-controls");
            if (!menuId)
              return;
            const menuEl = document.getElementById(menuId);
            if (!isHTMLElement(menuEl))
              return;
            const firstItem = getMenuItems(menuEl)[0];
            handleRovingFocus(firstItem);
          }
        }), addMeltEventListener(node, "pointermove", (e) => {
          if (!isMouse(e))
            return;
          onItemEnter(e);
          if (e.defaultPrevented)
            return;
          const triggerEl = e.currentTarget;
          if (!isHTMLElement(triggerEl))
            return;
          if (!isFocusWithinSubmenu(get_store_value(subIds.menu))) {
            handleRovingFocus(triggerEl);
          }
          const openTimer = get_store_value(subOpenTimer);
          if (!get_store_value(subOpen) && !openTimer && !isElementDisabled(triggerEl)) {
            subOpenTimer.set(window.setTimeout(() => {
              subOpen.update(() => {
                subActiveTrigger.set(triggerEl);
                return true;
              });
              clearTimerStore(subOpenTimer);
            }, 100));
          }
        }), addMeltEventListener(node, "pointerleave", (e) => {
          if (!isMouse(e))
            return;
          clearTimerStore(subOpenTimer);
          const submenuEl = document.getElementById(get_store_value(subIds.menu));
          const contentRect = submenuEl?.getBoundingClientRect();
          if (contentRect) {
            const side = submenuEl?.dataset.side;
            const rightSide = side === "right";
            const bleed = rightSide ? -5 : 5;
            const contentNearEdge = contentRect[rightSide ? "left" : "right"];
            const contentFarEdge = contentRect[rightSide ? "right" : "left"];
            pointerGraceIntent.set({
              area: [
                // Apply a bleed on clientX to ensure that our exit point is
                // consistently within polygon bounds
                { x: e.clientX + bleed, y: e.clientY },
                { x: contentNearEdge, y: contentRect.top },
                { x: contentFarEdge, y: contentRect.top },
                { x: contentFarEdge, y: contentRect.bottom },
                { x: contentNearEdge, y: contentRect.bottom }
              ],
              side
            });
            window.clearTimeout(get_store_value(pointerGraceTimer));
            pointerGraceTimer.set(window.setTimeout(() => {
              pointerGraceIntent.set(null);
            }, 300));
          } else {
            onTriggerLeave(e);
            if (e.defaultPrevented)
              return;
            pointerGraceIntent.set(null);
          }
        }), addMeltEventListener(node, "focusout", (e) => {
          const triggerEl = e.currentTarget;
          if (!isHTMLElement(triggerEl))
            return;
          removeHighlight(triggerEl);
          const relatedTarget = e.relatedTarget;
          if (!isHTMLElement(relatedTarget))
            return;
          const menuId = triggerEl.getAttribute("aria-controls");
          if (!menuId)
            return;
          const menu = document.getElementById(menuId);
          if (menu && !menu.contains(relatedTarget)) {
            subOpen.set(false);
          }
        }), addMeltEventListener(node, "focusin", (e) => {
          onItemFocusIn(e);
        }));
        return {
          destroy() {
            unsubTimer();
            unsubEvents();
          }
        };
      }
    });
    const subArrow = builder(name2("subarrow"), {
      stores: arrowSize2,
      returned: ($arrowSize) => ({
        "data-arrow": true,
        style: styleToString$1({
          position: "absolute",
          width: `var(--arrow-size, ${$arrowSize}px)`,
          height: `var(--arrow-size, ${$arrowSize}px)`
        })
      })
    });
    effect([rootOpen], ([$rootOpen]) => {
      if (!$rootOpen) {
        subActiveTrigger.set(null);
        subOpen.set(false);
      }
    });
    effect([pointerGraceIntent], ([$pointerGraceIntent]) => {
      if (!isBrowser || $pointerGraceIntent)
        return;
      window.clearTimeout(get_store_value(pointerGraceTimer));
    });
    effect([subOpen], ([$subOpen]) => {
      if (!isBrowser)
        return;
      sleep(1).then(() => {
        const menuEl = document.getElementById(get_store_value(subIds.menu));
        if (!menuEl)
          return;
        if ($subOpen && get_store_value(isUsingKeyboard)) {
          const menuItems = getMenuItems(menuEl);
          if (!menuItems.length)
            return;
          handleRovingFocus(menuItems[0]);
        }
        if (!$subOpen) {
          const focusedItem = get_store_value(currentFocusedItem);
          if (focusedItem && menuEl.contains(focusedItem)) {
            removeHighlight(focusedItem);
          }
        }
        if (menuEl && !$subOpen) {
          const subTriggerEl = document.getElementById(get_store_value(subIds.trigger));
          if (!subTriggerEl || document.activeElement === subTriggerEl)
            return;
          removeHighlight(subTriggerEl);
        }
      });
    });
    return {
      ids: subIds,
      elements: {
        subTrigger,
        subMenu,
        subArrow
      },
      states: {
        subOpen
      },
      options
    };
  };
  effect([rootOpen, currentFocusedItem], ([$rootOpen, $currentFocusedItem]) => {
    if (!$rootOpen && $currentFocusedItem) {
      removeHighlight($currentFocusedItem);
    }
  });
  effect([rootOpen, rootActiveTrigger, preventScroll], ([$rootOpen, $rootActiveTrigger, $preventScroll]) => {
    if (!isBrowser)
      return;
    const unsubs = [];
    if (opts.removeScroll && $rootOpen && $preventScroll) {
      unsubs.push(removeScroll());
    }
    const $closeFocus = get_store_value(closeFocus);
    if (!$rootOpen) {
      if ($rootActiveTrigger) {
        handleFocus({ prop: $closeFocus, defaultEl: $rootActiveTrigger });
      } else {
        handleFocus({
          prop: $closeFocus,
          defaultEl: document.getElementById(get_store_value(rootIds.trigger))
        });
      }
    }
    sleep(1).then(() => {
      const menuEl = document.getElementById(get_store_value(rootIds.menu));
      if (menuEl && $rootOpen && get_store_value(isUsingKeyboard)) {
        if (get_store_value(disableFocusFirstItem)) {
          handleRovingFocus(menuEl);
          return;
        }
        const menuItems = getMenuItems(menuEl);
        if (!menuItems.length)
          return;
        handleRovingFocus(menuItems[0]);
      }
    });
    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  });
  effect(rootOpen, ($rootOpen) => {
    if (!isBrowser)
      return;
    const handlePointer = () => isUsingKeyboard.set(false);
    const handleKeyDown = (e) => {
      isUsingKeyboard.set(true);
      if (e.key === kbd.ESCAPE && $rootOpen && get_store_value(closeOnEscape)) {
        rootOpen.set(false);
        return;
      }
    };
    return executeCallbacks(addEventListener(document, "pointerdown", handlePointer, { capture: true, once: true }), addEventListener(document, "pointermove", handlePointer, { capture: true, once: true }), addEventListener(document, "keydown", handleKeyDown, { capture: true }));
  });
  function handleOpen(triggerEl) {
    rootOpen.update((prev) => {
      const isOpen = !prev;
      if (isOpen) {
        nextFocusable.set(getNextFocusable(triggerEl));
        prevFocusable.set(getPreviousFocusable(triggerEl));
        rootActiveTrigger.set(triggerEl);
      }
      return isOpen;
    });
  }
  function onItemFocusIn(e) {
    const itemEl = e.currentTarget;
    if (!isHTMLElement(itemEl))
      return;
    const $currentFocusedItem = get_store_value(currentFocusedItem);
    if ($currentFocusedItem) {
      removeHighlight($currentFocusedItem);
    }
    addHighlight(itemEl);
    currentFocusedItem.set(itemEl);
  }
  function onItemFocusOut(e) {
    const itemEl = e.currentTarget;
    if (!isHTMLElement(itemEl))
      return;
    removeHighlight(itemEl);
  }
  function onItemEnter(e) {
    if (isPointerMovingToSubmenu(e)) {
      e.preventDefault();
    }
  }
  function onItemLeave(e) {
    if (isPointerMovingToSubmenu(e)) {
      return;
    }
    const target = e.target;
    if (!isHTMLElement(target))
      return;
    const parentMenuEl = getParentMenu(target);
    if (!parentMenuEl)
      return;
    handleRovingFocus(parentMenuEl);
  }
  function onTriggerLeave(e) {
    if (isPointerMovingToSubmenu(e)) {
      e.preventDefault();
    }
  }
  function onMenuPointerMove(e) {
    if (!isMouse(e))
      return;
    const target = e.target;
    const currentTarget = e.currentTarget;
    if (!isHTMLElement(currentTarget) || !isHTMLElement(target))
      return;
    const $lastPointerX = get_store_value(lastPointerX);
    const pointerXHasChanged = $lastPointerX !== e.clientX;
    if (currentTarget.contains(target) && pointerXHasChanged) {
      const newDir = e.clientX > $lastPointerX ? "right" : "left";
      pointerDir.set(newDir);
      lastPointerX.set(e.clientX);
    }
  }
  function onMenuItemPointerMove(e, currTarget = null) {
    if (!isMouse(e))
      return;
    onItemEnter(e);
    if (e.defaultPrevented)
      return;
    if (currTarget) {
      handleRovingFocus(currTarget);
      return;
    }
    const currentTarget = e.currentTarget;
    if (!isHTMLElement(currentTarget))
      return;
    handleRovingFocus(currentTarget);
  }
  function onMenuItemPointerLeave(e) {
    if (!isMouse(e))
      return;
    onItemLeave(e);
  }
  function onItemKeyDown(e) {
    const $typed = get_store_value(typed);
    const isTypingAhead = $typed.length > 0;
    if (isTypingAhead && e.key === kbd.SPACE) {
      e.preventDefault();
      return;
    }
    if (SELECTION_KEYS.includes(e.key)) {
      e.preventDefault();
      const itemEl = e.currentTarget;
      if (!isHTMLElement(itemEl))
        return;
      itemEl.click();
    }
  }
  function isIndeterminate(checked) {
    return checked === "indeterminate";
  }
  function getCheckedState(checked) {
    return isIndeterminate(checked) ? "indeterminate" : checked ? "checked" : "unchecked";
  }
  function isPointerMovingToSubmenu(e) {
    return get_store_value(pointerMovingToSubmenu)(e);
  }
  function getParentMenu(element) {
    const parentMenuEl = element.closest('[role="menu"]');
    if (!isHTMLElement(parentMenuEl))
      return null;
    return parentMenuEl;
  }
  return {
    ids: rootIds,
    trigger: rootTrigger,
    menu: rootMenu,
    open: rootOpen,
    item,
    group,
    groupLabel,
    arrow: rootArrow,
    options: opts.rootOptions,
    createCheckboxItem,
    createSubmenu,
    createMenuRadioGroup,
    separator,
    handleTypeaheadSearch
  };
}
function handleTabNavigation(e, nextFocusable, prevFocusable) {
  if (e.shiftKey) {
    const $prevFocusable = get_store_value(prevFocusable);
    if ($prevFocusable) {
      e.preventDefault();
      sleep(1).then(() => $prevFocusable.focus());
      prevFocusable.set(null);
    }
  } else {
    const $nextFocusable = get_store_value(nextFocusable);
    if ($nextFocusable) {
      e.preventDefault();
      sleep(1).then(() => $nextFocusable.focus());
      nextFocusable.set(null);
    }
  }
}
function getMenuItems(menuElement) {
  return Array.from(menuElement.querySelectorAll(`[data-melt-menu-id="${menuElement.id}"]`)).filter((item) => isHTMLElement(item));
}
function applyAttrsIfDisabled(element) {
  if (!element || !isElementDisabled(element))
    return;
  element.setAttribute("data-disabled", "");
  element.setAttribute("aria-disabled", "true");
}
function clearTimerStore(timerStore) {
  if (!isBrowser)
    return;
  const timer = get_store_value(timerStore);
  if (timer) {
    window.clearTimeout(timer);
    timerStore.set(null);
  }
}
function isMouse(e) {
  return e.pointerType === "mouse";
}
function setMeltMenuAttribute(element, selector2) {
  if (!element)
    return;
  const menuEl = element.closest(`${selector2()}, ${selector2("submenu")}`);
  if (!isHTMLElement(menuEl))
    return;
  element.setAttribute("data-melt-menu-id", menuEl.id);
}
function handleMenuNavigation(e, loop) {
  e.preventDefault();
  const currentFocusedItem = document.activeElement;
  const currentTarget = e.currentTarget;
  if (!isHTMLElement(currentFocusedItem) || !isHTMLElement(currentTarget))
    return;
  const menuItems = getMenuItems(currentTarget);
  if (!menuItems.length)
    return;
  const candidateNodes = menuItems.filter((item) => {
    if (item.hasAttribute("data-disabled") || item.getAttribute("disabled") === "true") {
      return false;
    }
    return true;
  });
  const currentIndex = candidateNodes.indexOf(currentFocusedItem);
  let nextIndex;
  switch (e.key) {
    case kbd.ARROW_DOWN:
      if (loop) {
        nextIndex = currentIndex < candidateNodes.length - 1 ? currentIndex + 1 : 0;
      } else {
        nextIndex = currentIndex < candidateNodes.length - 1 ? currentIndex + 1 : currentIndex;
      }
      break;
    case kbd.ARROW_UP:
      if (loop) {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : candidateNodes.length - 1;
      } else {
        nextIndex = currentIndex < 0 ? candidateNodes.length - 1 : currentIndex > 0 ? currentIndex - 1 : 0;
      }
      break;
    case kbd.HOME:
      nextIndex = 0;
      break;
    case kbd.END:
      nextIndex = candidateNodes.length - 1;
      break;
    default:
      return;
  }
  handleRovingFocus(candidateNodes[nextIndex]);
}
function isPointerInGraceArea(e, area) {
  if (!area)
    return false;
  const cursorPos = { x: e.clientX, y: e.clientY };
  return isPointInPolygon(cursorPos, area);
}
function isPointInPolygon(point, polygon) {
  const { x, y } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi;
    if (intersect)
      inside = !inside;
  }
  return inside;
}
function isFocusWithinSubmenu(submenuId) {
  const activeEl = document.activeElement;
  if (!isHTMLElement(activeEl))
    return false;
  const submenuEl = activeEl.closest(`[data-id="${submenuId}"]`);
  return isHTMLElement(submenuEl);
}
const defaults$3 = {
  arrowSize: 8,
  positioning: {
    placement: "bottom"
  },
  preventScroll: true,
  closeOnEscape: true,
  closeOnOutsideClick: true,
  portal: void 0,
  loop: false,
  dir: "ltr",
  defaultOpen: false,
  forceVisible: false,
  typeahead: true,
  closeFocus: void 0,
  disableFocusFirstItem: false
};
function createDropdownMenu(props) {
  const withDefaults = { ...defaults$3, ...props };
  const rootOptions = toWritableStores(omit(withDefaults, "ids"));
  const openWritable = withDefaults.open ?? writable(withDefaults.defaultOpen);
  const rootOpen = overridable(openWritable, withDefaults?.onOpenChange);
  const rootActiveTrigger = writable(null);
  const nextFocusable = writable(null);
  const prevFocusable = writable(null);
  const { trigger, menu, item, arrow: arrow2, createSubmenu, createCheckboxItem, createMenuRadioGroup, separator, group, groupLabel, ids } = createMenuBuilder({
    rootOptions,
    rootOpen,
    rootActiveTrigger,
    nextFocusable,
    prevFocusable,
    selector: "dropdown-menu",
    removeScroll: true,
    ids: withDefaults.ids
  });
  return {
    ids,
    elements: {
      trigger,
      menu,
      item,
      arrow: arrow2,
      separator,
      group,
      groupLabel
    },
    states: {
      open: rootOpen
    },
    builders: {
      createCheckboxItem,
      createSubmenu,
      createMenuRadioGroup
    },
    options: rootOptions
  };
}
const defaults$2 = {
  positioning: {
    placement: "bottom"
  },
  arrowSize: 8,
  defaultOpen: false,
  disableFocusTrap: false,
  closeOnEscape: true,
  preventScroll: false,
  onOpenChange: void 0,
  closeOnOutsideClick: true,
  portal: void 0,
  forceVisible: false,
  openFocus: void 0,
  closeFocus: void 0
};
const { name: name$1 } = createElHelpers("popover");
const popoverIdParts = ["trigger", "content"];
function createPopover(args) {
  const withDefaults = { ...defaults$2, ...args };
  const options = toWritableStores(omit(withDefaults, "open", "ids"));
  const { positioning, arrowSize, disableFocusTrap, preventScroll, closeOnEscape, closeOnOutsideClick, portal, forceVisible, openFocus, closeFocus } = options;
  const openWritable = withDefaults.open ?? writable(withDefaults.defaultOpen);
  const open = overridable(openWritable, withDefaults?.onOpenChange);
  const activeTrigger = writable(null);
  const ids = toWritableStores({ ...generateIds(popoverIdParts), ...withDefaults.ids });
  function handleClose() {
    open.set(false);
    const triggerEl = document.getElementById(get_store_value(ids.trigger));
    handleFocus({ prop: get_store_value(closeFocus), defaultEl: triggerEl });
  }
  const isVisible = derivedVisible({ open, activeTrigger, forceVisible });
  const content = builder(name$1("content"), {
    stores: [isVisible, portal, ids.content],
    returned: ([$isVisible, $portal, $contentId]) => {
      return {
        hidden: $isVisible && isBrowser ? void 0 : true,
        tabindex: -1,
        style: styleToString$1({
          display: $isVisible ? void 0 : "none"
        }),
        id: $contentId,
        "data-state": $isVisible ? "open" : "closed",
        "data-portal": $portal ? "" : void 0
      };
    },
    action: (node) => {
      let unsubPopper = noop;
      const unsubDerived = effect([
        isVisible,
        activeTrigger,
        positioning,
        disableFocusTrap,
        closeOnEscape,
        closeOnOutsideClick,
        portal
      ], ([$isVisible, $activeTrigger, $positioning, $disableFocusTrap, $closeOnEscape, $closeOnOutsideClick, $portal]) => {
        unsubPopper();
        if (!$isVisible || !$activeTrigger)
          return;
        const popper = usePopper(node, {
          anchorElement: $activeTrigger,
          open,
          options: {
            floating: $positioning,
            focusTrap: $disableFocusTrap ? null : {
              returnFocusOnDeactivate: false
            },
            clickOutside: $closeOnOutsideClick ? void 0 : null,
            escapeKeydown: $closeOnEscape ? {
              handler: () => {
                handleClose();
              }
            } : null,
            portal: getPortalDestination(node, $portal)
          }
        });
        if (popper && popper.destroy) {
          unsubPopper = popper.destroy;
        }
      });
      return {
        destroy() {
          unsubDerived();
          unsubPopper();
        }
      };
    }
  });
  function toggleOpen(triggerEl) {
    open.update((prev) => {
      return !prev;
    });
    if (triggerEl) {
      activeTrigger.set(triggerEl);
    }
  }
  const trigger = builder(name$1("trigger"), {
    stores: [open, ids.content, ids.trigger],
    returned: ([$open, $contentId, $triggerId]) => {
      return {
        role: "button",
        "aria-haspopup": "dialog",
        "aria-expanded": $open,
        "data-state": $open ? "open" : "closed",
        "aria-controls": $contentId,
        id: $triggerId
      };
    },
    action: (node) => {
      const unsub = executeCallbacks(addMeltEventListener(node, "click", () => {
        toggleOpen(node);
      }), addMeltEventListener(node, "keydown", (e) => {
        if (e.key !== kbd.ENTER && e.key !== kbd.SPACE)
          return;
        e.preventDefault();
        toggleOpen(node);
      }));
      return {
        destroy: unsub
      };
    }
  });
  const arrow2 = builder(name$1("arrow"), {
    stores: arrowSize,
    returned: ($arrowSize) => ({
      "data-arrow": true,
      style: styleToString$1({
        position: "absolute",
        width: `var(--arrow-size, ${$arrowSize}px)`,
        height: `var(--arrow-size, ${$arrowSize}px)`
      })
    })
  });
  const close = builder(name$1("close"), {
    returned: () => ({
      type: "button"
    }),
    action: (node) => {
      const unsub = executeCallbacks(addMeltEventListener(node, "click", (e) => {
        if (e.defaultPrevented)
          return;
        handleClose();
      }), addMeltEventListener(node, "keydown", (e) => {
        if (e.defaultPrevented)
          return;
        if (e.key !== kbd.ENTER && e.key !== kbd.SPACE)
          return;
        e.preventDefault();
        toggleOpen();
      }));
      return {
        destroy: unsub
      };
    }
  });
  effect([open, activeTrigger, preventScroll], ([$open, $activeTrigger, $preventScroll]) => {
    if (!isBrowser)
      return;
    const unsubs = [];
    if ($open) {
      if (!$activeTrigger) {
        tick().then(() => {
          const triggerEl2 = document.getElementById(get_store_value(ids.trigger));
          if (!isHTMLElement(triggerEl2))
            return;
          activeTrigger.set(triggerEl2);
        });
      }
      if ($preventScroll) {
        unsubs.push(removeScroll());
      }
      const triggerEl = $activeTrigger ?? document.getElementById(get_store_value(ids.trigger));
      handleFocus({ prop: get_store_value(openFocus), defaultEl: triggerEl });
    }
    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  });
  return {
    ids,
    elements: {
      trigger,
      content,
      arrow: arrow2,
      close
    },
    states: {
      open
    },
    options
  };
}
const defaults$1 = {
  orientation: "vertical",
  loop: true,
  disabled: false,
  required: false,
  defaultValue: void 0
};
const { name, selector } = createElHelpers("radio-group");
function createRadioGroup(props) {
  const withDefaults = { ...defaults$1, ...props };
  const options = toWritableStores(omit(withDefaults, "value"));
  const { disabled, required, loop, orientation } = options;
  const valueWritable = withDefaults.value ?? writable(withDefaults.defaultValue);
  const value = overridable(valueWritable, withDefaults?.onValueChange);
  let hasActiveTabIndex = false;
  effect(value, ($value) => {
    if ($value === void 0) {
      hasActiveTabIndex = false;
    } else {
      hasActiveTabIndex = true;
    }
  });
  const selectItem = (item2) => {
    const disabled2 = item2.dataset.disabled === "true";
    const itemValue = item2.dataset.value;
    if (disabled2 || itemValue === void 0)
      return;
    value.set(itemValue);
  };
  const root = builder(name(), {
    stores: [required, orientation],
    returned: ([$required, $orientation]) => {
      return {
        role: "radiogroup",
        "aria-required": $required,
        "data-orientation": $orientation
      };
    }
  });
  const item = builder(name("item"), {
    stores: [value, orientation, disabled],
    returned: ([$value, $orientation, $disabled]) => {
      return (props2) => {
        const itemValue = typeof props2 === "string" ? props2 : props2.value;
        const argDisabled = typeof props2 === "string" ? false : !!props2.disabled;
        const disabled2 = $disabled || argDisabled;
        const checked = $value === itemValue;
        const tabindex = !hasActiveTabIndex ? 0 : checked ? 0 : -1;
        hasActiveTabIndex = true;
        return {
          disabled: disabled2,
          "data-value": itemValue,
          "data-orientation": $orientation,
          "data-disabled": disabledAttr(disabled2),
          "data-state": checked ? "checked" : "unchecked",
          "aria-checked": checked,
          type: "button",
          role: "radio",
          tabindex
        };
      };
    },
    action: (node) => {
      const unsub = executeCallbacks(addMeltEventListener(node, "click", () => {
        selectItem(node);
      }), addMeltEventListener(node, "keydown", (e) => {
        const el = e.currentTarget;
        if (!isHTMLElement(el))
          return;
        const root2 = el.closest(selector());
        if (!isHTMLElement(root2))
          return;
        const items = Array.from(root2.querySelectorAll(selector("item"))).filter((el2) => isHTMLElement(el2));
        const currentIndex = items.indexOf(el);
        const dir = getElemDirection(root2);
        const { nextKey, prevKey } = getDirectionalKeys(dir, get_store_value(orientation));
        const $loop = get_store_value(loop);
        let itemToFocus = null;
        if (e.key === nextKey) {
          e.preventDefault();
          const nextIndex = currentIndex + 1;
          if (nextIndex >= items.length && $loop) {
            itemToFocus = items[0];
          } else {
            itemToFocus = items[nextIndex];
          }
        } else if (e.key === prevKey) {
          e.preventDefault();
          const prevIndex = currentIndex - 1;
          if (prevIndex < 0 && $loop) {
            itemToFocus = items[items.length - 1];
          } else {
            itemToFocus = items[prevIndex];
          }
        } else if (e.key === kbd.HOME) {
          e.preventDefault();
          itemToFocus = items[0];
        } else if (e.key === kbd.END) {
          e.preventDefault();
          itemToFocus = items[items.length - 1];
        }
        if (itemToFocus) {
          itemToFocus.focus();
          selectItem(itemToFocus);
        }
      }));
      return {
        destroy: unsub
      };
    }
  });
  const hiddenInput = builder(name("hidden-input"), {
    stores: [disabled, value, required],
    returned: ([$disabled, $value, $required]) => {
      return {
        ...hiddenInputAttrs,
        disabled: disabledAttr($disabled),
        value: $value,
        required: $required
      };
    },
    action: (_node) => {
    }
  });
  const isChecked = derived(value, ($value) => {
    return (itemValue) => {
      return $value === itemValue;
    };
  });
  return {
    elements: {
      root,
      item,
      hiddenInput
    },
    states: {
      value
    },
    helpers: {
      isChecked
    },
    options
  };
}
const defaults = {
  orientation: "horizontal",
  decorative: false
};
const createSeparator = (props) => {
  const withDefaults = { ...defaults, ...props };
  const options = toWritableStores(withDefaults);
  const { orientation, decorative } = options;
  const root = builder("separator", {
    stores: [orientation, decorative],
    returned: ([$orientation, $decorative]) => {
      const ariaOrientation = $orientation === "vertical" ? $orientation : void 0;
      return {
        role: $decorative ? "none" : "separator",
        "aria-orientation": ariaOrientation,
        "aria-hidden": $decorative,
        "data-orientation": $orientation
      };
    }
  });
  return {
    elements: {
      root
    },
    options
  };
};
function createBitAttrs(bit, parts) {
  const attrs = {};
  parts.forEach((part) => {
    attrs[part] = {
      [`data-bits-${bit}-${part}`]: ""
    };
  });
  return (part) => attrs[part];
}
function disabledAttrs(disabled) {
  return disabled ? { "aria-disabled": true, "data-disabled": "" } : {};
}
function generateId() {
  return nanoid(10);
}
function removeUndefined(obj) {
  const result = {};
  for (const key in obj) {
    const value = obj[key];
    if (value !== void 0) {
      result[key] = value;
    }
  }
  return result;
}
function styleToString(style) {
  return Object.keys(style).reduce((str, key) => {
    if (style[key] === void 0)
      return str;
    return str + `${key}:${style[key]};`;
  }, "");
}
styleToString({
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  borderWidth: "0"
});
styleToString({
  position: "absolute",
  width: "25px",
  height: "25px",
  opacity: "0",
  margin: "0px",
  pointerEvents: "none",
  transform: "translateX(-100%)"
});
function getOptionUpdater(options) {
  return function(key, value) {
    if (value === void 0)
      return;
    const store = options[key];
    if (store) {
      store.set(value);
    }
  };
}
const NAME$l = "accordion";
const ITEM_NAME$1 = "accordion-item";
const PARTS$l = ["root", "content", "header", "item", "trigger"];
const getAttrs$5 = createBitAttrs(NAME$l, PARTS$l);
function setCtx$4(props) {
  const accordion = createAccordion(removeUndefined(props));
  setContext(NAME$l, accordion);
  return {
    ...accordion,
    updateOption: getOptionUpdater(accordion.options)
  };
}
function getCtx$3() {
  return getContext(NAME$l);
}
function setItem(props) {
  setContext(ITEM_NAME$1, { ...props });
  const { elements: { item } } = getCtx$3();
  return { item, props };
}
function getItemProps() {
  const itemProps = getContext(ITEM_NAME$1);
  return itemProps;
}
function getContent$1() {
  const { elements: { content }, helpers: { isSelected }, states: { value } } = getCtx$3();
  const { value: props } = getItemProps();
  return { content, props, isSelected, value };
}
function getTrigger() {
  const { elements: { trigger } } = getCtx$3();
  const { value: props } = getItemProps();
  return { props, trigger };
}
const NAME$k = "alert-dialog";
const PARTS$k = [
  "action",
  "cancel",
  "content",
  "description",
  "overlay",
  "portal",
  "title",
  "trigger"
];
createBitAttrs(NAME$k, PARTS$k);
const NAME$j = "avatar";
const PARTS$j = ["root", "image", "fallback"];
createBitAttrs(NAME$j, PARTS$j);
const NAME$i = "checkbox";
const PARTS$i = ["root", "input", "indicator"];
createBitAttrs(NAME$i, PARTS$i);
const NAME$h = "collapsible";
const PARTS$h = ["root", "content", "trigger"];
createBitAttrs(NAME$h, PARTS$h);
const NAME$g = "context-menu";
const PARTS$g = [
  "arrow",
  "checkbox-indicator",
  "checkbox-item",
  "content",
  "group",
  "item",
  "label",
  "radio-group",
  "radio-item",
  "separator",
  "sub-content",
  "sub-trigger",
  "trigger"
];
createBitAttrs(NAME$g, PARTS$g);
const NAME$f = "dialog";
const PARTS$f = ["close", "content", "description", "overlay", "portal", "title", "trigger"];
createBitAttrs(NAME$f, PARTS$f);
const NAME$e = "dropdown-menu";
const GROUP_NAME = "dropdown-menu-group";
const PARTS$e = [
  "arrow",
  "checkbox-indicator",
  "checkbox-item",
  "content",
  "group",
  "item",
  "label",
  "radio-group",
  "radio-item",
  "separator",
  "sub-content",
  "sub-trigger",
  "trigger"
];
const getAttrs$4 = createBitAttrs(NAME$e, PARTS$e);
function getCtx$2() {
  return getContext(NAME$e);
}
function setCtx$3(props) {
  const dropdownMenu = createDropdownMenu({ ...removeUndefined(props), forceVisible: true });
  setContext(NAME$e, dropdownMenu);
  return {
    ...dropdownMenu,
    updateOption: getOptionUpdater(dropdownMenu.options)
  };
}
function getContent(sideoffset = 5) {
  const menu = getCtx$2();
  menu.options.positioning.update((prev) => ({ ...prev, gutter: sideoffset }));
  return menu;
}
function setGroupCtx() {
  const { elements: { group } } = getCtx$2();
  const id = generateId();
  setContext(GROUP_NAME, id);
  return { group, id };
}
const NAME$d = "link-preview";
const PARTS$d = ["arrow", "content", "trigger"];
createBitAttrs(NAME$d, PARTS$d);
const NAME$c = "label";
const PARTS$c = ["root"];
const getAttrs$3 = createBitAttrs(NAME$c, PARTS$c);
const NAME$b = "menubar";
const PARTS$b = [
  "root",
  "arrow",
  "checkbox-indicator",
  "checkbox-item",
  "content",
  "group",
  "item",
  "label",
  "radio-group",
  "radio-item",
  "separator",
  "sub-content",
  "sub-trigger",
  "trigger"
];
createBitAttrs(NAME$b, PARTS$b);
const NAME$a = "popover";
const PARTS$a = ["arrow", "close", "content", "trigger"];
const getAttrs$2 = createBitAttrs(NAME$a, PARTS$a);
function setCtx$2(props) {
  const popover = createPopover({
    ...removeUndefined(props),
    forceVisible: true
  });
  setContext(NAME$a, popover);
  return {
    ...popover,
    updateOption: getOptionUpdater(popover.options)
  };
}
function getCtx$1() {
  return getContext(NAME$a);
}
const NAME$9 = "progress";
const PARTS$9 = ["root"];
createBitAttrs(NAME$9, PARTS$9);
const NAME$8 = "radio-group";
const ITEM_NAME = "radio-group-item";
const PARTS$8 = ["root", "item", "input"];
const getAttrs$1 = createBitAttrs(NAME$8, PARTS$8);
function setCtx$1(props) {
  const radioGroup = createRadioGroup(removeUndefined(props));
  setContext(NAME$8, radioGroup);
  return {
    ...radioGroup,
    updateOption: getOptionUpdater(radioGroup.options)
  };
}
function getCtx() {
  return getContext(NAME$8);
}
function setItemCtx(value) {
  const radioGroup = getCtx();
  setContext(ITEM_NAME, { value, isChecked: radioGroup.helpers.isChecked });
  return radioGroup;
}
function getRadioIndicator() {
  return getContext(ITEM_NAME);
}
const NAME$7 = "select";
const PARTS$7 = ["arrow", "content", "group", "item", "input", "label", "trigger", "value"];
createBitAttrs(NAME$7, PARTS$7);
const NAME$6 = "separator";
const PARTS$6 = ["root"];
const getAttrs = createBitAttrs(NAME$6, PARTS$6);
function setCtx(props) {
  const separator = createSeparator(removeUndefined(props));
  return {
    ...separator,
    updateOption: getOptionUpdater(separator.options)
  };
}
const NAME$5 = "slider";
const PARTS$5 = ["root", "input", "range", "thumb", "tick"];
createBitAttrs(NAME$5, PARTS$5);
const NAME$4 = "switch";
const PARTS$4 = ["root", "input", "thumb"];
createBitAttrs(NAME$4, PARTS$4);
const NAME$3 = "tabs";
const PARTS$3 = ["root", "content", "list", "trigger"];
createBitAttrs(NAME$3, PARTS$3);
const NAME$2 = "toggle";
const PARTS$2 = ["root", "input"];
createBitAttrs(NAME$2, PARTS$2);
const NAME$1 = "toggle-group";
const PARTS$1 = ["root", "item"];
createBitAttrs(NAME$1, PARTS$1);
const NAME = "tooltip";
const PARTS = ["arrow", "content", "trigger"];
createBitAttrs(NAME, PARTS);
function cubicOut(t) {
  const f = t - 1;
  return f * f * f + 1;
}
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
const flyAndScale = (node, params = { y: -8, x: 0, start: 0.95, duration: 150 }) => {
  const style = getComputedStyle(node);
  const transform = style.transform === "none" ? "" : style.transform;
  const scaleConversion = (valueA, scaleA, scaleB) => {
    const [minA, maxA] = scaleA;
    const [minB, maxB] = scaleB;
    const percentage = (valueA - minA) / (maxA - minA);
    const valueB = percentage * (maxB - minB) + minB;
    return valueB;
  };
  const styleToString2 = (style2) => {
    return Object.keys(style2).reduce((str, key) => {
      if (style2[key] === void 0)
        return str;
      return str + `${key}:${style2[key]};`;
    }, "");
  };
  return {
    duration: params.duration ?? 200,
    delay: 0,
    css: (t) => {
      const y = scaleConversion(t, [0, 1], [params.y ?? 5, 0]);
      const x = scaleConversion(t, [0, 1], [params.x ?? 0, 0]);
      const scale = scaleConversion(t, [0, 1], [params.start ?? 0.95, 1]);
      return styleToString2({
        transform: `${transform} translate3d(${x}px, ${y}px, 0) scale(${scale})`,
        opacity: t
      });
    },
    easing: cubicOut
  };
};
const defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": 2,
  "stroke-linecap": "round",
  "stroke-linejoin": "round"
};
const Icon = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["name", "color", "size", "strokeWidth", "absoluteStrokeWidth", "iconNode"]);
  let { name: name2 } = $$props;
  let { color = "currentColor" } = $$props;
  let { size: size2 = 24 } = $$props;
  let { strokeWidth = 2 } = $$props;
  let { absoluteStrokeWidth = false } = $$props;
  let { iconNode } = $$props;
  if ($$props.name === void 0 && $$bindings.name && name2 !== void 0)
    $$bindings.name(name2);
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.size === void 0 && $$bindings.size && size2 !== void 0)
    $$bindings.size(size2);
  if ($$props.strokeWidth === void 0 && $$bindings.strokeWidth && strokeWidth !== void 0)
    $$bindings.strokeWidth(strokeWidth);
  if ($$props.absoluteStrokeWidth === void 0 && $$bindings.absoluteStrokeWidth && absoluteStrokeWidth !== void 0)
    $$bindings.absoluteStrokeWidth(absoluteStrokeWidth);
  if ($$props.iconNode === void 0 && $$bindings.iconNode && iconNode !== void 0)
    $$bindings.iconNode(iconNode);
  return `<svg${spread(
    [
      escape_object(defaultAttributes),
      escape_object($$restProps),
      { width: escape_attribute_value(size2) },
      { height: escape_attribute_value(size2) },
      { stroke: escape_attribute_value(color) },
      {
        "stroke-width": escape_attribute_value(absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size2) : strokeWidth)
      },
      {
        class: escape_attribute_value(`lucide-icon lucide lucide-${name2} ${$$props.class ?? ""}`)
      }
    ],
    {}
  )}>${each(iconNode, ([tag, attrs]) => {
    return `${((tag$1) => {
      return tag$1 ? `<${tag}${spread([escape_object(attrs)], {})}>${is_void(tag$1) ? "" : ``}${is_void(tag$1) ? "" : `</${tag$1}>`}` : "";
    })(tag)}`;
  })}${slots.default ? slots.default({}) : ``}</svg>`;
});
const Icon$1 = Icon;

export { getAttrs$2 as A, getAttrs$1 as B, addMeltEventListener as C, Icon$1 as I, getAttrs$4 as a, setGroupCtx as b, cn as c, disabledAttrs as d, getContent as e, flyAndScale as f, getCtx$2 as g, setCtx$4 as h, is_void as i, setItem as j, getCtx$3 as k, getTrigger as l, getContent$1 as m, getAttrs$5 as n, cubicOut as o, setCtx as p, getAttrs as q, setCtx$2 as r, setCtx$3 as s, getCtx$1 as t, setCtx$1 as u, getCtx as v, setItemCtx as w, getRadioIndicator as x, builder as y, getAttrs$3 as z };
//# sourceMappingURL=Icon-36e7f051.js.map
