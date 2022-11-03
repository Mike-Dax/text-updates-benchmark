import { h, Component } from "preact";
import { useState, useEffect } from "preact/hooks";

import { options } from "preact";

// Disable automatic setState batching
options.debounceRendering = (f) => f();

import { signal } from "@preact/signals";

// Create a signal that can be subscribed to:
const count = signal(0);

const Bench = () => {
  return <div>{count}</div>;
};

export default Bench;

const RUNS = 100_000;

async function main() {
  // Wait for the app to render
  await new Promise((resolve) => setTimeout(resolve, 500));

  const start = Date.now();

  for (let index = 0; index < RUNS; index++) {
    count.value = index;
  }

  const end = Date.now();

  console.log(
    `${RUNS} runs complete, diff ${end - start}ms, ${
      ((end - start) / RUNS) * 1000
    }µs per update`
  );
}

main();
