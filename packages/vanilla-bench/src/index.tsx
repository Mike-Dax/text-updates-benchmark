import { bench } from 'bench'

const root = document.getElementById('root') as HTMLElement

const text = document.createTextNode('0')
root.appendChild(text)

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
