import React, { useState, useEffect, ReactNode, ReactElement } from 'react'
import { createRoot } from 'react-dom/client'

// Disable batched updates
import { flushSync } from 'react-dom'

import { bench } from 'bench'

import { create } from 'zustand'

interface State {
  count: number
}

const useStore = create<State>(set => ({
  count: 0,
}))

const Updating = () => {
  const state = useStore()

  return <div>{state.count}</div>
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
  const results = await bench(`react-zustand-hook`, () => {
    // no setup

    // iteration function
    return () => {
      flushSync(() => useStore.setState({ count: index++ }))
    }
  })

  root.unmount()

  return results
}

// mean: 6.773µs (lb: 6.602µs ub: 6.986µs)
// stddev: 441.977ns (lb: 202.413ns ub: 627.129ns)
// median: 6.587µs (lb: 6.497µs ub: 6.772µs)
// mad: 132.878ns (lb: 52.312ns ub: 309.597ns)
// r2: 0.9888 (lb: 0.9888 ub: 0.9888)
