import { j as createEventDispatcher } from './ssr-f056b9d4.js';

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
//# sourceMappingURL=events-3e3c01b3.js.map
