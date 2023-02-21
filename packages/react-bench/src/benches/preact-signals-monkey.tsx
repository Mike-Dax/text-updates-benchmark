import React, { useState, useEffect, ReactNode, ReactElement } from 'react'
import { createRoot } from 'react-dom/client'

// Disable batched updates
import { flushSync } from 'react-dom'

import { bench } from 'bench'

import { signal } from '@preact/signals-react'

const counter = signal(0)

const Updating = () => {
  return <div>{counter.value}</div>
}

const Bench = () => {
  return (
    <>
      <Updating />
    </>
  )
}

export async function run(domNode: HTMLElement) {
  const root = createRoot(domNode)

  root.render(<Bench />)

  // Wait for the app to render
  await new Promise(resolve => setTimeout(resolve, 500))

  // Benchmark the function
  let index = 0
  const results = await bench(`react-preact-signals-monkey`, () => {
    // no setup

    // iteration function
    return () => {
      flushSync(() => {
        counter.value = index++
      })
    }
  })

  root.unmount()

  return results
}

// mean: 2.437µs (lb: 2.386µs ub: 2.501µs)
// stddev: 387.469ns (lb: 173.997ns ub: 549.353ns)
// median: 2.360µs (lb: 2.350µs ub: 2.365µs)
// mad: 32.277ns (lb: 24.233ns ub: 40.052ns)
// r2: 0.9607 (lb: 0.9607 ub: 0.9607)
