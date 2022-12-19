import { h, Component } from 'preact'
import { useState, useEffect } from 'preact/hooks'

import { options } from 'preact'

import { bench } from 'bench'

// Disable automatic setState batching
options.debounceRendering = f => f()

import { signal } from '@preact/signals'

// Create a signal that can be subscribed to:
const count = signal(0)

const Bench = () => {
  return <div>{count.value}</div>
}

export default Bench

const RUNS = 100_000

async function main() {
  // Wait for the app to render
  await new Promise(resolve => setTimeout(resolve, 500))

  // Benchmark the function
  let index = 0
  bench(`preact-signal-optimised`, () => {
    // no setup

    // iteration function
    return () => {
      count.value = index
    }
  })
}

main()

// 100000 runs complete, diff 528ms, 5.28µs per update
