import { h, Component } from 'preact'
import { StateUpdater, useState, useEffect } from 'preact/hooks'

import { options } from 'preact'

import { bench } from 'bench'

// Disable automatic setState batching
options.debounceRendering = f => f()

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

const Bench = () => {
  const [state, setState] = useState(0)

  useEffect(() => {
    emitter.subscribe(setState)
  }, [setState])

  return <div>{state}</div>
}

export default Bench

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

// 100000 runs complete, diff 473ms, 4.7299999999999995µs per update
