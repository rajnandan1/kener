import { k as createEventDispatcher } from './ssr-7290eec0.js';

function createDispatcher() {
  const dispatch = createEventDispatcher();
  return (e) => {
    const { originalEvent } = e.detail;
    const { cancelable } = e;
    const type = originalEvent.type;
    const shouldContinue = dispatch(type, { originalEvent, currentTarget: originalEvent.currentTarget }, { cancelable });
    if (!shouldContinue) {
      e.preventDefault();
    }
  };
}

export { createDispatcher as c };
//# sourceMappingURL=events-5cf2eb43.js.map
