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
  return <div>{count.value}</div>
}

export async function run(domNode: HTMLElement) {
  // Render into the dom element
  render(<Bench />, domNode)

  // Benchmark the function
  let index = 0

  const results = await bench(`preact-signal-unoptimised`, () => {
    // no setup

    // iteration function
    return () => {
      count.value = index++
    }
  })

  // Unmount from the dom element
  render(null, domNode)

  return results
}
