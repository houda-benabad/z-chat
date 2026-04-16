export interface DialogButton {
  text: string;
  style?: 'cancel' | 'destructive' | 'default';
  onPress?: () => void;
}

export interface DialogConfig {
  title: string;
  message?: string;
  buttons: DialogButton[];
}

type Listener = (config: DialogConfig | null) => void;

let listener: Listener | null = null;
const queue: DialogConfig[] = [];
let showing = false;

function showNext() {
  if (queue.length === 0) {
    showing = false;
    listener?.(null);
    return;
  }
  showing = true;
  listener?.(queue.shift()!);
}

export const dialogManager = {
  subscribe(fn: Listener) {
    listener = fn;
    return () => { listener = null; };
  },
  show(config: DialogConfig) {
    queue.push(config);
    if (!showing) showNext();
  },
  dismiss() {
    showNext();
  },
};
