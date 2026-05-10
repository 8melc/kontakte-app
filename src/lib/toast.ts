type Listener = (msg: string) => void | (() => void);

let listeners: Listener[] = [];

export function onToast(fn: Listener) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter(l => l !== fn);
  };
}

export function toast(msg: string) {
  listeners.forEach(l => l(msg));
}
