import React, { useState, useEffect, ReactNode, ReactElement, useRef, useLayoutEffect } from 'react'
import { createRoot } from 'react-dom/client'

// Disable batched updates
import { flushSync } from 'react-dom'

import { bench } from 'bench'

import { proxy, subscribe } from 'valtio'

const state = proxy({ count: 0 })

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

    // When the component unmounts, remove the child first
    return () => {
      // Remove the current text span
      currentSpanRef.removeChild(textNode)
    }
  }, [spanRef, textRef])

  useEffect(() => {
    // Subscribe
    const unsubscribe = subscribe(state, () => {
      if (textRef.current) {
        textRef.current.nodeValue = String(state.count)
      }
    })

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
  const results = await bench(`react-valtio-ref`, () => {
    // no setup

    // iteration function
    return () => {
      flushSync(() => {
        state.count = index++
      })
    }
  })

  root.unmount()

  return results
}

// mean: 227.246ns (lb: 225.211ns ub: 229.623ns)
// stddev: 8.973ns (lb: 5.510ns ub: 12.478ns)
// median: 225.912ns (lb: 222.936ns ub: 227.672ns)
// mad: 4.823ns (lb: 3.252ns ub: 5.994ns)
// r2: 0.9936 (lb: 0.9936 ub: 0.9936)
