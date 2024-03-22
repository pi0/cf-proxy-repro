import { getPlatformProxy } from "wrangler"

const proxy = await getPlatformProxy({})
const { BLOB: bucket } = proxy.env

console.log('Fetching cat image...')
const imgReadableStream = await fetch('https://images.unsplash.com/photo-1579168765467-3b235f938439?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&dl=yoo-hoo-E3LcqpQxtTU-unsplash.jpg').then(r => r.body)

console.log('Converting image to buffer...')
const buff = await readableStreamToBuff(imgReadableStream)
console.log('Buffer length (response):', buff.length)

console.log('Putting cats to the bucket...')
await bucket.put('cat1.jpg', buff.buffer)
await bucket.put('cat2.jpg', buff.buffer)

console.log('Fetching image from bucket...')

console.log('Converting bucket image to buffer...')
const [cat1, cat2] = await Promise.all([
  bucket.get('cat1.jpg').then(obj => readableStreamToBuff(obj.body)),
  bucket.get('cat2.jpg').then(obj => readableStreamToBuff(obj.body)),
])

console.log('Buffer length (bucket):', [cat1.length, cat2.length])

await proxy.dispose()

async function readableStreamToBuff(stream) {
  console.log('reading stream to buffer... ')
  const chunks = [];
  await stream.pipeTo(
    new WritableStream({
      write(chunk) {
        process.stdout.write(` +${chunk.length}`)
        chunks.push(chunk);
      },
      close() {
        console.log('stream close')
      }
    }),
  )
  console.log('stream read!')
  return Buffer.concat(chunks);
}
