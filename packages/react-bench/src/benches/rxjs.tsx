import React, { useState, useEffect, ReactNode, ReactElement, useRef, useLayoutEffect } from 'react'
import { createRoot } from 'react-dom/client'

// Disable batched updates
import { flushSync } from 'react-dom'

import { bench } from 'bench'

import { Subject, Observable } from 'rxjs'

const Updating = (props: { observable: Observable<number> }) => {
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
  }, [props.observable, spanRef, textRef])

  useEffect(() => {
    // Subscribe to our observable
    const sub = props.observable.subscribe(value => {
      // On new data, update the ref
      if (textRef.current) {
        textRef.current.nodeValue = String(value)
      }
    })

    return () => {
      // Unsubscribe from our observable
      sub.unsubscribe()
    }
  }, [props.observable, textRef])

  return <span ref={spanRef} />
}

const observable = new Subject<number>()

const Bench = () => {
  return (
    <>
      <Updating observable={observable} />
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
  const results = await bench(`react-rxjs`, () => {
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

// mean: 696.693ns (lb: 675.635ns ub: 723.877ns)
// stddev: 35.938ns (lb: 7.135ns ub: 48.276ns)
// median: 682.051ns (lb: 675.257ns ub: 733.596ns)
// mad: 3.886ns (lb: 1.070ns ub: 89.624ps)
// r2: 0.9983 (lb: 0.9983 ub: 0.9983)
