import { h, Component, render } from 'preact'

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

export async function run(domNode: HTMLElement) {
  // Render into the dom element
  render(<Bench />, domNode)

  // Benchmark the function
  let index = 0

  const results = await bench(`preact-functional-component`, () => {
    // no setup

    // iteration function
    return () => {
      emitter.emit(index++)
    }
  })

  // Unmount from the dom element
  render(null, domNode)

  return results
}
