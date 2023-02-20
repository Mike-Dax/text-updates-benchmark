import React, { useState, useEffect, ReactNode, ReactElement } from 'react'
import { createRoot } from 'react-dom/client'

// Disable batched updates
import { flushSync } from 'react-dom'

import { bench } from 'bench'

import { proxy, useSnapshot } from 'valtio'

const state = proxy({ count: 0 })

const Updating = () => {
  const snap = useSnapshot(state)

  return <div>{snap.count}</div>
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
  const results = await bench(`react-valtio-snapshot`, () => {
    // no setup

    // iteration function
    return () => {
      flushSync(() => {
        state.count = index++
      })
    }
  })

  root.unmount()

  return results
}

// mean: 228.933ns (lb: 225.780ns ub: 232.548ns)
// stddev: 12.095ns (lb: 7.474ns ub: 15.589ns)
// median: 224.903ns (lb: 223.032ns ub: 228.465ns)
// mad: 4.465ns (lb: 2.716ns ub: 6.300ns)
// r2: 0.9907 (lb: 0.9907 ub: 0.9907)
