import React, { useState, useEffect, ReactNode, ReactElement, useRef, useLayoutEffect } from 'react'
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
    // Subscribe
    const unsubscribe = useStore.subscribe(state => {
      if (textRef.current) {
        textRef.current.nodeValue = String(state.count)
      }
    })

    console.log(`setup the subscription`)

    return () => {
      // Unsubscribe
      unsubscribe()
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
  const results = await bench(`react-zustand-ref`, () => {
    // no setup

    // iteration function
    return () => {
      flushSync(() => useStore.setState({ count: index++ }))
    }
  })

  root.unmount()

  return results
}

// mean: 258.213ns (lb: 254.878ns ub: 261.340ns)
// stddev: 9.340ns (lb: 6.984ns ub: 11.945ns)
// median: 260.004ns (lb: 251.442ns ub: 264.558ns))
// mad: 8.210ns (lb: 1.641ns ub: 10.537ns)
// r2: 0.9988 (lb: 0.9988 ub: 0.9988)
