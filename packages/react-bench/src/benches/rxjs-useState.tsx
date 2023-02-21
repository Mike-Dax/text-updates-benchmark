import React, { useState, useEffect, ReactNode, ReactElement } from 'react'
import { createRoot } from 'react-dom/client'

// Disable batched updates
import { flushSync } from 'react-dom'

import { bench } from 'bench'

import { Subject } from 'rxjs'

const observable = new Subject<number>()

const Updating = () => {
  const [state, setState] = useState(0)

  useEffect(() => {
    const sub = observable.subscribe(value => {
      setState(value)
    })

    return () => {
      // Unsubscribe from our observable
      sub.unsubscribe()
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
  const results = await bench(`react-rxjs-usestate`, () => {
    // no setup

    // iteration function
    return () => {
      flushSync(() => {
        observable.next(index++)
      })
    }
  })

  root.unmount()

  return results
}

// mean: 6.615µs (lb: 6.548µs ub: 6.702µs)
// stddev: 295.062ns (lb: 98.721ns ub: 442.379ns)
// median: 6.557µs (lb: 6.530µs ub: 6.579µs)
// mad: 49.736ns (lb: 34.639ns ub: 73.113ns)
// r2: 0.9985 (lb: 0.9985 ub: 0.9985)
