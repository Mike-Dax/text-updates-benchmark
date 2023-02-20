import { h, Component, render } from 'preact'
import { useState, useEffect } from 'preact/hooks'

import { options } from 'preact'

import { bench } from 'bench'

// Disable automatic setState batching
options.debounceRendering = f => f()

import { signal } from '@preact/signals'

// Create a signal that can be subscribed to:
const count = signal(0)

const Bench = () => {
  return <div>{count}</div>
}

export default Bench

async function run() {
  await new Promise(res => setTimeout(res, 500))

  // Benchmark the function
  let index = 0

  const results = await bench(`preact-signal-optimised`, () => {
    // no setup

    // iteration function
    return () => {
      count.value = index++
    }
  })

  return results
}

run()
