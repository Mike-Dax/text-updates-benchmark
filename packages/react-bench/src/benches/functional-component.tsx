import React, { useState, useEffect, ReactNode, ReactElement } from 'react'

// Disable batched updates
import { flushSync } from 'react-dom'

import { bench } from 'bench'

class BareEmitter<T> {
  private subscriber: (value: T) => void = () => {}

  public emit = (value: T) => {
    this.subscriber(value)
  }

  public subscribe = (subscriber: (value: T) => void) => {
    this.subscriber = subscriber
  }
}

const emitter = new BareEmitter<number>()

const Updating = () => {
  const [state, setState] = useState(0)

  useEffect(() => {
    emitter.subscribe(value => flushSync(() => setState(value)))
  }, [setState])

  return <div>{state}</div>
}

export const Bench = () => {
  return (
    <>
      <Updating />
    </>
  )
}

const RUNS = 100_000

async function main() {
  // Wait for the app to render
  await new Promise(resolve => setTimeout(resolve, 500))

  // Benchmark the function
  let index = 0
  bench(`react-functional-component`, () => {
    // no setup

    // iteration function
    return () => {
      emitter.emit(index++)
    }
  })
}

main()

// 100000 runs complete, diff 2542ms, 25.42µs per update
