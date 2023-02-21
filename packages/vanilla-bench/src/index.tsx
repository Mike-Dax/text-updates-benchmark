import { bench } from 'bench'

const root = document.getElementById('root') as HTMLElement

const span = document.createElement('span')
const text = document.createTextNode('0')
root.appendChild(span)
span.appendChild(text)

async function main() {
  // Wait for the app to render
  await new Promise(resolve => setTimeout(resolve, 5000))

  console.log(`starting bench`)

  // Benchmark the function
  let index = 0
  bench(`vanilla-nodeValue`, () => {
    // no setup

    // iteration function
    return () => {
      text.nodeValue = String(index++)
    }
  })
}

main()

// mean: 183.910ns (lb: 183.297ns ub: 184.716ns)
// stddev: 2.704ns (lb: 1.072ns ub: 884.738ps)
// median: 183.162ns (lb: 182.881ns ub: 183.555ns)
// mad: 494.420ps (lb: 300.780ps ub: 892.095ps)
// r2: 0.9999 (lb: 0.9999 ub: 0.9999)
