/* @refresh reload */
import { render } from 'solid-js/web'

import { bench } from 'bench'

import { createSignal } from 'solid-js'

const [count, setCount] = createSignal(0)

const Updating = () => {
  return <div>{count()}</div>
}

const Bench = () => {
  return (
    <>
      <Updating />
    </>
  )
}

async function run(domNode: HTMLElement) {
  render(() => <Bench />, domNode)

  // Wait for the app to render
  await new Promise(resolve => setTimeout(resolve, 500))

  // Benchmark the function
  let index = 0
  const results = await bench(`solidjs`, () => {
    // no setup

    // iteration function
    return () => {
      setCount(index++)
    }
  })

  return results
}

// mean: 2.437µs (lb: 2.386µs ub: 2.501µs)
// stddev: 387.469ns (lb: 173.997ns ub: 549.353ns)
// median: 2.360µs (lb: 2.350µs ub: 2.365µs)
// mad: 32.277ns (lb: 24.233ns ub: 40.052ns)
// r2: 0.9607 (lb: 0.9607 ub: 0.9607)

async function main() {
  const element = document.getElementById('root') as HTMLElement

  console.log(`starting benchmarks`)

  console.log(`results: `, await run(element))
}

main()
