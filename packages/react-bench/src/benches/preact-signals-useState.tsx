import React, { useState, useEffect, ReactNode, ReactElement } from 'react'
import { createRoot } from 'react-dom/client'

// Disable batched updates
import { flushSync } from 'react-dom'

import { bench } from 'bench'

import { signal, effect } from '@preact/signals-core'

const counter = signal(0)

const Updating = () => {
  const [state, setState] = useState(0)

  useEffect(() => {
    const unsub = effect(() => flushSync(() => setState(counter.value)))
    return () => {
      unsub()
    }
  }, [setState])

  return <div>{state}</div>
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
  const results = await bench(`react-preact-signals-usestate`, () => {
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

// mean: 5.697µs (lb: 5.641µs ub: 5.764µs)
// stddev: 154.230ns (lb: 70.271ns ub: 207.387ns)
// median: 5.629µs (lb: 5.600µs ub: 5.744µs)
// mad: 56.748ns (lb: 19.475ns ub: 124.711ns)
// r2: 0.9989 (lb: 0.9989 ub: 0.9989)
