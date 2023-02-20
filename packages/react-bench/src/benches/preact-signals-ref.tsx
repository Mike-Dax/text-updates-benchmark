import React, { useState, useEffect, ReactNode, ReactElement, useRef, useLayoutEffect } from 'react'
import { createRoot } from 'react-dom/client'

// Disable batched updates
import { flushSync } from 'react-dom'

import { bench } from 'bench'

import { signal, effect } from '@preact/signals-core'

const counter = signal(0)

const Updating = () => {
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

    console.log(`setup the span?`)

    // When the component unmounts, remove the child first
    return () => {
      // Remove the current text span
      currentSpanRef.removeChild(textNode)
    }
  }, [spanRef, textRef])

  useEffect(() => {
    const unsub = effect(() => {
      if (textRef.current) {
        textRef.current.nodeValue = String(counter.value)
      }
    })

    return () => {
      unsub()
    }
  }, [textRef])

  return <span ref={spanRef} />
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
  const results = await bench(`react-preact-signals-ref`, () => {
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

// mean: 215.593ns (lb: 214.814ns ub: 216.533ns)
// stddev: 2.961ns (lb: 1.562ns ub: 4.111ns)
// median: 214.679ns (lb: 214.367ns ub: 215.073ns)
// mad: 849.085ps (lb: 1.022ns ub: 959.876ps)
// r2: 0.9999 (lb: 0.9999 ub: 0.9999)
