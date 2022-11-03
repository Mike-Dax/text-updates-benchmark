import { h, Component } from "preact";
import { StateUpdater, useState, useEffect } from "preact/hooks";

import { options } from "preact";

// Disable automatic setState batching
options.debounceRendering = (f) => f();

class BareEmitter<T> {
  private subscriber: (value: T) => void = () => {};

  public emit = (value: T) => {
    this.subscriber(value);
  };

  public subscribe = (subscriber: (value: T) => void) => {
    this.subscriber = subscriber;
  };
}

const emitter = new BareEmitter<number>();

const Bench = () => {
  const [state, setState] = useState(0);

  useEffect(() => {
    emitter.subscribe(setState);
  }, [setState]);

  return <div>{state}</div>;
};

// class Bench extends Component<{}, {value: number}> {
//   constructor() {
//     super();
//     this.state = { value: 0 };
//   }

//   // Lifecycle: Called whenever our component is created
//   componentDidMount() {
//     emitter.subscribe((value: number) => {
//       this.setState({ value });
//       this.forceUpdate()
//     })
//   }

//   render() {
//     return <span>{this.state.value}</span>;
//   }
// }

export default Bench;

const RUNS = 100_000;

async function main() {
  // Wait for the app to render
  await new Promise((resolve) => setTimeout(resolve, 500));

  const start = Date.now();

  for (let index = 0; index < RUNS; index++) {
    emitter.emit(index);
  }

  const end = Date.now();

  console.log(
    `${RUNS} runs complete, diff ${end - start}ms, ${
      ((end - start) / RUNS) * 1000
    }µs per update`
  );
}

main();
