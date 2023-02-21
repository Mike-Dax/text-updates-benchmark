import React, { useState, useEffect, ReactNode, ReactElement, useRef, useLayoutEffect } from 'react'
import { createRoot } from 'react-dom/client'

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

const Updating = (props: { emitter: BareEmitter<number> }) => {
  const spanRef = useRef<HTMLSpanElement>(null)
  const textRef = useRef<Text | null>(null)

  // Create a bespoke text node and attach it inside the span ref
  useLayoutEffect(() => {
    const textNode = document.createTextNode(' ') // Start with a single space

    // The spanRef will have been created by now
    const currentSpanRef = spanRef.current!

    // Append the textNode to the span.
    currentSpanRef.appendChild(textNode)

    // Update our ref of the textNode
    textRef.current = textNode

    // When the component unmounts, remove the child first
    return () => {
      // Remove the current text span
      currentSpanRef.removeChild(textNode)
    }
  }, [props.emitter, spanRef, textRef])

  useEffect(() => {
    // Subscribe to our emitter
    props.emitter.subscribe(value => {
      // On new data, update the ref
      if (textRef.current) {
        textRef.current.nodeValue = String(value)
      }
    })
  }, [props.emitter, textRef])

  return <span ref={spanRef} />
}

const Bench = () => {
  return (
    <>
      <Updating emitter={emitter} />
    </>
  )
}

export async function run(domNode: HTMLElement) {
  const root = createRoot(domNode)

  root.render(<Bench />)

  // Wait for the app to render
  await new Promise(resolve => setTimeout(resolve, 500))

  let index = 0

  // Benchmark the function
  const results = await bench(`react-bare-emitter`, () => {
    // no setup

    // iteration function
    return () => {
      flushSync(() => {
        emitter.emit(index++)
      })
    }
  })

  root.unmount()

  return results
}

// mean: 639.437ns (lb: 621.538ns ub: 659.884ns)
// stddev: 28.037ns (lb: 9.129ns ub: 35.275ns)
// median: 629.957ns (lb: 619.503ns ub: 676.793ns)
// mad: 12.083ns (lb: 4.181ns ub: 165.156ps)
// r2: 0.9915 (lb: 0.9915 ub: 0.9915)
